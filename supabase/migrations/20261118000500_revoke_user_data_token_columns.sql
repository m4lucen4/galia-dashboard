-- The browser no longer reads or writes the social token blobs of userData
-- (linkedln_data, instagram_data). n8n (service_role) and the social Edge Functions keep
-- full access until the cutover. Apply only after the client that selects explicit
-- columns (src/helpers/userDataColumns.ts) is deployed: select("*") would fail.
begin;
set local lock_timeout = '5s';

revoke select, update on table public."userData" from anon, authenticated;

grant select (id, created_at, updated_at, active, first_name, last_name, email, phone, company, vat,
  role, uid, language, avatar_url, description, address, postal_code, city, province, country,
  job_position, web, tags, odoo_id, province_id, folder_nas, has_web)
  on table public."userData" to authenticated;

grant update (updated_at, active, first_name, last_name, email, phone, company, vat, role, uid,
  language, avatar_url, description, address, postal_code, city, province, country, job_position,
  web, tags, odoo_id, province_id, folder_nas, has_web)
  on table public."userData" to authenticated;

notify pgrst, 'reload schema';
commit;
