-- Additive foundation for the future generation modal. No historical backfill.
-- Existing generation RPCs continue to read projects until the next refactor step.
begin;

create table public.publication_generation_configs (
  id uuid primary key default gen_random_uuid(),
  project_id bigint not null references public.projects(id) on delete cascade,
  publications_count smallint not null check (publications_count between 1 and 4),
  requires_ai boolean not null,
  prompt_id bigint references public.prompts(id) on delete restrict,
  prompt_snapshot text,
  created_at timestamptz not null default now(),
  constraint publication_generation_configs_ai_prompt check (
    (requires_ai and prompt_id is not null and prompt_snapshot is not null
      and length(btrim(prompt_snapshot)) > 0)
    or (not requires_ai and prompt_id is null and prompt_snapshot is null)
  )
);

create index publication_generation_configs_project_history
  on public.publication_generation_configs (project_id, created_at desc);
create index publication_generation_configs_prompt
  on public.publication_generation_configs (prompt_id);

-- Fail closed until the new generation entry point defines its access policies.
-- No application role may consume this table yet, including service_role.
alter table public.publication_generation_configs enable row level security;
revoke all on public.publication_generation_configs from public, anon, authenticated, service_role;

comment on table public.publication_generation_configs is
  'Per-generation configuration; initially empty, with no backfill from projects. Application access is deferred to the generation-flow refactor.';
comment on column public.publication_generation_configs.prompt_snapshot is
  'Exact prompt text for this request, preserved independently of later prompt edits.';

notify pgrst, 'reload schema';
commit;
