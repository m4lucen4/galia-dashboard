-- Register-after-payment, phase 4.1 (odd/tasks/registro-tras-pago.md, T1).
-- Server-only storage used by create-checkout-session and stripe-webhook (service_role).

-- Registrations waiting for a successful Stripe payment. The password is only
-- stored as a bcrypt hash and is scrubbed once the account has been created.
CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  phone          text NOT NULL,
  password_hash  text NOT NULL,
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  myweb          boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL DEFAULT now() + interval '48 hours',
  consumed_at    timestamptz,
  user_id        uuid
);
CREATE INDEX IF NOT EXISTS pending_registrations_email_idx
  ON public.pending_registrations (lower(email));
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pending_registrations FROM PUBLIC, anon, authenticated;

-- Stripe events whose one-time side effects (welcome email, n8n call,
-- account creation) were already performed.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id     text PRIMARY KEY,
  type         text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_webhook_events FROM PUBLIC, anon, authenticated;

-- Daily cleanup: drop unpaid expired registrations, scrub personal data and
-- password hashes from consumed ones, and forget old Stripe events.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.cleanup_registration_data()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  DELETE FROM public.pending_registrations
   WHERE consumed_at IS NULL AND expires_at < now();

  UPDATE public.pending_registrations
     SET email = '', first_name = '', last_name = '', phone = '', password_hash = ''
   WHERE consumed_at IS NOT NULL AND password_hash <> '';

  DELETE FROM public.stripe_webhook_events
   WHERE processed_at < now() - interval '90 days';
$function$;
REVOKE ALL ON FUNCTION private.cleanup_registration_data() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cleanup-registration-data';
SELECT cron.schedule(
  'cleanup-registration-data',
  '17 3 * * *',
  $$SELECT private.cleanup_registration_data();$$
);
