-- Social connections and server-side credentials (phase 2 of the n8n -> Supabase migration).
--
-- social_connections: one row per user and network with the connection health the user
--   sees (status, expiry dates, scopes, the pages they can publish to). No tokens.
--   The owner and admins can read it from the browser; only service_role writes it.
-- social_credentials: the tokens. service_role only, never returned to the browser.
--
-- Coexistence: until the cutover from n8n, the OAuth Edge Functions keep mirroring the
-- tokens into userData.linkedln_data / instagram_data, because n8n still reads them there.
-- This migration copies the existing connections from userData and changes nothing there.
--
-- Effective expiry (what the user must act on):
--   linkedin  : refresh token expiry when a refresh token exists, else access token expiry
--   instagram : data access expiry (long-lived page tokens do not expire; Meta stops data
--               access 90 days after the user's last activity), else user token expiry
-- status: expired when the effective expiry has passed, expiring within 7 days, else connected.
-- Workers may set revoked / error explicitly (invalid token, removed permission).
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regprocedure('private.current_user_is_admin()') is null then
    raise exception 'Admin helper missing';
  end if;
end;
$$;

create table public.social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  network text not null check (network in ('instagram', 'linkedin')),
  status text not null default 'connected'
    check (status in ('connected', 'expiring', 'expired', 'revoked', 'error', 'disconnected')),
  status_reason text check (status_reason is null or status_reason ~ '^[a-z_]{1,60}$'),
  account_id text check (account_id is null or account_id ~ '^[A-Za-z0-9:_.-]{1,100}$'),
  account_name text check (account_name is null or char_length(account_name) <= 200),
  scopes text[] not null default '{}' check (cardinality(scopes) <= 50),
  -- Publishable pages without tokens: [{id, name, type, username?, facebookPageId?, facebookPageName?}]
  pages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(pages) = 'array' and octet_length(pages::text) <= 32768),
  access_expires_at timestamptz,
  refresh_expires_at timestamptz,
  data_access_expires_at timestamptz,
  expires_at timestamptz,
  connected_at timestamptz,
  last_checked_at timestamptz,
  last_refreshed_at timestamptz,
  -- Last status the user was emailed about; one email per status change.
  notified_status text,
  notified_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (user_id, network)
);
create index social_connections_check_due on public.social_connections (last_checked_at nulls first)
  where status in ('connected', 'expiring', 'error');

create table public.social_credentials (
  connection_id uuid not null references public.social_connections (id) on delete cascade,
  kind text not null check (kind in ('user_access', 'refresh', 'page_access')),
  -- Page id for page tokens, empty for user-level tokens.
  external_id text not null default '' check (external_id ~ '^[A-Za-z0-9:_.-]{0,100}$'),
  token text not null check (char_length(token) between 1 and 4096),
  expires_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (connection_id, kind, external_id),
  check ((kind = 'page_access') = (external_id <> ''))
);

alter table public.social_connections enable row level security;
alter table public.social_credentials enable row level security;
revoke all on table public.social_connections from public, anon, authenticated, service_role;
revoke all on table public.social_credentials from public, anon, authenticated, service_role;
grant select on table public.social_connections to authenticated;
grant select, insert, update, delete on table public.social_connections to service_role;
grant select, insert, update, delete on table public.social_credentials to service_role;

create policy "social_connections_owner_or_admin" on public.social_connections
  for select to authenticated
  using (user_id = auth.uid() or private.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function private.try_timestamptz(p_value text)
returns timestamptz language plpgsql stable set search_path = '' as $$
begin
  if p_value is null or btrim(p_value) = '' then return null; end if;
  if p_value ~ '^\d{9,11}$' then return to_timestamp(p_value::bigint); end if;
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

create function private.social_effective_expiry(
  p_network text, p_access timestamptz, p_refresh timestamptz, p_data_access timestamptz, p_has_refresh boolean
) returns timestamptz language sql immutable set search_path = '' as $$
  select case
    when p_network = 'linkedin' then case when p_has_refresh then coalesce(p_refresh, p_access) else p_access end
    else coalesce(p_data_access, p_access)
  end;
$$;

create function private.social_status_for(p_expires timestamptz)
returns text language sql stable set search_path = '' as $$
  select case
    when p_expires is null then 'connected'
    when p_expires <= clock_timestamp() then 'expired'
    when p_expires <= clock_timestamp() + interval '7 days' then 'expiring'
    else 'connected'
  end;
$$;

-- Pages must be an array of objects with string id/name and no token-like key.
create function private.social_pages_valid(p_pages jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(p_pages) = 'array'
    and jsonb_array_length(p_pages) <= 200
    and not exists (
      select 1 from jsonb_array_elements(p_pages) e
      where jsonb_typeof(e) <> 'object'
        or jsonb_typeof(e->'id') <> 'string'
        or (e->>'id') !~ '^[A-Za-z0-9:_.-]{1,100}$'
        or exists (select 1 from jsonb_object_keys(e) k where k ilike '%token%' or k ilike '%secret%')
    );
$$;

-- Recomputes expiry and status from the stored dates. Explicit revoked/error/disconnected stay.
create function private.social_connection_refresh_status(p_connection uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_conn public.social_connections;
  v_has_refresh boolean;
  v_expires timestamptz;
  v_status text;
begin
  select * into v_conn from public.social_connections where id = p_connection;
  if not found then return; end if;
  select exists (select 1 from public.social_credentials c where c.connection_id = p_connection and c.kind = 'refresh')
    into v_has_refresh;
  v_expires := private.social_effective_expiry(v_conn.network, v_conn.access_expires_at,
    v_conn.refresh_expires_at, v_conn.data_access_expires_at, v_has_refresh);
  v_status := case when v_conn.status in ('revoked', 'error', 'disconnected') then v_conn.status
    else private.social_status_for(v_expires) end;
  update public.social_connections set expires_at = v_expires,
    status = v_status,
    status_reason = case when v_conn.status in ('revoked', 'error', 'disconnected') then v_conn.status_reason else null end,
    -- Healthy again: a later expiry must notify again.
    notified_status = case when v_status = 'connected' then null else notified_status end,
    notified_at = case when v_status = 'connected' then null else notified_at end,
    updated_at = clock_timestamp()
  where id = p_connection;
end;
$$;

-- Summary returned to Edge Functions (never tokens).
create function private.social_connection_summary(p_connection uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'userId', c.user_id, 'network', c.network, 'status', c.status,
    'statusReason', c.status_reason, 'accountId', c.account_id, 'accountName', c.account_name,
    'scopes', to_jsonb(c.scopes), 'pages', c.pages, 'expiresAt', c.expires_at,
    'accessExpiresAt', c.access_expires_at, 'refreshExpiresAt', c.refresh_expires_at,
    'dataAccessExpiresAt', c.data_access_expires_at, 'connectedAt', c.connected_at,
    'lastCheckedAt', c.last_checked_at)
  from public.social_connections c where c.id = p_connection;
$$;

-- Upserts credentials [{kind, externalId?, token, expiresAt?}] for a connection.
create function private.social_credentials_upsert(p_connection uuid, p_credentials jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
begin
  if p_credentials is null then return; end if;
  if jsonb_typeof(p_credentials) <> 'array' or jsonb_array_length(p_credentials) > 210 then
    raise exception 'invalid_request';
  end if;
  for v_item in select value from jsonb_array_elements(p_credentials) loop
    if jsonb_typeof(v_item) <> 'object' or v_item->>'kind' not in ('user_access', 'refresh', 'page_access')
      or coalesce(v_item->>'token', '') = '' or char_length(v_item->>'token') > 4096
      or ((v_item->>'kind') = 'page_access') <> (coalesce(v_item->>'externalId', '') <> '')
      or coalesce(v_item->>'externalId', '') !~ '^[A-Za-z0-9:_.-]{0,100}$'
      or (v_item ? 'expiresAt' and jsonb_typeof(v_item->'expiresAt') <> 'null'
        and private.try_timestamptz(v_item->>'expiresAt') is null)
    then raise exception 'invalid_request'; end if;
    insert into public.social_credentials (connection_id, kind, external_id, token, expires_at)
      values (p_connection, v_item->>'kind', coalesce(v_item->>'externalId', ''), v_item->>'token',
        private.try_timestamptz(v_item->>'expiresAt'))
      on conflict (connection_id, kind, external_id) do update
        set token = excluded.token, expires_at = excluded.expires_at, updated_at = clock_timestamp();
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- service_role RPCs
-- ---------------------------------------------------------------------------

-- A (re)connection after OAuth: replaces every credential and resets health and notices.
create function public.social_connection_store(
  p_user uuid, p_network text, p_account_id text, p_account_name text, p_scopes text[],
  p_access_expires_at timestamptz, p_refresh_expires_at timestamptz, p_data_access_expires_at timestamptz,
  p_credentials jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_user is null or p_network is null or p_network not in ('instagram', 'linkedin')
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

-- Publishable pages (no tokens) plus their page tokens. Page tokens of pages no longer listed are removed.
create function public.social_connection_set_pages(
  p_user uuid, p_network text, p_pages jsonb, p_page_credentials jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_conn public.social_connections;
begin
  if p_user is null or p_network is null or p_pages is null or not private.social_pages_valid(p_pages)
    or (p_page_credentials is not null and (jsonb_typeof(p_page_credentials) <> 'array' or exists (
      select 1 from jsonb_array_elements(p_page_credentials) e where e->>'kind' is distinct from 'page_access')))
  then raise exception 'invalid_request'; end if;

  select * into v_conn from public.social_connections c
    where c.user_id = p_user and c.network = p_network for update;
  if not found or v_conn.status = 'disconnected' then raise exception 'not_connected'; end if;

  update public.social_connections set pages = p_pages, updated_at = clock_timestamp() where id = v_conn.id;
  if p_page_credentials is not null then
    delete from public.social_credentials c where c.connection_id = v_conn.id and c.kind = 'page_access'
      and not exists (select 1 from jsonb_array_elements(p_page_credentials) e where e->>'externalId' = c.external_id);
    perform private.social_credentials_upsert(v_conn.id, p_page_credentials);
  end if;
  return private.social_connection_summary(v_conn.id);
end;
$$;

-- Result of a health check or token refresh by the worker.
-- p_status null recomputes from dates; 'revoked' or 'error' (with reason) are kept until reconnection.
-- p_expected_connected_at: the connected_at the worker read when it started the check. When given
-- and different from the row's, the connection was reconnected during the run: the stale report is
-- dropped (nothing changes, the current summary is returned).
create function public.social_connection_report(
  p_connection uuid, p_status text, p_reason text,
  p_access_expires_at timestamptz, p_refresh_expires_at timestamptz, p_data_access_expires_at timestamptz,
  p_credentials jsonb, p_refreshed boolean, p_expected_connected_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_conn public.social_connections;
begin
  if p_connection is null or (p_status is not null and p_status not in ('revoked', 'error'))
    or (p_status is not null) <> (p_reason is not null)
    or (p_reason is not null and p_reason !~ '^[a-z_]{1,60}$')
  then raise exception 'invalid_request'; end if;

  select * into v_conn from public.social_connections where id = p_connection for update;
  if not found then raise exception 'not_found'; end if;
  -- A disconnection or a newer reconnection wins over a stale check.
  if v_conn.status = 'disconnected' then return private.social_connection_summary(p_connection); end if;
  if p_expected_connected_at is not null and v_conn.connected_at is distinct from p_expected_connected_at then
    return private.social_connection_summary(p_connection);
  end if;

  perform private.social_credentials_upsert(p_connection, p_credentials);
  update public.social_connections set
    access_expires_at = coalesce(p_access_expires_at, access_expires_at),
    refresh_expires_at = coalesce(p_refresh_expires_at, refresh_expires_at),
    data_access_expires_at = coalesce(p_data_access_expires_at, data_access_expires_at),
    status = coalesce(p_status, case when status in ('revoked', 'error') then 'connected' else status end),
    status_reason = p_reason,
    last_checked_at = clock_timestamp(),
    last_refreshed_at = case when coalesce(p_refreshed, false) then clock_timestamp() else last_refreshed_at end,
    updated_at = clock_timestamp()
  where id = p_connection;
  if p_status is null then perform private.social_connection_refresh_status(p_connection); end if;
  return private.social_connection_summary(p_connection);
end;
$$;

-- User disconnection: forget every credential, keep the row for history and health display.
create function public.social_connection_disconnect(p_user uuid, p_network text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_user is null or p_network not in ('instagram', 'linkedin') then raise exception 'invalid_request'; end if;
  update public.social_connections set status = 'disconnected', status_reason = 'user_disconnected',
    pages = '[]'::jsonb, notified_status = null, notified_at = null, updated_at = clock_timestamp()
  where user_id = p_user and network = p_network returning id into v_id;
  if v_id is null then return jsonb_build_object('status', 'disconnected'); end if;
  delete from public.social_credentials where connection_id = v_id;
  return private.social_connection_summary(v_id);
end;
$$;

-- Tokens for server-side use only (publishers, health checks).
create function public.social_credentials_get(p_connection uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', c.kind, 'externalId', nullif(c.external_id, ''),
    'token', c.token, 'expiresAt', c.expires_at) order by c.kind, c.external_id), '[]'::jsonb)
  from public.social_credentials c where c.connection_id = p_connection;
$$;

create function public.social_connection_for_user(p_user uuid, p_network text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.social_connection_summary(c.id)
  from public.social_connections c where c.user_id = p_user and c.network = p_network;
$$;

-- Connections the daily worker should check: not checked in the last 20 hours.
create function public.social_connections_due_check(p_limit integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if p_limit is null or p_limit not between 1 and 200 then raise exception 'invalid_request'; end if;
  return (select coalesce(jsonb_agg(private.social_connection_summary(c.id)), '[]'::jsonb) from (
    select id from public.social_connections
    where (status in ('connected', 'expiring', 'error', 'expired')
        and (last_checked_at is null or last_checked_at < clock_timestamp() - interval '20 hours'))
      -- A revoked connection is not checked again, but its email must be retried when the send failed.
      or (status = 'revoked' and notified_status is distinct from status)
    order by last_checked_at nulls first limit p_limit) c);
end;
$$;

-- Claims the right to email the user about the connection's current status, once per status.
-- Returns the recipient when an email is due, null otherwise.
create function public.social_connection_claim_notice(p_connection uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_conn public.social_connections;
  v_user record;
begin
  if p_connection is null then raise exception 'invalid_request'; end if;
  select * into v_conn from public.social_connections where id = p_connection for update;
  if not found or v_conn.status not in ('expiring', 'expired', 'revoked', 'error')
    or v_conn.notified_status is not distinct from v_conn.status then
    return null;
  end if;
  select u.email, u.first_name, u.language into v_user from public."userData" u where u.uid = v_conn.user_id;
  if not found or coalesce(btrim(v_user.email), '') = '' then return null; end if;
  update public.social_connections set notified_status = status, notified_at = clock_timestamp()
    where id = p_connection;
  return jsonb_build_object('connection', private.social_connection_summary(p_connection),
    'email', v_user.email, 'firstName', v_user.first_name, 'language', v_user.language);
end;
$$;

-- Gives the notice back when the email could not be sent, so the next run retries it.
-- Only releases while the claim still matches p_status (a newer status keeps its own claim).
create function public.social_connection_release_notice(p_connection uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_connection is null or p_status is null then raise exception 'invalid_request'; end if;
  update public.social_connections set notified_status = null, notified_at = null
    where id = p_connection and notified_status = p_status
    returning id into v_id;
  return v_id is not null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Transitional n8n bridge (remove at cutover)
-- ---------------------------------------------------------------------------
-- n8n publishes to Instagram with checkSocialNetworks.instagram.accessToken. The browser no
-- longer receives page tokens, so the server fills it in from social_credentials of the
-- publication owner when the selected Instagram account has no token in the payload.
-- Known, accepted cost while n8n still reads the column: that page token is stored in
-- projectsPreview.checkSocialNetworks, which the publication owner and admins can read from
-- the browser through the projectsPreview RLS (select *). Page tokens are not returned by the
-- social functions or readable in social_credentials, but this copy is. Removed at cutover
-- together with this trigger, when the publisher reads social_credentials server-side.
create function private.bridge_instagram_page_token()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ig jsonb := new."checkSocialNetworks"->'instagram';
  v_token text;
begin
  if jsonb_typeof(v_ig) = 'object' and coalesce(v_ig->>'id', '') <> ''
    and coalesce(v_ig->>'accessToken', '') = '' and new."user" is not null then
    select c.token into v_token
      from public.social_connections s
      join public.social_credentials c on c.connection_id = s.id
      where s.user_id = new."user" and s.network = 'instagram' and s.status <> 'disconnected'
        and c.kind = 'page_access' and c.external_id = v_ig->>'id';
    if v_token is not null then
      new."checkSocialNetworks" := jsonb_set(new."checkSocialNetworks", '{instagram,accessToken}', to_jsonb(v_token));
    end if;
  end if;
  return new;
end;
$$;

create trigger bridge_instagram_page_token
  before insert or update of "checkSocialNetworks" on public."projectsPreview"
  for each row execute function private.bridge_instagram_page_token();

-- ---------------------------------------------------------------------------
-- Backfill from userData (read only there; tokens stay in userData for n8n)
-- ---------------------------------------------------------------------------

do $$
declare
  v_row record;
  v_id uuid;
  v_li jsonb;
  v_ig jsonb;
  v_connected boolean;
  v_pages jsonb;
begin
  for v_row in select u.uid, u.linkedln_data, u.instagram_data from public."userData" u where u.uid is not null loop
    v_li := v_row.linkedln_data;
    if jsonb_typeof(v_li) = 'object' and coalesce(v_li->>'linkedin_person_id', '') ~ '^[A-Za-z0-9:_.-]{1,100}$'
      and coalesce(v_li->>'access_token', '') <> '' then
      v_connected := coalesce(v_li->>'is_connected', 'true') <> 'false';
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', p->>'id', 'name', p->>'name',
          'type', p->>'type', 'vanityName', p->>'vanityName'))), '[]'::jsonb)
        into v_pages
        from jsonb_array_elements(case when jsonb_typeof(v_li->'admin_pages') = 'array' then v_li->'admin_pages' else '[]'::jsonb end) p
        where jsonb_typeof(p) = 'object' and coalesce(p->>'id', '') ~ '^[A-Za-z0-9:_.-]{1,100}$';
      insert into public.social_connections (user_id, network, status, status_reason, account_id, account_name,
        scopes, pages, access_expires_at, refresh_expires_at, connected_at)
      values (v_row.uid, 'linkedin', case when v_connected then 'connected' else 'disconnected' end,
        case when v_connected then null else 'user_disconnected' end,
        v_li->>'linkedin_person_id', left(nullif(v_li->>'user_name', ''), 200),
        coalesce((select array_agg(left(x, 100)) from jsonb_array_elements_text(
          case when jsonb_typeof(v_li->'permissions_granted') = 'array' then v_li->'permissions_granted' else '[]'::jsonb end) x), '{}'),
        case when v_connected then v_pages else '[]'::jsonb end,
        private.try_timestamptz(v_li->>'token_expires_at'),
        -- LinkedIn refresh tokens live 365 days from the first authorization.
        case when coalesce(v_li->>'refresh_token', '') <> ''
          then private.try_timestamptz(v_li->>'connected_at') + interval '365 days' end,
        private.try_timestamptz(v_li->>'connected_at'))
      returning id into v_id;
      if v_connected then
        insert into public.social_credentials (connection_id, kind, token, expires_at)
          values (v_id, 'user_access', v_li->>'access_token', private.try_timestamptz(v_li->>'token_expires_at'));
        if coalesce(v_li->>'refresh_token', '') <> '' and char_length(v_li->>'refresh_token') <= 4096 then
          insert into public.social_credentials (connection_id, kind, token, expires_at)
            values (v_id, 'refresh', v_li->>'refresh_token',
              private.try_timestamptz(v_li->>'connected_at') + interval '365 days');
        end if;
      end if;
      perform private.social_connection_refresh_status(v_id);
    end if;

    v_ig := v_row.instagram_data;
    if jsonb_typeof(v_ig) = 'object' and coalesce(v_ig->>'access_token', '') <> ''
      and coalesce(v_ig->>'instagram_user_id', v_ig->>'user_id', '') ~ '^[A-Za-z0-9:_.-]{1,100}$' then
      v_connected := coalesce(v_ig->>'is_connected', 'true') <> 'false';
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', p->>'instagram_business_account_id',
          'name', coalesce(p->>'instagram_username', p->>'facebook_page_name'), 'type', 'BUSINESS',
          'username', p->>'instagram_username', 'facebookPageId', p->>'facebook_page_id',
          'facebookPageName', p->>'facebook_page_name'))), '[]'::jsonb)
        into v_pages
        from jsonb_array_elements(case when jsonb_typeof(v_ig->'business_pages') = 'array' then v_ig->'business_pages' else '[]'::jsonb end) p
        where jsonb_typeof(p) = 'object' and coalesce(p->>'instagram_business_account_id', '') ~ '^[A-Za-z0-9:_.-]{1,100}$';
      insert into public.social_connections (user_id, network, status, status_reason, account_id, account_name,
        scopes, pages, access_expires_at, data_access_expires_at, connected_at)
      values (v_row.uid, 'instagram', case when v_connected then 'connected' else 'disconnected' end,
        case when v_connected then null else 'user_disconnected' end,
        coalesce(v_ig->>'instagram_user_id', v_ig->>'user_id'), left(nullif(v_ig->>'username', ''), 200),
        coalesce((select array_agg(left(x, 100)) from jsonb_array_elements_text(
          case when jsonb_typeof(v_ig->'permissions_granted') = 'array' then v_ig->'permissions_granted' else '[]'::jsonb end) x), '{}'),
        case when v_connected then v_pages else '[]'::jsonb end,
        private.try_timestamptz(v_ig->>'token_expires_at'),
        private.try_timestamptz(v_ig->>'data_access_expires_at'),
        private.try_timestamptz(v_ig->>'connected_at'))
      returning id into v_id;
      if v_connected then
        insert into public.social_credentials (connection_id, kind, token, expires_at)
          values (v_id, 'user_access', v_ig->>'access_token', private.try_timestamptz(v_ig->>'token_expires_at'));
        insert into public.social_credentials (connection_id, kind, external_id, token)
          select v_id, 'page_access', p->>'instagram_business_account_id', p->>'page_access_token'
          from jsonb_array_elements(case when jsonb_typeof(v_ig->'business_pages') = 'array' then v_ig->'business_pages' else '[]'::jsonb end) p
          where jsonb_typeof(p) = 'object'
            and coalesce(p->>'instagram_business_account_id', '') ~ '^[A-Za-z0-9:_.-]{1,100}$'
            and coalesce(p->>'page_access_token', '') <> '' and char_length(p->>'page_access_token') <= 4096
          on conflict do nothing;
      end if;
      perform private.social_connection_refresh_status(v_id);
    end if;
  end loop;
end;
$$;

do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'private.try_timestamptz(text)',
    'private.social_effective_expiry(text,timestamptz,timestamptz,timestamptz,boolean)',
    'private.social_status_for(timestamptz)',
    'private.social_pages_valid(jsonb)',
    'private.social_connection_refresh_status(uuid)',
    'private.social_connection_summary(uuid)',
    'private.social_credentials_upsert(uuid,jsonb)',
    'private.bridge_instagram_page_token()',
    'public.social_connection_store(uuid,text,text,text,text[],timestamptz,timestamptz,timestamptz,jsonb)',
    'public.social_connection_set_pages(uuid,text,jsonb,jsonb)',
    'public.social_connection_report(uuid,text,text,timestamptz,timestamptz,timestamptz,jsonb,boolean,timestamptz)',
    'public.social_connection_disconnect(uuid,text)',
    'public.social_credentials_get(uuid)',
    'public.social_connection_for_user(uuid,text)',
    'public.social_connections_due_check(integer)',
    'public.social_connection_claim_notice(uuid)',
    'public.social_connection_release_notice(uuid,text)'
  ] loop
    execute format('alter function %s owner to postgres', v_fn);
    execute format('revoke all on function %s from public, anon, authenticated, service_role', v_fn);
    if v_fn like 'public.%' then
      execute format('grant execute on function %s to service_role', v_fn);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
