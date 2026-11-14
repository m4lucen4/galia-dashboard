-- Register-after-payment, review follow-ups (odd/tasks/registro-tras-pago.md, T2).
-- 1. The lookup also returns created_at so stripe-webhook only reuses an auth
--    user created for the pending registration, never a pre-existing account.
-- 2. Cleanup scrubs consumed rows by their personal data: the webhook already
--    blanks password_hash on consume, so filtering on it skipped every row.

DROP FUNCTION IF EXISTS public.registration_auth_user_id(text);
CREATE FUNCTION public.registration_auth_user_id(p_email text)
 RETURNS TABLE (id uuid, created_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT u.id, u.created_at FROM auth.users u WHERE lower(u.email) = lower(p_email) LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.registration_auth_user_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registration_auth_user_id(text) TO service_role;

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
   WHERE consumed_at IS NOT NULL
     AND (email <> '' OR first_name <> '' OR last_name <> '' OR phone <> '' OR password_hash <> '');

  DELETE FROM public.stripe_webhook_events
   WHERE processed_at < now() - interval '90 days';
$function$;
REVOKE ALL ON FUNCTION private.cleanup_registration_data() FROM PUBLIC, anon, authenticated;
