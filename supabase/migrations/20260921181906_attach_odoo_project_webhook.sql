-- Applied through Supabase MCP; filename matches the remote migration ledger.
set local lock_timeout = '5s';

create trigger odoo_project_sync
after insert or update or delete on public.projects
for each row execute function public.odoo_project_webhook();
