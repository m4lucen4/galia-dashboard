begin;

-- Separate metadata keeps localization writes away from project integrations.
create table public.project_translation_settings (
  project_id bigint primary key references public.projects(id) on delete cascade,
  original_language text not null check (original_language in ('es', 'en', 'ca')),
  unique (project_id, original_language)
);

create table public.project_translations (
  project_id bigint not null,
  language text not null check (language in ('es', 'en', 'ca')),
  original_language text not null,
  title text,
  description text,
  keywords text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, language),
  foreign key (project_id, original_language)
    references public.project_translation_settings(project_id, original_language)
    on update cascade on delete cascade,
  check (language <> original_language),
  check (coalesce(nullif(btrim(title), ''), nullif(btrim(description), ''),
    nullif(btrim(keywords), '')) is not null)
);

-- Do not rely on projects visibility: legacy policies expose all authenticated rows.
create function public.can_manage_project_translation(target_project_id bigint)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    where p.id = target_project_id and (
      p."user" = (select auth.uid()) or exists (
        select 1 from public."userData" u
        where u.uid = (select auth.uid()) and u.role = 'admin'
      )
    )
  );
$$;
revoke all on function public.can_manage_project_translation(bigint) from public, anon;
grant execute on function public.can_manage_project_translation(bigint) to authenticated;

alter table public.project_translation_settings enable row level security;
alter table public.project_translations enable row level security;
revoke all on public.project_translation_settings, public.project_translations from public, anon;
grant select, insert, update, delete on public.project_translation_settings,
  public.project_translations to authenticated;

create policy project_translation_settings_owner_admin
on public.project_translation_settings for all to authenticated
using (public.can_manage_project_translation(project_id))
with check (public.can_manage_project_translation(project_id));

create policy project_translations_owner_admin
on public.project_translations for all to authenticated
using (public.can_manage_project_translation(project_id))
with check (public.can_manage_project_translation(project_id));

-- Assignment already copies media in Storage. Commit the project and language
-- records together so a translation failure cannot leave a half-created project.
create function public.assign_project_with_translations(
  source_project_id bigint, target_user_id uuid, copied_images jsonb[]
) returns public.projects
language plpgsql security invoker set search_path = '' as $$
declare
  source public.projects%rowtype;
  destination public.projects%rowtype;
begin
  if not exists (
    select 1 from public."userData"
    where uid = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Only administrators can assign projects' using errcode = '42501';
  end if;
  if target_user_id is null or not exists (
    select 1 from public."userData" where uid = target_user_id
  ) then
    raise exception 'Invalid destination user' using errcode = '22023';
  end if;

  select * into strict source from public.projects where id = source_project_id;
  -- Lock language metadata before copying its dependent rows; concurrent changes
  -- cannot produce translations that disagree with the copied original language.
  perform 1 from public.project_translation_settings
    where project_id = source_project_id for update;

  insert into public.projects (
    title, state, description, keywords, "user", image_data, weblink,
    publications, promoter, collaborators, "googleMaps", authors, category,
    year, "requiredAI", "showMap", prompt, "photoCredit", "photoCreditLink", assigned
  ) values (
    source.title, source.state, source.description, source.keywords, target_user_id,
    coalesce(copied_images, array[]::jsonb[]), source.weblink, source.publications,
    source.promoter, source.collaborators, source."googleMaps", source.authors,
    source.category, source.year, source."requiredAI", source."showMap", source.prompt,
    source."photoCredit", source."photoCreditLink", source.assigned
  ) returning * into destination;

  insert into public.project_translation_settings (project_id, original_language)
    select destination.id, original_language from public.project_translation_settings
    where project_id = source_project_id;
  insert into public.project_translations (
    project_id, language, original_language, title, description, keywords
  ) select destination.id, language, original_language, title, description, keywords
    from public.project_translations where project_id = source_project_id;

  return destination;
end;
$$;
revoke all on function public.assign_project_with_translations(bigint, uuid, jsonb[]) from public, anon;
grant execute on function public.assign_project_with_translations(bigint, uuid, jsonb[]) to authenticated;

notify pgrst, 'reload schema';
commit;
