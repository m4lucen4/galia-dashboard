/* eslint-disable */
// deno-lint-ignore-file
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const gaPropertyId = Deno.env.get("GA_PROPERTY_ID")!;
const gaServiceAccountJson = Deno.env.get("GA_SERVICE_ACCOUNT")!;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function uint8ToBase64url(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function strToBase64url(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function getGoogleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: sa.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const signingInput =
    `${strToBase64url(JSON.stringify(header))}.${strToBase64url(JSON.stringify(payload))}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${uint8ToBase64url(new Uint8Array(signatureBytes))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get Google access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: { projectId: string; startDate: string; endDate: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Bad Request" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { projectId, startDate, endDate } = body;
  if (!projectId || !startDate || !endDate) {
    return new Response(JSON.stringify({ error: "Bad Request: missing fields" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: userData } = await supabaseAdmin
    .from("userData")
    .select("role")
    .eq("uid", user.id)
    .single();

  const isAdmin = userData?.role === "admin";

  if (!isAdmin) {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user", user.id)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  let accessToken: string;
  try {
    const sa: ServiceAccount = JSON.parse(gaServiceAccountJson);
    accessToken = await getGoogleAccessToken(sa);
  } catch (err) {
    console.error("Error getting Google access token:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const gaRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${gaPropertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "sessions" },
        ],
        dateRanges: [{ startDate, endDate }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "EXACT",
              value: `/project/${projectId}`,
            },
          },
        },
        metricAggregations: ["TOTAL"],
      }),
    },
  );

  if (!gaRes.ok) {
    const errText = await gaRes.text();
    console.error("GA API error:", gaRes.status, errText);
    return new Response(JSON.stringify({ error: "Error querying analytics" }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const gaData = await gaRes.json();

  const rows = (gaData.rows ?? []).map((row: any) => ({
    date: row.dimensionValues?.[0]?.value ?? "",
    screenPageViews: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
    activeUsers: parseInt(row.metricValues?.[1]?.value ?? "0", 10),
    sessions: parseInt(row.metricValues?.[2]?.value ?? "0", 10),
  }));

  const totalsRow = gaData.totals?.[0];
  const totals = {
    screenPageViews: parseInt(totalsRow?.metricValues?.[0]?.value ?? "0", 10),
    activeUsers: parseInt(totalsRow?.metricValues?.[1]?.value ?? "0", 10),
    sessions: parseInt(totalsRow?.metricValues?.[2]?.value ?? "0", 10),
  };

  return new Response(JSON.stringify({ rows, totals }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
