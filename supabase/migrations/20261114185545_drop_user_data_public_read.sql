-- Remove anonymous read access to userData. The policy exposed every column
-- of active users (email, phone, OAuth access/refresh tokens, folder_nas,
-- odoo_id) to anyone holding the public anon key.
DROP POLICY IF EXISTS "guiadearquitectura can fetch users" ON public."userData";
