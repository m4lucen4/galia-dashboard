-- Phase 5 (T7) / S9, PREPARED: store projectsPreview.publishDate as the real instant.
--
-- Until now the dashboard saved the Madrid wall-clock time the user picked LABELLED +00 (the user picks
-- 2026-11-20 10:00 in Madrid, the column holds 2026-11-20 10:00:00+00, which is really 11:00 Madrid).
-- n8n compared it with the Madrid wall-clock, so both sides agreed. The new pipeline (publication_targets,
-- run_at, the new client) stores and reads the real instant (Madrid 10:00 in winter = 09:00:00+00).
--
-- DO NOT APPLY BEFORE THE CUTOVER (T8). Run it ONCE, in this order:
--   1. stop the n8n workflows ("Publicación inmediata" and "Publicación programada");
--   2. apply this migration;
--   3. only then turn the client switch VITE_SOCIAL_PUBLISHING_EDGE on and apply 20261119000200 (cron).
-- Applied earlier, n8n would publish up to 1-2 hours early (summer/winter offset); applied after the new
-- client is on, new real-instant dates would be shifted again.
--
-- Scope: rows with state 'scheduled' or 'preview' and a non-null publishDate that have NO
-- publication_targets row (not even archived). A row with targets was written by
-- publication_targets_schedule, which already stores the real instant; converting it would shift it.
-- Rows in other states ('published', ...) keep their historical value: it is only displayed.
--
-- publication_targets.run_at needs no conversion: targets are only created by publication_targets_schedule
-- from a real instant (the entry function takes an ISO instant), never from the legacy label. No target
-- created before the cutover exists besides test ones, and those already hold real instants.
--
-- Idempotent: every converted row is recorded in private.publish_date_conversions with its previous value
-- (this is also the rollback record). A second run converts nothing, because a recorded row is skipped.
--   rollback of one row: update public."projectsPreview" p set "publishDate" = c.previous_publish_date
--     from private.publish_date_conversions c where c.preview_id = p.id and p.id = <id>;
--
-- DST: (publishDate at time zone 'UTC') yields the naive wall-clock; "at time zone 'Europe/Madrid'"
-- turns it into the instant using the Madrid offset of that very date (+01 winter, +02 summer).
-- A wall-clock that does not exist (the spring-forward gap, 02:00-03:00) moves forward one hour; an
-- ambiguous one (the autumn repeat, 02:00-03:00 on the last Sunday of October) resolves to the FIRST
-- occurrence (summer time, CEST), like the client (madridWallClockToIso) and n8n do: Postgres returns the
-- second (standard time) occurrence, so when "that instant minus one hour" renders to the same Madrid
-- wall-clock, the earlier instant is used.
begin;
set local lock_timeout = '5s';

create table if not exists private.publish_date_conversions (
  preview_id bigint primary key,
  previous_publish_date timestamptz not null,
  converted_publish_date timestamptz not null,
  previous_state text,
  converted_at timestamptz not null default clock_timestamp()
);
alter table private.publish_date_conversions enable row level security;
revoke all on table private.publish_date_conversions from public, anon, authenticated, service_role;

do $$
declare
  v_converted integer;
begin
  with candidate as (
    select p.id, p."publishDate" as previous, p.state,
      case when ((w.standard - interval '1 hour') at time zone 'Europe/Madrid') = w.wall
        then w.standard - interval '1 hour' else w.standard end as converted
    from public."projectsPreview" p
    cross join lateral (select (p."publishDate" at time zone 'UTC') as wall) l
    cross join lateral (select l.wall as wall, (l.wall at time zone 'Europe/Madrid') as standard) w
    where p.state in ('scheduled', 'preview') and p."publishDate" is not null
      and not exists (select 1 from public.publication_targets t where t.preview_id = p.id)
      and not exists (select 1 from private.publish_date_conversions c where c.preview_id = p.id)
    for update of p
  ), recorded as (
    insert into private.publish_date_conversions (preview_id, previous_publish_date, converted_publish_date, previous_state)
    select id, previous, converted, state from candidate
    returning preview_id, converted_publish_date
  )
  update public."projectsPreview" p set "publishDate" = r.converted_publish_date
    from recorded r where p.id = r.preview_id;
  get diagnostics v_converted = row_count;
  raise notice 'publishDate converted to the real instant for % publication(s)', v_converted;
end;
$$;

commit;
