-- Publication targets: let authorized browsers read the target format.
--
-- 20261119000100 gave authenticated a column-level SELECT on publication_targets (the RLS
-- policy publication_targets_select_authorized still decides which rows). The video formats
-- of 20261122000100 (image, reel, story_image, story_video, video) are shown in the publish
-- status UI, so the column joins that list. The format is not sensitive: it is what the user
-- chose. Additive only.
begin;
set local lock_timeout = '5s';

grant select (format) on table public.publication_targets to authenticated;

commit;
