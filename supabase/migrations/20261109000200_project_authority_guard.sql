begin;
set local lock_timeout = '5s';

-- Serialize schema/row writers while validating and installing this boundary.
lock table public.projects in access exclusive mode;

do $$
declare
  project_oid oid := 'public.projects'::regclass;
  sequence_oid oid := 'public.projects_id_seq'::regclass;
  helper_oid oid := 'private.current_user_is_admin()'::regprocedure;
  high_id bigint;
  sequence_value bigint;
  sequence_called boolean;
begin
  -- Do not adapt this security migration silently to a different table/identity.
  if not exists (
    select 1 from pg_class where oid = project_oid and relkind = 'r'
      and relowner = 'postgres'::regrole and relrowsecurity
      and not relispartition
  ) or exists (
    select 1 from pg_inherits where inhrelid = project_oid or inhparent = project_oid
  ) then
    raise exception 'Unexpected projects owner, RLS or inheritance';
  end if;
  if (select count(*) from pg_attribute where attrelid = project_oid
      and not attisdropped and (
        (attname = 'id' and atttypid = 'bigint'::regtype and attidentity = 'd')
        or (attname in ('user', 'assigned') and atttypid = 'uuid'::regtype
          and attgenerated = '' and not atthasdef)
      )) <> 3
    or pg_get_serial_sequence('public.projects', 'id')::regclass is distinct from sequence_oid
    or not exists (
      select 1 from pg_constraint c join pg_attribute a
        on a.attrelid = c.conrelid and a.attname = 'id'
      where c.conrelid = project_oid and c.contype = 'p'
        and c.conkey = array[a.attnum]
    ) or not exists (
      select 1 from pg_sequence s join pg_class c on c.oid = s.seqrelid
      where s.seqrelid = sequence_oid and c.relowner = 'postgres'::regrole
        and s.seqtypid = 'bigint'::regtype and s.seqincrement = 1
        and s.seqmin = 1 and s.seqmax = 9223372036854775807 and not s.seqcycle
    ) then
    raise exception 'Unexpected projects authority columns or identity sequence';
  end if;
  select max(id) into high_id from public.projects;
  select last_value, is_called into sequence_value, sequence_called
    from public.projects_id_seq;
  if high_id > sequence_value or (high_id = sequence_value and not sequence_called) then
    raise exception 'Project sequence is behind live IDs; investigate without resetting it';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_language l on l.oid = p.prolang
    where p.oid = helper_oid and p.proowner = 'postgres'::regrole
      and p.prosecdef and p.provolatile = 's' and l.lanname = 'sql'
      and p.prorettype = 'boolean'::regtype and p.pronargs = 0
      and p.proconfig = array['search_path=""']::text[]
  ) or not has_function_privilege('authenticated', helper_oid, 'EXECUTE')
    or exists (
      select 1 from pg_proc p, lateral aclexplode(coalesce(p.proacl,
        acldefault('f', p.proowner))) a
      where p.oid = helper_oid and a.grantee = 0 and a.privilege_type = 'EXECUTE'
    ) then
    raise exception 'Unexpected current_user_is_admin helper contract';
  end if;

  -- Known table writers only. Keep read/export and all unrelated privileges.
  if exists (
    select 1 from pg_class c, lateral aclexplode(coalesce(c.relacl,
      acldefault('r', c.relowner))) a
    where c.oid = project_oid and a.privilege_type = 'INSERT'
      and a.grantee not in ('postgres'::regrole, 'anon'::regrole,
        'authenticated'::regrole, 'service_role'::regrole)
  ) or exists (
    select 1 from pg_attribute c, lateral aclexplode(c.attacl) a
    where c.attrelid = project_oid and c.attnum > 0 and not c.attisdropped
      and not (a.grantee = 'public_projects_export_owner'::regrole
        and a.privilege_type = 'SELECT' and not a.is_grantable)
  ) or exists (
    select 1 from pg_class c, lateral aclexplode(c.relacl) a
    where c.oid = sequence_oid and a.privilege_type = 'UPDATE'
      and a.grantee not in (0, 'postgres'::regrole, 'anon'::regrole,
        'authenticated'::regrole, 'service_role'::regrole)
  ) then
    raise exception 'Unexpected project INSERT/column or sequence UPDATE grants';
  end if;
  if exists (
    select 1 from pg_roles where rolname in ('anon', 'authenticated')
      and (rolsuper or rolbypassrls)
  ) or pg_has_role('authenticated', 'postgres', 'MEMBER')
    or pg_has_role('anon', 'postgres', 'MEMBER')
    or pg_has_role('authenticated', 'service_role', 'MEMBER')
    or pg_has_role('anon', 'service_role', 'MEMBER') then
    raise exception 'Unexpected privileged API role membership';
  end if;
  if exists (
    select 1 from pg_trigger where tgrelid = project_oid and not tgisinternal
      and (tgname <> 'odoo_project_sync' or tgtype <> 29 or tgenabled <> 'O')
  ) or exists (
    select 1 from pg_rewrite where ev_class = project_oid
  ) then
    raise exception 'Unexpected projects trigger or rewrite rule';
  end if;
end;
$$;

create function private.guard_project_authority()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  caller_role text := current_setting('role', true);
  trusted_backend boolean;
begin
  -- Most updates take the original path, without a new auth or role lookup.
  if tg_op = 'UPDATE' then
    if new.id is not distinct from old.id
      and new."user" is not distinct from old."user"
      and new.assigned is not distinct from old.assigned then
      return new;
    end if;
  end if;

  -- current_user is this function's owner, NOT the invoker. A JWT service claim
  -- alone is not enough; require the actual PostgREST role as well.
  trusted_backend := (
    caller_role = 'service_role' and auth.role() = 'service_role'
  ) or (
    session_user in ('postgres', 'supabase_admin')
    and (caller_role = 'none' or caller_role = session_user::text)
  );
  if coalesce(trusted_backend, false) then
    return new;
  end if;

  -- Even authenticated admins cannot recycle an ID from a client request.
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id then
      raise exception 'Project identity cannot be changed' using errcode = '42501';
    end if;
  end if;
  if caller_role = 'authenticated' and auth.role() = 'authenticated'
    and auth.uid() is not null then
    if private.current_user_is_admin() then
      return new;
    end if;
    if tg_op = 'INSERT' and new."user" = auth.uid() and new.assigned is null then
      return new;
    end if;
  end if;
  raise exception 'Project owner and assignment require trusted authority'
    using errcode = '42501';
end;
$$;
alter function private.guard_project_authority() owner to postgres;
revoke all on function private.guard_project_authority() from public, anon, authenticated;

-- INSERT column ACLs reject even explicit DEFAULT/OVERRIDING forms for id.
-- Grant the current non-id surface, not a hand-maintained subset of app fields.
revoke insert on table public.projects from anon, authenticated;
do $$
declare
  columns_sql text;
begin
  select string_agg(format('%I', attname), ', ' order by attnum) into columns_sql
    from pg_attribute where attrelid = 'public.projects'::regclass
      and attnum > 0 and not attisdropped and attname <> 'id';
  execute format('grant insert (%s) on public.projects to authenticated', columns_sql);
end;
$$;

-- USAGE still permits nextval; SELECT still permits sequence inspection/currval.
-- UPDATE permits setval and would defeat the non-reusable identity boundary.
revoke update on sequence public.projects_id_seq from public, anon, authenticated;

create trigger guard_project_authority
before insert or update on public.projects
for each row execute function private.guard_project_authority();

do $$
begin
  -- Detect inherited privileges too; any failure rolls back the whole migration.
  if has_column_privilege('authenticated', 'public.projects', 'id', 'INSERT')
    or has_any_column_privilege('anon', 'public.projects', 'INSERT')
    or has_sequence_privilege('authenticated', 'public.projects_id_seq', 'UPDATE')
    or has_sequence_privilege('anon', 'public.projects_id_seq', 'UPDATE') then
    raise exception 'Inherited grants bypass project identity protection';
  end if;
  if not has_sequence_privilege('authenticated', 'public.projects_id_seq', 'USAGE')
    or not has_sequence_privilege('authenticated', 'public.projects_id_seq', 'SELECT')
    or not has_table_privilege('service_role', 'public.projects', 'INSERT')
    or not has_column_privilege('public_projects_export_owner', 'public.projects', 'id', 'SELECT') then
    raise exception 'Required integration/export privileges missing';
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
