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

const RESUMABLE_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`;

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
    return new ProjectVideoError("El vídeo supera el límite de 300 MB.");
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

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(body, {
      endpoint: RESUMABLE_ENDPOINT,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: TUS_CHUNK_SIZE,
      headers: {
        authorization: `Bearer ${initialToken}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
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
        request.setHeader("authorization", `Bearer ${await getAccessToken()}`);
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
