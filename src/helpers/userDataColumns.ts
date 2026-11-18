// Columns of userData the browser may read. The social token blobs (linkedln_data,
// instagram_data) are server-only: n8n reads them until the cutover, the dashboard reads
// connection health from social_connections instead.
// Kept as one string literal so supabase-js can infer the row type.
export const USER_DATA_COLUMNS =
  "id,created_at,updated_at,active,first_name,last_name,email,phone,company,vat,role,uid,language,avatar_url,description,address,postal_code,city,province,country,job_position,web,tags,odoo_id,province_id,folder_nas,has_web" as const;
