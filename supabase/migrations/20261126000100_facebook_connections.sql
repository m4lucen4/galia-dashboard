-- Facebook Pages connection (T1 of odd/tasks/facebook-page-publishing.md).
--
-- Facebook Pages live in their own social_connections row with network = 'facebook' (one per user,
-- same Meta account id as the Instagram row). This widens the network list for connections only:
--   * social_connections.network check constraint
--   * social_connection_store      (validates p_network)
--   * social_connection_disconnect (validates p_network)
-- Latest definition of both: 20261118000300_social_connections.sql (no later migration redefines
-- them). The rest of the social_connection_* functions do not validate the network list.
-- Effective expiry for facebook follows the instagram rule (data access expiry, else user token expiry).
-- publication_targets and the publishing RPCs are NOT touched here (T2).
begin;
set local lock_timeout = '5s';

-- Inline column check created by the original DDL: <table>_<column>_check.
alter table public.social_connections drop constraint social_connections_network_check;
alter table public.social_connections add constraint social_connections_network_check
  check (network in ('instagram', 'linkedin', 'facebook'));

-- A (re)connection after OAuth: replaces every credential and resets health and notices.
create or replace function public.social_connection_store(
  p_user uuid, p_network text, p_account_id text, p_account_name text, p_scopes text[],
  p_access_expires_at timestamptz, p_refresh_expires_at timestamptz, p_data_access_expires_at timestamptz,
  p_credentials jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_user is null or p_network is null or p_network not in ('instagram', 'linkedin', 'facebook')
    or p_account_id is null or p_account_id !~ '^[A-Za-z0-9:_.-]{1,100}$'
    or (p_account_name is not null and char_length(p_account_name) > 200)
    or (p_scopes is not null and cardinality(p_scopes) > 50)
    or p_credentials is null or jsonb_typeof(p_credentials) <> 'array' or jsonb_array_length(p_credentials) = 0
  then raise exception 'invalid_request'; end if;
  if not exists (select 1 from public."userData" u where u.uid = p_user) then raise exception 'forbidden'; end if;

  insert into public.social_connections as c (user_id, network, status, account_id, account_name, scopes,
    access_expires_at, refresh_expires_at, data_access_expires_at, connected_at, last_checked_at)
  values (p_user, p_network, 'connected', p_account_id, nullif(btrim(p_account_name), ''), coalesce(p_scopes, '{}'),
    p_access_expires_at, p_refresh_expires_at, p_data_access_expires_at, clock_timestamp(), clock_timestamp())
  on conflict (user_id, network) do update set status = 'connected', status_reason = null,
    account_id = excluded.account_id, account_name = excluded.account_name, scopes = excluded.scopes,
    access_expires_at = excluded.access_expires_at, refresh_expires_at = excluded.refresh_expires_at,
    data_access_expires_at = excluded.data_access_expires_at, connected_at = excluded.connected_at,
    last_checked_at = excluded.last_checked_at, notified_status = null, notified_at = null,
    -- Another account means another page list.
    pages = case when c.account_id is distinct from excluded.account_id then '[]'::jsonb else c.pages end,
    updated_at = clock_timestamp()
  returning id into v_id;

  delete from public.social_credentials where connection_id = v_id;
  perform private.social_credentials_upsert(v_id, p_credentials);
  perform private.social_connection_refresh_status(v_id);
  return private.social_connection_summary(v_id);
end;
$$;

-- User disconnection: forget every credential, keep the row for history and health display.
create or replace function public.social_connection_disconnect(p_user uuid, p_network text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_user is null or p_network not in ('instagram', 'linkedin', 'facebook') then raise exception 'invalid_request'; end if;
  update public.social_connections set status = 'disconnected', status_reason = 'user_disconnected',
    pages = '[]'::jsonb, notified_status = null, notified_at = null, updated_at = clock_timestamp()
  where user_id = p_user and network = p_network returning id into v_id;
  if v_id is null then return jsonb_build_object('status', 'disconnected'); end if;
  delete from public.social_credentials where connection_id = v_id;
  return private.social_connection_summary(v_id);
end;
$$;

do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.social_connection_store(uuid,text,text,text,text[],timestamptz,timestamptz,timestamptz,jsonb)',
    'public.social_connection_disconnect(uuid,text)'
  ] loop
    execute format('alter function %s owner to postgres', v_fn);
    execute format('revoke all on function %s from public, anon, authenticated, service_role', v_fn);
    execute format('grant execute on function %s to service_role', v_fn);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
