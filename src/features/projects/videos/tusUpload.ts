import { DetailedError, Upload } from "tus-js-client";
import { supabase } from "@/helpers/supabase";
import { PROJECT_VIDEOS_BUCKET, TUS_CHUNK_SIZE } from "./videoConstants";
import {
  ProjectVideoError,
  VideoUploadCancelledError,
} from "./videoErrors";

export interface TusUploadOptions {
  objectName: string;
  body: Blob;
  contentType: string;
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
  signal?: AbortSignal;
}

/**
 * Supabase recommends the direct storage host (<ref>.storage.supabase.co) for
 * resumable uploads; other URLs (custom domains, local stacks) are kept as is.
 */
const storageBaseUrl = (projectUrl: string): string => {
  const trimmed = projectUrl.replace(/\/+$/, "");
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(trimmed);
  return match ? `https://${match[1]}.storage.supabase.co` : trimmed;
};

const RESUMABLE_ENDPOINT = `${storageBaseUrl(import.meta.env.VITE_SUPABASE_URL)}/storage/v1/upload/resumable`;

const getAccessToken = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new ProjectVideoError(
      "Tu sesión ha caducado. Vuelve a iniciar sesión para subir vídeos.",
    );
  }
  return token;
};

const toUserError = (error: Error): ProjectVideoError => {
  const status =
    error instanceof DetailedError
      ? (error.originalResponse?.getStatus() ?? 0)
      : 0;
  if (status === 401 || status === 403) {
    return new ProjectVideoError(
      "No tienes permiso para subir vídeos a este proyecto o tu sesión ha caducado.",
    );
  }
  if (status === 413) {
    return new ProjectVideoError("El vídeo supera el límite de 100 MB.");
  }
  if (status === 409) {
    return new ProjectVideoError(
      "Ya existe un archivo con ese nombre. Inténtalo de nuevo.",
    );
  }
  return new ProjectVideoError(
    "No se pudo subir el vídeo. Revisa tu conexión e inténtalo de nuevo.",
  );
};

/** Resumable TUS upload to Supabase Storage. Rejects with VideoUploadCancelledError when aborted. */
export const uploadWithTus = async ({
  objectName,
  body,
  contentType,
  onProgress,
  signal,
}: TusUploadOptions): Promise<void> => {
  if (signal?.aborted) throw new VideoUploadCancelledError();
  const initialToken = await getAccessToken();

  let firstRequest = true;
  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(body, {
      endpoint: RESUMABLE_ENDPOINT,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: TUS_CHUNK_SIZE,
      // The authorization header is set only in onBeforeRequest: XMLHttpRequest
      // appends repeated headers ("Bearer a, Bearer a"), which Storage rejects
      // with "Invalid Compact JWS".
      headers: {
        "x-upsert": "false",
      },
      // Object names are unique per upload, so resuming across page loads is not used.
      storeFingerprintForResuming: false,
      removeFingerprintOnSuccess: true,
      uploadDataDuringCreation: true,
      metadata: {
        bucketName: PROJECT_VIDEOS_BUCKET,
        objectName,
        contentType,
        cacheControl: "3600",
      },
      // Long uploads can outlive the access token; always send the current one.
      onBeforeRequest: async (request) => {
        const token = firstRequest ? initialToken : await getAccessToken();
        firstRequest = false;
        request.setHeader("authorization", `Bearer ${token}`);
      },
      onError: (error) => {
        signal?.removeEventListener("abort", onAbort);
        reject(toUserError(error));
      },
      onProgress: (uploaded, total) => onProgress?.(uploaded, total),
      onSuccess: () => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      },
    });

    const onAbort = () => {
      upload.abort(true).catch(() => undefined);
      reject(new VideoUploadCancelledError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    upload.start();
  });
};
