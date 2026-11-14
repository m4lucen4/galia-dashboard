-- Extend the userData guard so non-admin clients cannot grant themselves
-- billing or infrastructure state. Only admins, service_role (Stripe webhook)
-- and database maintenance may change active, has_web, folder_nas and odoo_id.
-- Re-sending an unchanged value stays allowed (the profile screen re-sends active).

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.guard_user_data_role_and_uid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  is_service_role pg_catalog.bool :=
    pg_catalog.current_setting('role', true) = 'service_role'
    AND auth.role() = 'service_role';
  is_database_maintenance pg_catalog.bool :=
    auth.role() IS NULL
    AND auth.uid() IS NULL
    AND coalesce(pg_catalog.current_setting('role', true), 'none') = 'none'
    AND session_user IN ('postgres', 'supabase_admin');
BEGIN
  IF is_service_role OR is_database_maintenance THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'userData writes require an authenticated actor'
      USING ERRCODE = '42501';
  END IF;

  IF pg_catalog.current_setting('role', true) <> 'authenticated' THEN
    RAISE EXCEPTION 'userData client writes require the authenticated database role'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF private.current_user_is_admin() THEN
      RETURN NEW;
    END IF;

    IF NEW.uid IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'non-admin users may only create their own userData row'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.role NOT IN ('customer', 'student') THEN
      RAISE EXCEPTION 'non-admin users may only create customer or student userData rows'
        USING ERRCODE = '42501';
    END IF;

    IF coalesce(NEW.active, false)
      OR coalesce(NEW.has_web, false)
      OR NEW.folder_nas IS NOT NULL
      OR NEW.odoo_id IS NOT NULL THEN
      RAISE EXCEPTION 'non-admin users cannot set active, has_web, folder_nas or odoo_id'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.uid IS DISTINCT FROM OLD.uid THEN
    RAISE EXCEPTION 'userData uid cannot be changed by authenticated actors'
      USING ERRCODE = '42501';
  END IF;

  IF private.current_user_is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'non-admin users cannot change userData role'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.active IS DISTINCT FROM OLD.active
    OR NEW.has_web IS DISTINCT FROM OLD.has_web
    OR NEW.folder_nas IS DISTINCT FROM OLD.folder_nas
    OR NEW.odoo_id IS DISTINCT FROM OLD.odoo_id THEN
    RAISE EXCEPTION 'non-admin users cannot change active, has_web, folder_nas or odoo_id'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;
