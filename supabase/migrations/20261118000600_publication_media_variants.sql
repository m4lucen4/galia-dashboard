-- Per-network image variants for publications (phase 3 of the n8n -> Supabase migration, S5/S19/S20).
--
-- The user's original image is never touched. When a network would reject an original
-- (ratio, format, weight or pixels) the dashboard produces a JPEG derivative per network and
-- stores it in the public bucket 'publication-variants'; publication_media_variants records
-- which derivative replaces which original (source_url) for which network.
--
-- Who can write (bucket objects and table rows): whoever may edit the publication, i.e. the same
-- rule as projectsPreview RLS (private.preview_access_allowed: admin, publication owner, or the
-- owner / assigned editor of its project), bound to the caller's own auth.uid().
-- service_role (Edge Functions) bypasses RLS and has full table access. anon has nothing.
--
-- Until the cutover n8n keeps publishing the original images (image_data); nothing here is
-- read by n8n and nothing it reads is changed (S14).
begin;
set local lock_timeout = '5s';

do $$
begin
  if to_regprocedure('private.preview_access_allowed(uuid,bigint)') is null then
    raise exception 'private.preview_access_allowed missing (apply 20261118000200 first)';
  end if;
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception 'storage schema missing';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bucket: public (the networks fetch the image by URL), JPEG only, 8 MB
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('publication-variants', 'publication-variants', true, 8388608, array['image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg'];

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, bound to the caller's own identity through auth.uid())
-- ---------------------------------------------------------------------------

-- Same rule as the projectsPreview policies, for a publication id. false when it does not exist.
create or replace function private.preview_id_access_allowed(p_preview bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select private.preview_access_allowed(p."user", p.project_id)
    from public."projectsPreview" p
    where p.id = p_preview
  ), false);
$$;
alter function private.preview_id_access_allowed(bigint) owner to postgres;
revoke all on function private.preview_id_access_allowed(bigint) from public, anon, authenticated, service_role;
grant execute on function private.preview_id_access_allowed(bigint) to authenticated;

-- Object name convention: <previewId>/<instagram|linkedin>/<uuid>.jpg, and the caller may edit
-- that publication. Exactly three segments, so nothing can be written elsewhere in the bucket.
create or replace function private.publication_variant_path_allowed(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    p_name ~ '^[0-9]{1,18}/(instagram|linkedin)/[0-9a-f-]{36}\.jpg$'
    and private.preview_id_access_allowed(substring(p_name from '^([0-9]{1,18})/')::bigint),
    false);
$$;
alter function private.publication_variant_path_allowed(text) owner to postgres;
revoke all on function private.publication_variant_path_allowed(text) from public, anon, authenticated, service_role;
grant execute on function private.publication_variant_path_allowed(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage policies (authenticated). Reads of a public bucket go through the public URL and need
-- no policy; the select policy lets the owner list / remove objects through the API.
-- ---------------------------------------------------------------------------

drop policy if exists "publication_variants_select" on storage.objects;
drop policy if exists "publication_variants_insert" on storage.objects;
drop policy if exists "publication_variants_update" on storage.objects;
drop policy if exists "publication_variants_delete" on storage.objects;

create policy "publication_variants_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'publication-variants' and private.publication_variant_path_allowed(name));

create policy "publication_variants_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'publication-variants' and private.publication_variant_path_allowed(name));

create policy "publication_variants_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'publication-variants' and private.publication_variant_path_allowed(name))
  with check (bucket_id = 'publication-variants' and private.publication_variant_path_allowed(name));

create policy "publication_variants_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'publication-variants' and private.publication_variant_path_allowed(name));

-- ---------------------------------------------------------------------------
-- Table: which derivative replaces which original for which network
-- ---------------------------------------------------------------------------

create table if not exists public.publication_media_variants (
  id uuid primary key default gen_random_uuid(),
  preview_id bigint not null references public."projectsPreview" (id) on delete cascade,
  network text not null check (network in ('instagram', 'linkedin')),
  -- The original image url as it appears in projectsPreview.image_data[].url
  source_url text not null check (char_length(source_url) <= 2000 and source_url ~ '^https://[^[:space:]]+$'),
  position integer not null default 0 check (position >= 0),
  storage_path text not null check (
    storage_path ~ '^[0-9]{1,18}/(instagram|linkedin)/[0-9a-f-]{36}\.jpg$'
    and starts_with(storage_path, preview_id::text || '/' || network || '/')
  ),
  public_url text not null check (char_length(public_url) <= 2000 and public_url ~ '^https://[^[:space:]]+$'),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  bytes integer not null check (bytes between 1 and 8388608),
  -- Crop the user chose on the original: {x, y, width, height, aspect}
  crop jsonb check (
    crop is null or (
      jsonb_typeof(crop) = 'object'
      and octet_length(crop::text) <= 256
      and jsonb_typeof(crop -> 'x') = 'number'
      and jsonb_typeof(crop -> 'y') = 'number'
      and jsonb_typeof(crop -> 'width') = 'number'
      and jsonb_typeof(crop -> 'height') = 'number'
      and jsonb_typeof(crop -> 'aspect') = 'string'
      and crop ->> 'aspect' in ('1:1', '4:5', '1.91:1', 'original')
      and jsonb_path_exists(crop, '$.x ? (@ >= 0)')
      and jsonb_path_exists(crop, '$.y ? (@ >= 0)')
      and jsonb_path_exists(crop, '$.width ? (@ > 0)')
      and jsonb_path_exists(crop, '$.height ? (@ > 0)')
    )
  ),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (preview_id, network, source_url),
  -- Instagram: width 320-1440 and ratio 0.8-1.91 (two decimals, as the rule is stated)
  constraint publication_media_variants_instagram_rules check (
    network <> 'instagram' or (
      width between 320 and 1440
      and round(width::numeric / height::numeric, 2) between 0.8 and 1.91
    )
  ),
  -- LinkedIn Images API: fewer than 36,152,320 pixels
  constraint publication_media_variants_linkedin_rules check (
    network <> 'linkedin' or width::bigint * height::bigint < 36152320
  )
);

create index if not exists publication_media_variants_preview_idx
  on public.publication_media_variants (preview_id, network, position);

-- Server-controlled columns cannot be rewritten from the browser (an upsert may still send them).
create or replace function private.publication_media_variants_touch()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.id := old.id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
alter function private.publication_media_variants_touch() owner to postgres;
revoke all on function private.publication_media_variants_touch() from public, anon, authenticated, service_role;

drop trigger if exists publication_media_variants_touch on public.publication_media_variants;
create trigger publication_media_variants_touch
  before update on public.publication_media_variants
  for each row execute function private.publication_media_variants_touch();

alter table public.publication_media_variants enable row level security;
revoke all on table public.publication_media_variants from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.publication_media_variants to authenticated;
grant all on table public.publication_media_variants to service_role;

drop policy if exists "publication_media_variants_select" on public.publication_media_variants;
drop policy if exists "publication_media_variants_insert" on public.publication_media_variants;
drop policy if exists "publication_media_variants_update" on public.publication_media_variants;
drop policy if exists "publication_media_variants_delete" on public.publication_media_variants;

create policy "publication_media_variants_select" on public.publication_media_variants
  for select to authenticated
  using (private.preview_id_access_allowed(preview_id));

create policy "publication_media_variants_insert" on public.publication_media_variants
  for insert to authenticated
  with check (created_by = auth.uid() and private.preview_id_access_allowed(preview_id));

create policy "publication_media_variants_update" on public.publication_media_variants
  for update to authenticated
  using (private.preview_id_access_allowed(preview_id))
  with check (private.preview_id_access_allowed(preview_id));

create policy "publication_media_variants_delete" on public.publication_media_variants
  for delete to authenticated
  using (private.preview_id_access_allowed(preview_id));

notify pgrst, 'reload schema';
commit;
