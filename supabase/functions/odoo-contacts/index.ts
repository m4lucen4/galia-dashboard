import { createClient } from "jsr:@supabase/supabase-js@2";

const pageSize = 100;
const maxContacts = 1_000;
const requestTimeoutMs = 10_000;
const totalTimeoutMs = 30_000;
const allowedOrigins = new Set([
  "https://mocklab.app",
  "https://www.mocklab.app",
  "http://localhost:5173",
]);

type Contact = { id: number; name: string };

class RequestError extends Error {
  constructor(
    readonly code: "configuration_error" | "remote_request_failed" | "remote_response_invalid",
  ) {
    super(code);
  }
}

const corsHeaders = (request: Request): Record<string, string> => {
  const origin = request.headers.get("origin");

  return origin && allowedOrigins.has(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        Vary: "Origin",
      }
    : {};
};

const response = (request: Request, body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });

const parseOrigin = (value: string) => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new RequestError("configuration_error");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new RequestError("configuration_error");
  }

  return url.origin;
};

const configuredConnection = () => {
  const url = Deno.env.get("ODOO_JSON2_URL");
  const apiKey = Deno.env.get("ODOO_API_KEY");
  const database = Deno.env.get("ODOO_DATABASE")?.trim();

  if (!url || !apiKey) throw new RequestError("configuration_error");

  return { origin: parseOrigin(url), apiKey, database };
};

const parseContact = (value: unknown): Contact => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestError("remote_response_invalid");
  }

  const contact = value as { id?: unknown; name?: unknown };
  if (
    !Number.isSafeInteger(contact.id) ||
    (contact.id as number) < 1 ||
    typeof contact.name !== "string"
  ) {
    throw new RequestError("remote_response_invalid");
  }

  return { id: contact.id, name: contact.name };
};

const fetchContactsPage = async (
  origin: string,
  apiKey: string,
  database: string | undefined,
  offset: number,
  limit: number,
  deadline: number,
) => {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) throw new RequestError("remote_request_failed");

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Math.min(requestTimeoutMs, remainingMs),
  );

  try {
    const result = await fetch(`${origin}/json/2/res.partner/search_read`, {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(database ? { "X-Odoo-Database": database } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: [],
        fields: ["id", "name"],
        offset,
        limit,
        order: "id asc",
      }),
      signal: controller.signal,
    });

    if (!result.ok) throw new RequestError("remote_request_failed");

    const payload: unknown = await result.json();
    if (!Array.isArray(payload)) throw new RequestError("remote_response_invalid");
    if (payload.length > limit) throw new RequestError("remote_response_invalid");
    if (Date.now() >= deadline) throw new RequestError("remote_request_failed");

    return payload.map(parseContact);
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError("remote_request_failed");
  } finally {
    clearTimeout(timer);
  }
};

const isReservedToken = (token: string, reservedToken: string | undefined) => {
  if (!reservedToken || token.length !== reservedToken.length) return false;

  let difference = 0;
  for (let index = 0; index < token.length; index += 1) {
    difference |= token.charCodeAt(index) ^ reservedToken.charCodeAt(index);
  }

  return difference === 0;
};

Deno.serve(async (request) => {
  const headers = corsHeaders(request);
  const origin = request.headers.get("origin");

  if (origin && !headers["Access-Control-Allow-Origin"]) {
    return response(request, { error: "Origin is not allowed" }, 403);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return response(request, { error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (
    !token ||
    !supabaseUrl ||
    !anonKey ||
    isReservedToken(token, anonKey) ||
    isReservedToken(token, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))
  ) {
    return response(request, { error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, anonKey);
  let user: { is_anonymous?: boolean } | null = null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error) user = data.user;
  } catch {
    return response(request, { error: "Unauthorized" }, 401);
  }

  if (!user || user.is_anonymous) {
    return response(request, { error: "Unauthorized" }, 401);
  }

  try {
    const connection = configuredConnection();
    const contacts: Contact[] = [];
    let pages = 0;
    let complete = false;
    let previousId = 0;
    const deadline = Date.now() + totalTimeoutMs;

    while (contacts.length < maxContacts) {
      const limit = Math.min(pageSize, maxContacts - contacts.length);
      const page = await fetchContactsPage(
        connection.origin,
        connection.apiKey,
        connection.database,
        contacts.length,
        limit,
        deadline,
      );
      pages += 1;

      for (const contact of page) {
        if (contact.id <= previousId) {
          throw new RequestError("remote_response_invalid");
        }
        previousId = contact.id;
      }
      contacts.push(...page);

      if (page.length < limit) {
        complete = true;
        break;
      }
    }

    if (!complete) {
      const nextPage = await fetchContactsPage(
        connection.origin,
        connection.apiKey,
        connection.database,
        contacts.length,
        1,
        deadline,
      );
      pages += 1;
      if (nextPage.some((contact) => contact.id <= previousId)) {
        throw new RequestError("remote_response_invalid");
      }
      complete = nextPage.length === 0;
    }

    return response(
      request,
      {
        status: complete ? "complete" : "incomplete",
        contacts,
        pagination: { order: "id asc", pageSize, maxContacts, pages },
      },
      200,
    );
  } catch (error) {
    const status = error instanceof RequestError && error.code === "configuration_error" ? 500 : 502;
    const code = error instanceof RequestError ? error.code : "unexpected_error";
    console.error("Odoo contact listing failed", { code, status });
    return response(request, { error: "Contact listing failed" }, status);
  }
});
