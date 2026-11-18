-- Daily schedule for the social-credentials-check worker (phase 2).
-- The worker secret is generated here and kept in Vault; the same value must be set as
-- the Edge Function secret SOCIAL_WORKER_SECRET (copy it from Vault in the dashboard).
-- Until both match, the worker answers 401 and nothing changes.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'social_worker_url') then
    perform vault.create_secret(
      'https://mygqfdbloqojffhsurgo.supabase.co/functions/v1/social-credentials-check',
      'social_worker_url', 'social-credentials-check worker URL');
  end if;
  if not exists (select 1 from vault.secrets where name = 'social_worker_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
      'social_worker_secret', 'X-Social-Worker-Secret for social-credentials-check');
  end if;
end;
$$;

select cron.unschedule('social-credentials-check')
where exists (select 1 from cron.job where jobname = 'social-credentials-check');

select cron.schedule('social-credentials-check', '17 6 * * *', $cron$
  with config as (
    select
      (select decrypted_secret from vault.decrypted_secrets where name = 'social_worker_url') as url,
      (select decrypted_secret from vault.decrypted_secrets where name = 'social_worker_secret') as worker_secret
  )
  select net.http_post(
    url := config.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Social-Worker-Secret', config.worker_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 145000
  )
  from config
  where config.url ~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/social-credentials-check$'
    and config.worker_secret ~ '^[0-9a-f]{64}$';
$cron$);
