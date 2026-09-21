-- Applied through Supabase MCP; filename matches the remote migration ledger.
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_extension
    where extname = 'supabase_vault'
  ) or pg_catalog.to_regclass('vault.decrypted_secrets') is null then
    raise exception 'Vault metadata prerequisite is unavailable';
  end if;
end;
$$;

create or replace function public.odoo_project_webhook()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  project_id text;
  payload jsonb;
  service_role_key text;
  worker_secret text;
begin
  if tg_table_schema <> 'public'
    or tg_table_name <> 'projects'
    or tg_when <> 'AFTER'
    or tg_level <> 'ROW'
    or tg_op not in ('INSERT', 'UPDATE', 'DELETE') then
    raise exception 'odoo_project_webhook may only handle public.projects AFTER ROW INSERT, UPDATE, or DELETE';
  end if;

  if tg_op = 'INSERT' then
    project_id := new.id::text;
    payload := pg_catalog.jsonb_build_object(
      'type', tg_op,
      'schema', 'public',
      'table', 'projects',
      'record', pg_catalog.jsonb_build_object('id', project_id),
      'old_record', null
    );
  elsif tg_op = 'UPDATE' then
    project_id := new.id::text;
    payload := pg_catalog.jsonb_build_object(
      'type', tg_op,
      'schema', 'public',
      'table', 'projects',
      'record', pg_catalog.jsonb_build_object('id', project_id),
      'old_record', pg_catalog.jsonb_build_object('id', old.id::text)
    );
  else
    project_id := old.id::text;
    payload := pg_catalog.jsonb_build_object(
      'type', tg_op,
      'schema', 'public',
      'table', 'projects',
      'record', null,
      'old_record', pg_catalog.jsonb_build_object('id', project_id)
    );
  end if;

  begin
    select pg_catalog.btrim(decrypted_secret)
    into strict service_role_key
    from vault.decrypted_secrets
    where name = 'odoo_webhook_service_role';

    select pg_catalog.btrim(decrypted_secret)
    into strict worker_secret
    from vault.decrypted_secrets
    where name = 'odoo_webhook_worker_secret';

    if service_role_key is null
      or worker_secret is null
      or service_role_key = ''
      or worker_secret = ''
      or pg_catalog.strpos(service_role_key, pg_catalog.chr(13)) > 0
      or pg_catalog.strpos(service_role_key, pg_catalog.chr(10)) > 0
      or pg_catalog.strpos(worker_secret, pg_catalog.chr(13)) > 0
      or pg_catalog.strpos(worker_secret, pg_catalog.chr(10)) > 0 then
      raise exception using errcode = '22023', message = 'Odoo webhook credential is invalid';
    end if;

    perform net.http_post(
      url := 'https://mygqfdbloqojffhsurgo.supabase.co/functions/v1/odoo-project-sync',
      headers := pg_catalog.jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'x-odoo-sync-worker-secret', worker_secret,
        'Content-Type', 'application/json'
      ),
      body := payload,
      timeout_milliseconds := 60000
    );
  exception
    when query_canceled then
      raise;
    when others then
      raise log 'odoo_project_webhook_delivery_preparation_failed project_id=% event=% sqlstate=%', project_id, tg_op, sqlstate;
  end;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.odoo_project_webhook() from public, anon, authenticated, service_role;
