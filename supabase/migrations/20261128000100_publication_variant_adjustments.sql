-- Image adjustments of per-network media variants (task odd/tasks/image-adjustments.md, T1; spec S3).
--
-- publication_media_variants gets a nullable `adjustments` jsonb: the tone, straighten and vertical
-- perspective values the user applied to the variant, so the dashboard can restore its sliders. The JPEG
-- variant already has them baked in; publishers never read this column. Additive and idempotent: existing
-- rows stay NULL (no adjustments). Apply BEFORE deploying the dashboard that selects the column.
--
-- Shape (every key optional, numbers only, no other keys, at most 256 bytes):
--   brightness, contrast, saturation, warmth, vertical: -100..100
--   rotation: -45..45 (degrees)

begin;
set local lock_timeout = '5s';

alter table public.publication_media_variants
  add column if not exists adjustments jsonb;

alter table public.publication_media_variants
  drop constraint if exists publication_media_variants_adjustments_check;

alter table public.publication_media_variants
  add constraint publication_media_variants_adjustments_check check (
    adjustments is null or (
      jsonb_typeof(adjustments) = 'object'
      and octet_length(adjustments::text) <= 256
      and (adjustments - array['brightness', 'contrast', 'saturation', 'warmth', 'rotation', 'vertical'])
        = '{}'::jsonb
      and not jsonb_path_exists(adjustments, '$.* ? (@.type() != "number")')
      and not jsonb_path_exists(adjustments, '$.brightness ? (@ < -100 || @ > 100)')
      and not jsonb_path_exists(adjustments, '$.contrast ? (@ < -100 || @ > 100)')
      and not jsonb_path_exists(adjustments, '$.saturation ? (@ < -100 || @ > 100)')
      and not jsonb_path_exists(adjustments, '$.warmth ? (@ < -100 || @ > 100)')
      and not jsonb_path_exists(adjustments, '$.vertical ? (@ < -100 || @ > 100)')
      and not jsonb_path_exists(adjustments, '$.rotation ? (@ < -45 || @ > 45)')
    )
  );

notify pgrst, 'reload schema';
commit;
