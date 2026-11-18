-- Phase 5 (T7), PREPARED: every-minute schedule for the publication worker process-publication-targets.
--
-- DO NOT APPLY BEFORE THE CUTOVER (T8). From the first minute after this runs, due publication_targets
-- are published for real. Apply it only after: n8n is stopped, 20261119000300 (publishDate conversion) has
-- run, the Edge Function process-publication-targets and publish-publication are deployed with their
-- secrets (SOCIAL_WORKER_SECRET equal to the Vault secret social_worker_secret, RESEND_API_KEY), and the
-- client switch VITE_SOCIAL_PUBLISHING_EDGE is ready to be turned on.
--
-- Same pattern as 20261118000400: the worker URL and secret live in Vault (created here when missing).
-- social_worker_secret is shared with social-credentials-check: when it already exists it is reused,
-- never regenerated (the Edge Function secret must keep matching it).
--
-- Overlapping runs are safe: one invocation lasts at most ~120 s, so a run can still be going when the
-- next minute fires; targets are leased with FOR UPDATE SKIP LOCKED and every write is fenced by the lease.
--
-- Rollback: select cron.unschedule('publication-targets-worker');
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'publication_worker_url') then
    perform vault.create_secret(
      'https://mygqfdbloqojffhsurgo.supabase.co/functions/v1/process-publication-targets',
      'publication_worker_url', 'process-publication-targets worker URL');
  end if;
  if not exists (select 1 from vault.secrets where name = 'social_worker_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
      'social_worker_secret', 'X-Social-Worker-Secret for the social workers');
  end if;
end;
$$;

select cron.unschedule('publication-targets-worker')
where exists (select 1 from cron.job where jobname = 'publication-targets-worker');

select cron.schedule('publication-targets-worker', '* * * * *', $cron$
  with config as (
    select
      (select decrypted_secret from vault.decrypted_secrets where name = 'publication_worker_url') as url,
      (select decrypted_secret from vault.decrypted_secrets where name = 'social_worker_secret') as worker_secret
  )
  select net.http_post(
    url := config.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Social-Worker-Secret', config.worker_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 145000
  )
  from config
  where config.url ~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/process-publication-targets$'
    and config.worker_secret ~ '^[0-9a-f]{64}$';
$cron$);
