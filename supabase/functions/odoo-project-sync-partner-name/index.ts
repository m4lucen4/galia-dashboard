import { createClient } from "jsr:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };
const maxBodyBytes = 64_000;
const requestTimeoutMs = 10_000;
const runBudgetMs = 45_000;
const odooIntegerMax = 2_147_483_647;
const projectFields = "id,user,title,description,keywords,requiredAI,weblink,image_data,publications,googleMaps,category,year,showMap,projectCollaborators";

type WebhookEvent = "INSERT" | "UPDATE" | "DELETE";
type WebhookPayload = { type: WebhookEvent; schema: "public"; table: "projects"; record: Record<string, unknown> | null; old_record: Record<string, unknown> | null };
type Project = Record<string, unknown>;
type Collaborator = { id: string; name: string; profession: string; website: string | false };
type OdooProject = { id: unknown; x_mocklab_id: unknown; x_studio_galeria_1?: unknown };
type Attachment = { id: unknown; name: unknown; type: unknown; url: unknown; res_model: unknown; res_id: unknown };
type OdooCollaborator = { id: unknown; x_name: unknown; x_partner_id: unknown; x_origen: unknown; x_estado_validacion: unknown };
type OdooPartner = { id: unknown; name: unknown };

class ValidationError extends Error { constructor(message: string, readonly code = "validation_error") { super(message); } }
class AmbiguousRemoteError extends Error { constructor(message: string, readonly code = "remote_ambiguity") { super(message); } }
class RemoteRequestError extends Error { constructor(message: string, readonly code = "remote_request_failed") { super(message); } }

const response = (body: Record<string, unknown>, status: number) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });
const safeInteger = (value: unknown, label: string) => {
  const parsed = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > odooIntegerMax) throw new ValidationError(`${label} is outside supported integer bounds`);
  return parsed;
};
const constantTimeEquals = (received: string | null, expected: string) => {
  if (!received || received.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
};
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const plainHtml = (value: unknown) => {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value !== "string") throw new ValidationError("Description must be text");
  return `<p>${escapeHtml(value).replaceAll("\n", "<br>")}</p>`;
};
const projectIdFromPayload = (payload: WebhookPayload) => {
  const source = payload.type === "DELETE" ? payload.old_record : payload.record;
  if (!source || typeof source !== "object") throw new ValidationError("Event record is missing");
  const id = safeInteger(source.id, "Event project ID");
  const recordId = payload.record?.id;
  const oldId = payload.old_record?.id;
  if (recordId !== undefined && safeInteger(recordId, "Event record ID") !== id) throw new ValidationError("Event record IDs do not match");
  if (oldId !== undefined && safeInteger(oldId, "Event old record ID") !== id) throw new ValidationError("Event record IDs do not match");
  return id;
};
const parsePayload = (value: unknown): WebhookPayload => {
  if (!value || typeof value !== "object") throw new ValidationError("Request body must be an object");
  const payload = value as Partial<WebhookPayload>;
  if (!["INSERT", "UPDATE", "DELETE"].includes(payload.type ?? "") || payload.schema !== "public" || payload.table !== "projects") throw new ValidationError("Unsupported webhook event");
  if ((payload.record !== null && (typeof payload.record !== "object" || Array.isArray(payload.record))) || (payload.old_record !== null && (typeof payload.old_record !== "object" || Array.isArray(payload.old_record)))) throw new ValidationError("Invalid webhook record");
  return payload as WebhookPayload;
};
const parseEnabled = () => Deno.env.get("ODOO_SYNC_ENABLED") === "true";
const parseOrigin = (value: string) => {
  let url: URL;
  try { url = new URL(value); } catch { throw new ValidationError("Odoo origin is invalid"); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new ValidationError("Odoo origin must be a clean HTTPS origin");
  return url.origin;
};
const parsePositiveMap = (value: string | undefined, label: string) => {
  if (!value) return {} as Record<string, number>;
  let mapping: unknown;
  try { mapping = JSON.parse(value); } catch { throw new ValidationError(`${label} is invalid JSON`); }
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) throw new ValidationError(`${label} must be an object`);
  return Object.fromEntries(Object.entries(mapping).map(([key, id]) => [key, safeInteger(id, `${label} value`)]));
};
const sourceHosts = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new ValidationError("SUPABASE_URL is missing");
  const hosts = new Set([new URL(supabaseUrl).hostname.toLowerCase()]);
  const extra = Deno.env.get("ODOO_SYNC_EXTRA_IMAGE_HOSTS");
  if (extra) for (const host of extra.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean)) {
    if (!/^[a-z0-9.-]+$/.test(host)) throw new ValidationError("Extra image host is invalid");
    hosts.add(host);
  }
  return hosts;
};
const configuredConnection = () => {
  const origin = Deno.env.get("ODOO_JSON2_URL");
  const database = Deno.env.get("ODOO_DATABASE")?.trim() || undefined;
  const apiKey = Deno.env.get("ODOO_API_KEY");
  if (!origin || !apiKey) throw new ValidationError("Odoo configuration is incomplete");
  return { origin: parseOrigin(origin), database, apiKey };
};
const configuredProjectSync = () => ({ categories: parsePositiveMap(Deno.env.get("ODOO_CATEGORY_MAPPINGS"), "ODOO_CATEGORY_MAPPINGS"), hosts: sourceHosts() });
const hashUrl = async (url: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url))), (byte) => byte.toString(16).padStart(2, "0")).join("");
const canonicalUrl = (value: unknown, hosts: Set<string>) => {
  if (typeof value !== "string") throw new ValidationError("Image URL must be text");
  let url: URL;
  try { url = new URL(value); } catch { throw new ValidationError("Image URL is invalid"); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || !hosts.has(url.hostname.toLowerCase())) throw new ValidationError("Image URL is not an allowed public HTTPS URL");
  return url.toString();
};
const relationalId = (value: unknown) => Array.isArray(value) ? value[0] : value;
const relationIds = (value: unknown) => Array.isArray(value) ? value.map((id) => safeInteger(id, "Gallery attachment ID")) : [];
const markerFor = async (projectId: number, url: string) => `mocklab-project:${projectId}:${await hashUrl(url)}`;
const collaboratorMarker = (projectId: number, collaboratorId: string) => `[mocklab:${projectId}:${collaboratorId}]`;
const parseCollaboratorMarker = (value: unknown, projectId: number) => {
  if (typeof value !== "string") return null;
  const match = /\[mocklab:(\d+):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\]$/i.exec(value);
  return match && Number(match[1]) === projectId ? match[2].toLowerCase() : null;
};
const validateCollaborators = (value: unknown) => {
  if (value === null || value === undefined) return [] as Collaborator[];
  if (!Array.isArray(value)) throw new ValidationError("Collaborators must be an array");
  const collaborators: Collaborator[] = value.map((entry): Collaborator => {
    if (!entry || typeof entry !== "object") throw new ValidationError("Collaborator must be an object");
    const collaborator = entry as Record<string, unknown>;
    if (typeof collaborator.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(collaborator.id)) throw new ValidationError("Collaborator ID must be a UUID");
    if (typeof collaborator.name !== "string" || !collaborator.name.trim() || typeof collaborator.profession !== "string" || !collaborator.profession.trim()) throw new ValidationError("Collaborator name and profession are required");
    if (collaborator.website !== undefined && collaborator.website !== null && typeof collaborator.website !== "string") throw new ValidationError("Collaborator website must be text");
    const website: string | false = typeof collaborator.website === "string" && collaborator.website.trim() ? collaborator.website.trim() : false;
    return { id: collaborator.id.toLowerCase(), name: collaborator.name.trim(), profession: collaborator.profession.trim(), website };
  });
  if (new Set(collaborators.map(({ id }) => id)).size !== collaborators.length) throw new ValidationError("Collaborator IDs must be unique");
  return collaborators;
};
const googleMapsHtml = (value: string) => {
  let url: URL;
  try { url = new URL(value); } catch { throw new ValidationError("Google Maps URL is invalid"); }
  const host = url.hostname.toLowerCase();
  const isGoogleMapsHost = ["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl"].includes(host);
  const isLegacyShortLink = host === "goo.gl" && (url.pathname === "/maps" || url.pathname.startsWith("/maps/"));
  if (url.protocol !== "https:" || url.username || url.password || url.port || (!isGoogleMapsHost && !isLegacyShortLink)) throw new ValidationError("Google Maps URL is not an allowed HTTPS link");
  const normalized = url.toString();
  const escaped = escapeHtml(normalized);
  return `<p><a href="${escaped}">${escaped}</a></p>`;
};
const projectValues = (project: Project, projectId: number, categories: Record<string, number>) => {
  if (typeof project.title !== "string" || !project.title.trim()) throw new ValidationError("Project title is required");
  const category = project.category;
  if (category !== null && category !== undefined && typeof category !== "string") throw new ValidationError("Category must be text");
  const categoryId = category?.trim() ? categories[category.trim()] : undefined;
  if (category?.trim() && !categoryId) throw new ValidationError("Project category is not mapped to Odoo", "unmapped_category");
  const year = project.year === null || project.year === undefined ? "" : String(project.year).trim();
  if (year && !/^\d{4}$/.test(year)) throw new ValidationError("Year must have four digits");
  const publications = project.publications;
  if (publications !== null && publications !== undefined && (typeof publications !== "number" || !Number.isInteger(publications) || publications < 1 || publications > 4)) throw new ValidationError("Publications must be between one and four");
  const mapValue = project.googleMaps;
  let googleMaps: string | false = false;
  if (typeof mapValue === "string" && mapValue.trim()) {
    try {
      const coordinates = JSON.parse(mapValue) as { lat?: unknown; lng?: unknown };
      if (!coordinates || typeof coordinates !== "object" || Array.isArray(coordinates)) throw new Error();
      const coordinate = (value: unknown) => {
        if (typeof value === "number") return value;
        if (typeof value === "string" && value.trim()) return Number(value);
        return Number.NaN;
      };
      const lat = coordinate(coordinates.lat); const lng = coordinate(coordinates.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error();
      googleMaps = `<p><a href="https://www.google.com/maps?q=${lat},${lng}">${lat},${lng}</a></p>`;
    } catch {
      googleMaps = googleMapsHtml(mapValue);
    }
  }
  const description = plainHtml(project.description);
  return { name: project.title.trim(), x_mocklab_id: projectId, description, x_studio_html_field_292_1jh13q299: description, x_studio_palabras_clave: typeof project.keywords === "string" && project.keywords.trim() ? project.keywords.trim() : false, x_web: typeof project.weblink === "string" && project.weblink.trim() ? project.weblink.trim() : false, x_usar_ia: project.requiredAI === true, x_num_publicaciones: publications ?? false, x_studio_google_maps: googleMaps, x_mostrar_mapa: project.showMap === true, x_studio_ano: year ? Number(year) : false, x_studio_tipologia: [[6, 0, categoryId ? [categoryId] : []]] };
};

class OdooClient {
  constructor(private readonly origin: string, private readonly database: string | undefined, private readonly apiKey: string, private readonly deadline: number) {}
  async call<T>(model: string, method: string, body: Record<string, unknown>): Promise<T> {
    const remaining = this.deadline - Date.now();
    if (remaining <= 0) throw new RemoteRequestError("Synchronization deadline exceeded");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(requestTimeoutMs, remaining));
    try {
      const result = await fetch(`${this.origin}/json/2/${model}/${method}`, { method: "POST", redirect: "error", headers: { Authorization: `Bearer ${this.apiKey}`, ...(this.database ? { "X-Odoo-Database": this.database } : {}), "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      if (!result.ok) throw new RemoteRequestError(`Odoo ${method} returned HTTP ${result.status}`, "remote_http_error");
      return await result.json() as T;
    } catch (error) {
      if (error instanceof RemoteRequestError) throw error;
      throw new RemoteRequestError(`Odoo ${method} request failed`, "remote_timeout_or_network_error");
    } finally { clearTimeout(timer); }
  }
}
const expectTrue = (value: unknown, action: string) => { if (value !== true) throw new AmbiguousRemoteError(`Odoo did not confirm ${action}`); };
const searchProjects = (odoo: OdooClient, projectId: number) => odoo.call<OdooProject[]>("project.project", "search_read", { domain: [["x_mocklab_id", "=", projectId]], fields: ["id", "x_mocklab_id", "x_studio_galeria_1"], limit: 2, context: { active_test: false } });
const oneProject = async (odoo: OdooClient, projectId: number) => {
  const matches = await searchProjects(odoo, projectId);
  if (matches.length > 1) throw new AmbiguousRemoteError("Multiple Odoo projects use this Galia ID");
  if (!matches.length) return null;
  if (safeInteger(matches[0].x_mocklab_id, "Odoo project external ID") !== projectId) throw new AmbiguousRemoteError("Odoo project identity mismatch");
  return matches[0];
};
const loadProject = async (supabase: ReturnType<typeof createClient>, projectId: number) => {
  const { data, error } = await supabase.from("projects").select(projectFields).eq("id", projectId).maybeSingle();
  if (error) throw new RemoteRequestError("Current project read failed");
  if (data && safeInteger(data.id, "Current project ID") !== projectId) throw new ValidationError("Current project ID mismatch");
  return data as Project | null;
};
const resolveProjectCustomer = async (supabase: ReturnType<typeof createClient>, ownerUUID: unknown) => {
  if (typeof ownerUUID !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerUUID)) throw new ValidationError("Project owner UUID is missing or invalid", "missing_project_owner");
  const { data, error } = await supabase.from("userData").select("odoo_id").eq("uid", ownerUUID).maybeSingle();
  if (error) throw new RemoteRequestError("Project owner read failed", "project_owner_read_failed");
  if (!data) throw new ValidationError("Project owner account is missing", "missing_project_owner_account");
  try {
    return safeInteger(data.odoo_id, "Project owner Odoo customer ID");
  } catch (error) {
    if (error instanceof ValidationError) throw new ValidationError("Project owner Odoo customer ID is missing or invalid", "invalid_project_customer_id");
    throw error;
  }
};
const reconcileGallery = async (odoo: OdooClient, projectId: number, remoteId: number, remote: OdooProject, urls: string[]) => {
  const galleryIds = new Set(relationIds(remote.x_studio_galeria_1));
  const prefix = `mocklab-project:${projectId}:%`;
  const attachments = await odoo.call<Attachment[]>("ir.attachment", "search_read", { domain: [["name", "=like", prefix], ["type", "=", "url"], ["res_model", "=", "project.project"], ["res_id", "=", remoteId]], fields: ["id", "name", "type", "url", "res_model", "res_id"], limit: 1000 });
  const desired = new Map(await Promise.all(urls.map(async (url) => [url, await markerFor(projectId, url)] as const)));
  const owned = new Map<string, number>();
  for (const attachment of attachments) {
    const id = safeInteger(attachment.id, "Odoo attachment ID");
    if (attachment.type !== "url" || attachment.res_model !== "project.project" || safeInteger(attachment.res_id, "Attachment project ID") !== remoteId || typeof attachment.name !== "string" || typeof attachment.url !== "string") continue;
    const expected = await markerFor(projectId, attachment.url);
    if (attachment.name !== expected) continue;
    if (owned.has(attachment.url)) throw new AmbiguousRemoteError("Duplicate owned gallery attachment");
    owned.set(attachment.url, id);
  }
  for (const [url, id] of owned) if (galleryIds.has(id) && !desired.has(url)) expectTrue(await odoo.call<boolean>("project.project", "write", { ids: [remoteId], vals: { x_studio_galeria_1: [[3, id]] } }), "gallery relation removal");
  for (const [url, name] of desired) {
    const existing = owned.get(url);
    if (existing) {
      if (!galleryIds.has(existing)) expectTrue(await odoo.call<boolean>("project.project", "write", { ids: [remoteId], vals: { x_studio_galeria_1: [[4, existing]] } }), "gallery relation restore");
      continue;
    }
    const created = await odoo.call<unknown>("ir.attachment", "create", { vals_list: [{ name, type: "url", url, res_model: "project.project", res_id: remoteId }] });
    if (!Array.isArray(created) || created.length !== 1) throw new AmbiguousRemoteError("Odoo did not return one gallery attachment ID");
    const attachmentId = safeInteger(created[0], "Odoo attachment ID");
    expectTrue(await odoo.call<boolean>("project.project", "write", { ids: [remoteId], vals: { x_studio_galeria_1: [[4, attachmentId]] } }), "gallery relation add");
  }
};
const matchingPartner = async (odoo: OdooClient, name: string) => {
  const matches = await odoo.call<OdooPartner[]>("res.partner", "search_read", { domain: [["name", "=", name]], fields: ["id", "name"], limit: 2 });
  if (matches.length === 0 || matches.length >= 2) return null;
  const partner = matches[0];
  if (partner.name !== name) throw new AmbiguousRemoteError("Odoo partner identity mismatch");
  return safeInteger(partner.id, "Odoo partner ID");
};
const reconcileCollaborators = async (odoo: OdooClient, correlationId: string, projectId: number, remoteId: number, collaborators: Collaborator[]) => {
  const existing = await odoo.call<OdooCollaborator[]>("x_proyecto_colaborador", "search_read", { domain: [["x_proyecto_id", "=", remoteId]], fields: ["id", "x_name", "x_partner_id", "x_origen", "x_estado_validacion"], limit: 1000 });
  const owned = new Map<string, OdooCollaborator>();
  for (const row of existing) {
    const collaboratorId = parseCollaboratorMarker(row.x_name, projectId);
    if (!collaboratorId) continue;
    if (owned.has(collaboratorId)) throw new AmbiguousRemoteError("Duplicate owned collaborator marker");
    owned.set(collaboratorId, row);
  }
  const sourceIds = new Set(collaborators.map(({ id }) => id));
  for (const [collaboratorId, row] of owned) {
    if (sourceIds.has(collaboratorId) || row.x_origen !== "formulario") continue;
    expectTrue(await odoo.call<boolean>("x_proyecto_colaborador", "unlink", { ids: [safeInteger(row.id, "Odoo collaborator ID")] }), "owned collaborator removal");
  }
  let unmatchedCount = 0;
  for (const [index, collaborator] of collaborators.entries()) {
    const row = owned.get(collaborator.id);
    const partnerId = await matchingPartner(odoo, collaborator.name);
    if (!partnerId) {
      unmatchedCount += 1;
      if (row?.x_origen === "formulario") expectTrue(await odoo.call<boolean>("x_proyecto_colaborador", "unlink", { ids: [safeInteger(row.id, "Odoo collaborator ID")] }), "owned collaborator removal");
      continue;
    }
    const values = { x_proyecto_id: remoteId, x_partner_id: partnerId, x_name: `${collaborator.name} ${collaboratorMarker(projectId, collaborator.id)}`, x_profesion: collaborator.profession, x_secuencia: index + 1, x_web_declarada: collaborator.website };
    if (!row) {
      const created = await odoo.call<unknown>("x_proyecto_colaborador", "create", { vals_list: [{ ...values, x_origen: "formulario", x_estado_validacion: "confirmado" }] });
      if (!Array.isArray(created) || created.length !== 1) throw new AmbiguousRemoteError("Odoo did not return one collaborator ID");
      safeInteger(created[0], "Odoo collaborator ID");
    } else if (row.x_origen === "formulario") {
      if (safeInteger(relationalId(row.x_partner_id), "Existing collaborator partner ID") !== partnerId) throw new AmbiguousRemoteError("Owned collaborator partner differs from the unique name match");
      expectTrue(await odoo.call<boolean>("x_proyecto_colaborador", "write", { ids: [safeInteger(row.id, "Odoo collaborator ID")], vals: values }), "owned collaborator update");
    }
  }
  if (unmatchedCount > 0) console.warn("Odoo project sync skipped collaborators without one exact partner match", { correlationId, projectId, unmatchedCount });
};
const deleteProject = async (odoo: OdooClient, projectId: number) => {
  const remote = await oneProject(odoo, projectId);
  if (!remote) return;
  expectTrue(await odoo.call<boolean>("project.project", "unlink", { ids: [safeInteger(remote.id, "Odoo project ID")] }), "project deletion");
};
const syncProject = async (supabase: ReturnType<typeof createClient>, odoo: OdooClient, correlationId: string, projectId: number) => {
  const project = await loadProject(supabase, projectId);
  if (!project) return deleteProject(odoo, projectId);
  const settings = configuredProjectSync();
  const baseValues = projectValues(project, projectId, settings.categories);
  const urls = (project.image_data === null || project.image_data === undefined ? [] : Array.isArray(project.image_data) ? project.image_data : (() => { throw new ValidationError("image_data must be an array"); })()).map((image) => canonicalUrl(image && typeof image === "object" ? (image as Record<string, unknown>).url : image, settings.hosts));
  if (new Set(urls).size !== urls.length) throw new ValidationError("Image URLs must be unique");
  const collaborators = validateCollaborators(project.projectCollaborators);
  const customerId = await resolveProjectCustomer(supabase, project.user);
  const values = { ...baseValues, partner_id: customerId };
  let remote = await oneProject(odoo, projectId);
  if (remote) {
    const remoteId = safeInteger(remote.id, "Odoo project ID");
    expectTrue(await odoo.call<boolean>("project.project", "write", { ids: [remoteId], vals: values }), "project update");
  } else {
    if (!await loadProject(supabase, projectId)) return deleteProject(odoo, projectId);
    const created = await odoo.call<unknown>("project.project", "create", { vals_list: [values] });
    if (!Array.isArray(created) || created.length !== 1) throw new AmbiguousRemoteError("Odoo did not return one project ID");
    const remoteId = safeInteger(created[0], "Odoo project ID");
    remote = await oneProject(odoo, projectId);
    if (!remote || safeInteger(remote.id, "Odoo project ID") !== remoteId) throw new AmbiguousRemoteError("Created Odoo project cannot be verified");
  }
  const remoteId = safeInteger(remote!.id, "Odoo project ID");
  await reconcileGallery(odoo, projectId, remoteId, remote!, urls);
  await reconcileCollaborators(odoo, correlationId, projectId, remoteId, collaborators);
  if (!await loadProject(supabase, projectId)) await deleteProject(odoo, projectId);
};

Deno.serve(async (request) => {
  const correlationId = crypto.randomUUID();
  let projectId: number | null = null;
  let eventType: WebhookEvent | null = null;
  if (request.method !== "POST") {
    console.error("Odoo project sync rejected", { correlationId, eventType, projectId, reason: "method_not_allowed", status: 405 });
    return response({ error: "Method not allowed", correlationId }, 405);
  }
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBodyBytes)) return response({ error: "Request body is too large", correlationId }, 413);
  const expectedSecret = Deno.env.get("ODOO_PROJECT_SYNC_WORKER_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!expectedSecret || !serviceRoleKey || !constantTimeEquals(token, serviceRoleKey) || !constantTimeEquals(request.headers.get("x-odoo-sync-worker-secret"), expectedSecret)) return response({ error: "Forbidden", correlationId }, 403);
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBodyBytes) return response({ error: "Request body is too large", correlationId }, 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new ValidationError("Request body is not valid JSON", "malformed_json"); }
    const payload = parsePayload(body);
    eventType = payload.type;
    projectId = projectIdFromPayload(payload);
    if (!parseEnabled()) return new Response(null, { status: 204 });
    const connection = configuredConnection();
    const odoo = new OdooClient(connection.origin, connection.database, connection.apiKey, Date.now() + runBudgetMs);
    if (payload.type === "DELETE") {
      await deleteProject(odoo, projectId);
      return response({ status: "synced", correlationId }, 200);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new ValidationError("SUPABASE_URL is missing");
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    await syncProject(supabase, odoo, correlationId, projectId);
    return response({ status: "synced", correlationId }, 200);
  } catch (error) {
    const status = error instanceof ValidationError ? 400 : error instanceof AmbiguousRemoteError || error instanceof RemoteRequestError ? 502 : 500;
    const reason = error instanceof ValidationError || error instanceof AmbiguousRemoteError || error instanceof RemoteRequestError ? error.code : "unexpected_error";
    console.error("Odoo project sync failed", { correlationId, eventType, projectId, reason, status });
    return response({ error: "Synchronization failed", correlationId }, status);
  }
});
