-- Register-after-payment, phase 4.2 (odd/tasks/registro-tras-pago.md, T2).
-- Lets stripe-webhook (service_role only) resolve the auth user created by a
-- previous delivery of the same Stripe event when its uid was not stored.
CREATE OR REPLACE FUNCTION public.registration_auth_user_id(p_email text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.registration_auth_user_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registration_auth_user_id(text) TO service_role;
