/* eslint-disable */
// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NAS_URL = Deno.env.get("NAS_PROXY_URL")!;
const NAS_KEY = Deno.env.get("NAS_PROXY_API_KEY")!;

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
      },
    });
  }

  const url = new URL(req.url);
  const photoId = url.searchParams.get("id");
  const sizeParam = url.searchParams.get("size") ?? "baja_ma";
  const token = url.searchParams.get("token");

  const ALLOWED_SIZES = ["min", "baja_ma"];
  if (!ALLOWED_SIZES.includes(sizeParam)) {
    return new Response("Bad Request", { status: 400 });
  }
  const size = sizeParam;

  if (!photoId || !token) {
    return new Response("Bad Request", { status: 400 });
  }

  // Validate user session using anon key + token as Authorization header
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser(token);

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Use service role for DB queries (bypasses RLS)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Check admin role
  const { data: userData } = await supabaseAdmin
    .from("userData")
    .select("role")
    .eq("uid", user.id)
    .single();

  if (userData?.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  // Get photo path from DB
  const { data: photo, error: photoError } = await supabaseAdmin
    .from("project_photos")
    .select("nas_base_path, project_id, filename")
    .eq("id", photoId)
    .single();

  if (photoError || !photo) {
    return new Response("Not Found", { status: 404 });
  }

  // Fetch image from NAS (server-side, API key never leaves the server)
  const path = `/${photo.nas_base_path}/${photo.project_id}_${size}/${photo.filename}`;
  const nasUrl = `${NAS_URL}/serve?path=${encodeURIComponent(path)}&apikey=${NAS_KEY}`;

  const imageRes = await fetch(nasUrl);
  if (!imageRes.ok) {
    return new Response("Image not found", { status: 404 });
  }

  return new Response(imageRes.body, {
    headers: {
      "Content-Type": imageRes.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
