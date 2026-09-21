-- Applied through Supabase MCP; filename matches the recorded remote migration version.
create table public.odoo_collaborator_partner_mappings (
  collaborator_id uuid primary key,
  odoo_partner_id integer not null check (odoo_partner_id > 0)
);

alter table public.odoo_collaborator_partner_mappings enable row level security;

revoke all on table public.odoo_collaborator_partner_mappings from public, anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger on table public.odoo_collaborator_partner_mappings to service_role;
