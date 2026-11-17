-- Publication iteration ("Iterar publicación") without n8n.
-- The iterate-publication Edge Function verifies identity through Supabase Auth
-- and calls these service_role-only RPCs around one synchronous OpenAI call:
--   begin  -> authorize, idempotent receipt, source text snapshot
--   finish -> re-authorize, atomic version append (or failure receipt)
-- No lock is held while the provider is called.
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regprocedure('private.publication_generation_authorized(uuid,bigint,uuid)') is null then
    raise exception 'Publication generation authority helper missing';
  end if;
end;
$$;

-- Receipts are content-free: no source text, instructions or generated text.
create table public.publication_iteration_requests (
  actor_id uuid not null,
  request_id uuid not null,
  preview_id bigint not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  version_id text,
  error_code text,
  model text,
  diagnostics jsonb check (diagnostics is null or (
    jsonb_typeof(diagnostics) = 'object' and octet_length(diagnostics::text) <= 2048)),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, request_id),
  check ((status = 'succeeded') = (version_id is not null)),
  check ((status = 'failed') = (error_code is not null))
);
create index publication_iteration_requests_preview_running
  on public.publication_iteration_requests (preview_id) where status = 'running';

alter table public.publication_iteration_requests enable row level security;
revoke all on table public.publication_iteration_requests from public, anon, authenticated, service_role;
grant select, insert, update on table public.publication_iteration_requests to service_role;

-- Same rule as publication generation: admin, project owner or assigned editor.
-- The preview owner keeps the access it already has on its own row.
create function private.publication_iteration_authorized(
  p_actor uuid, p_preview_owner uuid, p_project bigint
) returns boolean language sql stable security definer set search_path = '' as $$
  select p_actor is not null and (
    p_preview_owner = p_actor
    or exists (select 1 from public."userData" u where u.uid = p_actor and u.role = 'admin')
    or (p_project is not null and private.publication_generation_authorized(p_actor, p_project, p_preview_owner))
  );
$$;
alter function private.publication_iteration_authorized(uuid, uuid, bigint) owner to postgres;
revoke all on function private.publication_iteration_authorized(uuid, uuid, bigint)
  from public, anon, authenticated, service_role;

-- A running receipt older than this is treated as abandoned (crashed function).
create function private.publication_iteration_running_cutoff()
returns timestamptz language sql stable set search_path = '' as $$
  select clock_timestamp() - interval '3 minutes';
$$;
revoke all on function private.publication_iteration_running_cutoff() from public, anon, authenticated, service_role;

create function public.publication_iteration_begin(
  p_actor uuid, p_preview bigint, p_request uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_preview record;
  v_receipt public.publication_iteration_requests;
  v_main jsonb;
  v_source text;
begin
  if p_actor is null or p_preview is null or p_request is null then raise exception 'invalid_request'; end if;

  select p.id, p."user", p.project_id, p.description_rich, p.versions
    into v_preview from public."projectsPreview" p where p.id = p_preview for update;
  -- Unknown and foreign previews are indistinguishable to the caller.
  if not found or not private.publication_iteration_authorized(p_actor, v_preview."user", v_preview.project_id) then
    raise exception 'forbidden';
  end if;

  select * into v_receipt from public.publication_iteration_requests r
    where r.actor_id = p_actor and r.request_id = p_request for update;
  if found then
    if v_receipt.preview_id <> p_preview then raise exception 'conflict'; end if;
    if v_receipt.status = 'running' and v_receipt.updated_at < private.publication_iteration_running_cutoff() then
      update public.publication_iteration_requests set status = 'failed', error_code = 'lease_expired',
        updated_at = clock_timestamp() where actor_id = p_actor and request_id = p_request
        returning * into v_receipt;
    end if;
    if v_receipt.status = 'running' then raise exception 'in_progress'; end if;
    return jsonb_build_object('status', v_receipt.status, 'versionId', v_receipt.version_id,
      'errorCode', v_receipt.error_code, 'versions', coalesce(v_preview.versions, '[]'::jsonb));
  end if;

  -- One iteration at a time per publication: avoids duplicate spend on double clicks.
  update public.publication_iteration_requests set status = 'failed', error_code = 'lease_expired',
    updated_at = clock_timestamp()
    where preview_id = p_preview and status = 'running' and updated_at < private.publication_iteration_running_cutoff();
  if exists (select 1 from public.publication_iteration_requests r
    where r.preview_id = p_preview and r.status = 'running') then
    raise exception 'in_progress';
  end if;

  if jsonb_typeof(v_preview.versions) = 'array' and jsonb_array_length(v_preview.versions) >= 10 then
    raise exception 'version_limit';
  end if;
  if jsonb_typeof(v_preview.versions) = 'array' and jsonb_array_length(v_preview.versions) > 0 then
    select v into v_main from jsonb_array_elements(v_preview.versions) with ordinality e(v, n)
      order by (v->'main') = 'true'::jsonb desc nulls last, n limit 1;
    v_source := v_main->>'description';
  else
    v_source := v_preview.description_rich;
  end if;
  if v_source is null or btrim(v_source) = '' or length(v_source) > 30000 then
    raise exception 'invalid_project';
  end if;

  insert into public.publication_iteration_requests (actor_id, request_id, preview_id)
    values (p_actor, p_request, p_preview);
  return jsonb_build_object('status', 'started', 'sourceText', v_source);
end;
$$;

create function public.publication_iteration_finish(
  p_actor uuid, p_request uuid, p_description text, p_model text, p_error text, p_diagnostics jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_receipt public.publication_iteration_requests;
  v_preview record;
  v_versions jsonb;
  v_version_id text := gen_random_uuid()::text;
  v_preview_found boolean;
begin
  if p_actor is null or p_request is null or (p_description is null) = (p_error is null)
    or (p_description is not null and (btrim(p_description) = '' or length(p_description) > 30000))
    or (p_error is not null and p_error !~ '^[a-z_]{1,40}$')
    or (p_model is not null and p_model !~ '^[a-zA-Z0-9._:-]{1,200}$')
    or p_diagnostics is null or jsonb_typeof(p_diagnostics) <> 'object'
    or octet_length(p_diagnostics::text) > 2048 or jsonb_typeof(p_diagnostics->'reason') is distinct from 'string'
  then raise exception 'invalid_request'; end if;

  -- Lock order matches begin: preview row first, then receipt.
  select * into v_receipt from public.publication_iteration_requests r
    where r.actor_id = p_actor and r.request_id = p_request;
  if not found then raise exception 'conflict'; end if;
  select p.id, p."user", p.project_id, p.description_rich, p.versions
    into v_preview from public."projectsPreview" p where p.id = v_receipt.preview_id for update;
  v_preview_found := found;
  select * into v_receipt from public.publication_iteration_requests r
    where r.actor_id = p_actor and r.request_id = p_request for update;
  if v_receipt.status <> 'running' then raise exception 'conflict'; end if;

  if p_error is null and (not v_preview_found
    or not private.publication_iteration_authorized(p_actor, v_preview."user", v_preview.project_id)) then
    p_error := 'project_changed';
    p_description := null;
  end if;

  if p_error is null then
    v_versions := case when jsonb_typeof(v_preview.versions) = 'array' then v_preview.versions else '[]'::jsonb end;
    if jsonb_array_length(v_versions) >= 10 then
      p_error := 'version_limit';
    elsif jsonb_array_length(v_versions) = 0 then
      -- Same as n8n: the original description becomes the first, non-main version.
      v_versions := jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid()::text, 'main', false, 'description', v_preview.description_rich),
        jsonb_build_object('id', v_version_id, 'main', true, 'description', p_description));
    else
      select jsonb_agg(v || jsonb_build_object('main', false) order by n) into v_versions
        from jsonb_array_elements(v_versions) with ordinality e(v, n);
      v_versions := v_versions || jsonb_build_array(
        jsonb_build_object('id', v_version_id, 'main', true, 'description', p_description));
    end if;
  end if;

  if p_error is null then
    update public."projectsPreview" set versions = v_versions where id = v_preview.id;
    update public.publication_iteration_requests set status = 'succeeded', version_id = v_version_id,
      model = p_model, diagnostics = p_diagnostics, updated_at = clock_timestamp()
      where actor_id = p_actor and request_id = p_request;
    return jsonb_build_object('status', 'succeeded', 'versionId', v_version_id, 'versions', v_versions);
  end if;

  update public.publication_iteration_requests set status = 'failed', error_code = p_error,
    model = p_model, diagnostics = p_diagnostics, updated_at = clock_timestamp()
    where actor_id = p_actor and request_id = p_request;
  return jsonb_build_object('status', 'failed', 'errorCode', p_error);
end;
$$;

alter function public.publication_iteration_begin(uuid, bigint, uuid) owner to postgres;
alter function public.publication_iteration_finish(uuid, uuid, text, text, text, jsonb) owner to postgres;
revoke all on function public.publication_iteration_begin(uuid, bigint, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.publication_iteration_finish(uuid, uuid, text, text, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.publication_iteration_begin(uuid, bigint, uuid) to service_role;
grant execute on function public.publication_iteration_finish(uuid, uuid, text, text, text, jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
