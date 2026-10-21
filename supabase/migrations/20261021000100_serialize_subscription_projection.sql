BEGIN;

-- Service-only, expiring/fenced ownership across separate Edge Function instances.
CREATE TABLE public.subscription_projection_leases (
  stripe_subscription_id text PRIMARY KEY,
  owner_token uuid NOT NULL,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.subscription_projection_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_projection_leases FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.claim_subscription_projection(p_subscription_id text, p_owner_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_subscription_id NOT LIKE 'sub_%' OR p_owner_token IS NULL THEN
    RAISE EXCEPTION 'Invalid subscription projection lease' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.subscription_projection_leases AS lease
    (stripe_subscription_id, owner_token, expires_at)
  VALUES (p_subscription_id, p_owner_token, pg_catalog.clock_timestamp() + interval '60 seconds')
  ON CONFLICT (stripe_subscription_id) DO UPDATE
    SET owner_token = EXCLUDED.owner_token, expires_at = EXCLUDED.expires_at
    WHERE lease.expires_at <= pg_catalog.clock_timestamp();
  RETURN FOUND;
END;
$$;

CREATE FUNCTION public.apply_subscription_projection(p_subscription_id text, p_owner_token uuid, p_projection jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id uuid := (p_projection->>'user_id')::uuid;
BEGIN
  -- Row locking fences a worker whose lease expired while its Stripe request was in flight.
  PERFORM 1 FROM public.subscription_projection_leases
    WHERE stripe_subscription_id = p_subscription_id AND owner_token = p_owner_token
      AND expires_at > pg_catalog.clock_timestamp()
    FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_projection->>'stripe_subscription_id' IS DISTINCT FROM p_subscription_id
      OR v_user_id IS NULL OR p_projection->>'billing_period' NOT IN ('monthly', 'annual')
      OR pg_catalog.jsonb_typeof(p_projection->'active') IS DISTINCT FROM 'boolean'
      OR pg_catalog.jsonb_typeof(p_projection->'has_web') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'Invalid subscription projection' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.subscriptions AS existing
    (user_id, stripe_customer_id, stripe_subscription_id, plan_type, billing_period, status,
     current_period_start, current_period_end, cancel_at_period_end, updated_at)
  VALUES
    (v_user_id, p_projection->>'stripe_customer_id', p_subscription_id, 'professional',
     p_projection->>'billing_period', p_projection->>'status',
     (p_projection->>'current_period_start')::timestamptz,
     (p_projection->>'current_period_end')::timestamptz,
     (p_projection->>'cancel_at_period_end')::boolean, pg_catalog.clock_timestamp())
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id, plan_type = EXCLUDED.plan_type,
    billing_period = EXCLUDED.billing_period, status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start, current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end, updated_at = EXCLUDED.updated_at
  WHERE existing.user_id = EXCLUDED.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription owner mismatch' USING ERRCODE = '23514'; END IF;

  UPDATE public."userData" SET
    active = (p_projection->>'active')::boolean, has_web = (p_projection->>'has_web')::boolean
    WHERE uid = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription user not found' USING ERRCODE = '23503'; END IF;
  -- Subscription, access flag and lease release commit together, never as separate writes.
  DELETE FROM public.subscription_projection_leases
    WHERE stripe_subscription_id = p_subscription_id AND owner_token = p_owner_token;
  RETURN true;
END;
$$;

CREATE FUNCTION public.release_subscription_projection(p_subscription_id text, p_owner_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  DELETE FROM public.subscription_projection_leases
    WHERE stripe_subscription_id = p_subscription_id AND owner_token = p_owner_token;
$$;

REVOKE ALL ON FUNCTION public.claim_subscription_projection(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_subscription_projection(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_subscription_projection(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_subscription_projection(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_subscription_projection(text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_subscription_projection(text, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
