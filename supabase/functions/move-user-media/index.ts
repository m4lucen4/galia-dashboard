import { createClient } from "jsr:@supabase/supabase-js@2";

const bucketName = "user-media";
const protectedProjectRoot = "/proyectos";
const listLimit = 1_000;
const linkPageSize = 1_000;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type MoveErrorCode = "referenced" | "validation" | "conflict" | "partial" | "failed";

class MoveError extends Error {
  constructor(readonly code: MoveErrorCode, message: string) {
    super(message);
  }
}

type MoveRequest = {
  items?: unknown;
  destinationPath?: unknown;
};

type StorageItem = { name: string };
type LinkRow = { image_data?: unknown; supabase_url?: unknown };
type MoveRecord = { source: string; destination: string };
type PaginatedQuery = {
  range: (from: number, to: number) => PromiseLike<{ data: LinkRow[] | null; error: unknown }>;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const normalizePath = (value: unknown) => {
  if (typeof value !== "string" || !value.startsWith("/") || value.includes("\\")) {
    throw new MoveError("validation", "Invalid media path");
  }

  if (value === "/") return value;

  const segments = value.split("/").slice(1);
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        [...segment].some((character) => character.charCodeAt(0) < 32),
    )
  ) {
    throw new MoveError("validation", "Invalid media path");
  }

  const path = `/${segments.join("/")}`;
  if (path === protectedProjectRoot || path.startsWith(`${protectedProjectRoot}/`)) {
    throw new MoveError("validation", "Project media cannot be moved");
  }

  return path;
};

const isImagePath = (path: string) =>
  /\.(avif|bmp|gif|heic|jpe?g|png|svg|tiff?|webp)$/i.test(path);

const parentPath = (path: string) => path.slice(0, path.lastIndexOf("/")) || "/";

const fileName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

const parseRequest = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MoveError("validation", "Invalid move request");
  }

  const { items, destinationPath } = value as MoveRequest;
  if (!Array.isArray(items) || items.length === 0) {
    throw new MoveError("validation", "Select at least one image");
  }

  const sources = items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new MoveError("validation", "Invalid selected image");
    }

    const source = normalizePath((item as { path?: unknown }).path);
    if (!isImagePath(source) || fileName(source) === ".keep") {
      throw new MoveError("validation", "Only image files can be moved");
    }
    return source;
  });

  const destination = normalizePath(destinationPath);
  const uniqueSources = new Set(sources);
  if (uniqueSources.size !== sources.length) {
    throw new MoveError("validation", "Duplicate selected image");
  }

  if (sources.some((source) => parentPath(source) === destination)) {
    throw new MoveError("validation", "Destination cannot be an image source folder");
  }

  const moves = sources.map((source) => ({
    source,
    destination: destination === "/" ? `/${fileName(source)}` : `${destination}/${fileName(source)}`,
  }));
  const targetPaths = new Set(moves.map((move) => move.destination));
  if (targetPaths.size !== moves.length) {
    throw new MoveError("conflict", "Multiple images have the same destination name");
  }

  return { destination, sources, moves };
};

const getPublicMediaPath = (value: unknown, supabaseUrl: string) => {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    if (url.origin !== new URL(supabaseUrl).origin) return null;

    const match = url.pathname.match(
      /^\/storage\/v1\/(?:object|render\/image)\/public\/user-media\/(.+)$/,
    );
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        throw new MoveError("failed", "Unable to inspect linked images");
      }
    }
    if (url.pathname.includes("user-media")) {
      throw new MoveError("failed", "Unable to inspect linked images");
    }
  } catch {
    if (value.includes("user-media")) {
      throw new MoveError("failed", "Unable to inspect linked images");
    }
  }

  return null;
};

const containsReferencedPath = (
  value: unknown,
  sourcePaths: Set<string>,
  supabaseUrl: string,
): boolean => {
  if (typeof value === "string") {
    return sourcePaths.has(getPublicMediaPath(value, supabaseUrl) ?? "");
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsReferencedPath(entry, sourcePaths, supabaseUrl));
  }
  if (!value || typeof value !== "object") return false;

  return Object.values(value).some((entry) =>
    containsReferencedPath(entry, sourcePaths, supabaseUrl),
  );
};

const getAllLinkRows = async (
  query: () => PaginatedQuery,
) => {
  const rows: LinkRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await query().range(from, from + linkPageSize - 1);
    if (error || !data) throw new MoveError("failed", "Unable to inspect linked images");

    rows.push(...(data as LinkRow[]));
    if (data.length < linkPageSize) return rows;
    from += linkPageSize;
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ status: "validation", message: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ status: "failed", message: "Unauthorized" }, 401);
  }

  const authenticatedClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await authenticatedClient.auth.getUser();
  if (authError || !authData.user || authData.user.is_anonymous) {
    return json({ status: "failed", message: "Unauthorized" }, 401);
  }

  try {
    const { destination, sources, moves } = parseRequest(await request.json());
    const userPrefix = `${authData.user.id}/`;
    const fullSources = sources.map((source) => `${authData.user.id}${source}`);
    const fullDestination = `${authData.user.id}${destination}`;
    const sourceFolders = [...new Set(sources.map(parentPath))];
    const fullMoves = moves.map((move) => ({
      source: `${authData.user.id}${move.source}`,
      destination: `${authData.user.id}${move.destination}`,
    }));

    if (
      fullSources.some((source) => !source.startsWith(userPrefix)) ||
      !fullDestination.startsWith(userPrefix)
    ) {
      throw new MoveError("validation", "Media path is outside the caller root");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const [projects, photos, previews, destinationContents, sourceContents] = await Promise.all([
      getAllLinkRows(() => admin.from("projects").select("image_data")),
      getAllLinkRows(() => admin.from("project_photos").select("supabase_url")),
      getAllLinkRows(() => admin.from("projectsPreview").select("image_data")),
      admin.storage.from(bucketName).list(fullDestination, { limit: listLimit }),
      Promise.all(
        sourceFolders.map(async (folder) => ({
          folder,
          result: await admin.storage
            .from(bucketName)
            .list(`${authData.user.id}${folder}`, { limit: listLimit }),
        })),
      ),
    ]);

    if (destinationContents.error || !destinationContents.data) {
      throw new MoveError("failed", "Unable to inspect destination folder");
    }
    if (destinationContents.data.length === listLimit) {
      throw new MoveError("validation", "Destination folder is too large to verify safely");
    }
    if (destination !== "/" && destinationContents.data.length === 0) {
      throw new MoveError("validation", "Destination folder does not exist");
    }
    for (const { folder, result } of sourceContents) {
      if (result.error || !result.data || result.data.length === listLimit) {
        throw new MoveError("failed", "Unable to inspect selected image folder");
      }

      const sourceNames = new Set(
        sources.filter((source) => parentPath(source) === folder).map(fileName),
      );
      if ([...sourceNames].some((name) => !result.data.some((item) => item.name === name))) {
        throw new MoveError("validation", "Selected image does not exist");
      }
    }

    const sourcePathSet = new Set(fullSources);
    if (
      [...projects, ...photos, ...previews].some((row) =>
        containsReferencedPath(row, sourcePathSet, supabaseUrl),
      )
    ) {
      throw new MoveError("referenced", "One or more selected images are linked to a project");
    }

    const existingNames = new Set(destinationContents.data.map((item: StorageItem) => item.name));
    if (moves.some((move) => existingNames.has(fileName(move.destination)))) {
      throw new MoveError("conflict", "A destination image already exists");
    }

    const [latestProjects, latestPhotos, latestPreviews, latestDestinationContents, latestSourceContents] =
      await Promise.all([
        getAllLinkRows(() => admin.from("projects").select("image_data")),
        getAllLinkRows(() => admin.from("project_photos").select("supabase_url")),
        getAllLinkRows(() => admin.from("projectsPreview").select("image_data")),
        admin.storage.from(bucketName).list(fullDestination, { limit: listLimit }),
        Promise.all(
          sourceFolders.map(async (folder) => ({
            folder,
            result: await admin.storage
              .from(bucketName)
              .list(`${authData.user.id}${folder}`, { limit: listLimit }),
          })),
        ),
      ]);

    if (
      latestDestinationContents.error ||
      !latestDestinationContents.data ||
      latestDestinationContents.data.length === listLimit
    ) {
      throw new MoveError("failed", "Unable to revalidate destination folder");
    }
    if (destination !== "/" && latestDestinationContents.data.length === 0) {
      throw new MoveError("validation", "Destination folder does not exist");
    }
    for (const { folder, result } of latestSourceContents) {
      if (result.error || !result.data || result.data.length === listLimit) {
        throw new MoveError("failed", "Unable to revalidate selected image folder");
      }

      const sourceNames = new Set(
        sources.filter((source) => parentPath(source) === folder).map(fileName),
      );
      if ([...sourceNames].some((name) => !result.data.some((item) => item.name === name))) {
        throw new MoveError("validation", "Selected image does not exist");
      }
    }
    if (
      [...latestProjects, ...latestPhotos, ...latestPreviews].some((row) =>
        containsReferencedPath(row, sourcePathSet, supabaseUrl),
      )
    ) {
      throw new MoveError("referenced", "One or more selected images are linked to a project");
    }

    const latestDestinationNames = new Set(
      latestDestinationContents.data.map((item: StorageItem) => item.name),
    );
    if (moves.some((move) => latestDestinationNames.has(fileName(move.destination)))) {
      throw new MoveError("conflict", "A destination image already exists");
    }

    const completed: MoveRecord[] = [];
    for (const move of fullMoves) {
      const { error } = await admin.storage.from(bucketName).move(move.source, move.destination);
      if (error) {
        const compensationFailures: string[] = [];
        for (const completedMove of [...completed].reverse()) {
          const { error: compensationError } = await admin.storage
            .from(bucketName)
            .move(completedMove.destination, completedMove.source);
          if (compensationError) compensationFailures.push(completedMove.source);
        }

        if (compensationFailures.length > 0) {
          return json({
            status: "partial",
            message: "Move failed and rollback was incomplete",
            originalError: error.message,
            movedCount: completed.length,
            rolledBackCount: completed.length - compensationFailures.length,
            rollbackFailedCount: compensationFailures.length,
            rollbackFailedPaths: compensationFailures,
          });
        }
        return json({
          status: "failed",
          message: "Move failed and completed moves were restored",
          originalError: error.message,
          movedCount: completed.length,
          rolledBackCount: completed.length,
          rollbackFailedCount: 0,
          rollbackFailedPaths: [],
        });
      }
      completed.push(move);
    }

    return json({ status: "moved", movedCount: completed.length });
  } catch (error) {
    if (error instanceof MoveError) {
      return json({ status: error.code, message: error.message });
    }
    console.error("User media move failed", error);
    return json({ status: "failed", message: "Unable to move media" }, 500);
  }
});
