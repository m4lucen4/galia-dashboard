-- Admit the restored editorial prompt without rewriting accepted v1 jobs.
-- CREATE OR REPLACE preserves the existing owner and service-role-only ACL.
begin;

do $guard$
begin
  if pg_catalog.to_regprocedure('public.publication_generation_heartbeat(text,text)') is null then
    raise exception 'publication_generation_heartbeat prerequisite missing';
  end if;
end;
$guard$;

create or replace function public.publication_generation_heartbeat(p_model text, p_prompt_version text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(740219, 1);
  if p_model is null or p_model !~ '^[a-zA-Z0-9._:-]{1,120}$' or p_prompt_version not in ('publication-es-v1', 'publication-es-v2') or p_prompt_version is null then
    raise exception 'not_ready';
  end if;
  insert into public.publication_generation_readiness(singleton, last_seen, model, prompt_version)
    values (true, clock_timestamp(), p_model, p_prompt_version)
    on conflict (singleton) do update set last_seen = excluded.last_seen,
      model = excluded.model, prompt_version = excluded.prompt_version;
end;
$$;

commit;
