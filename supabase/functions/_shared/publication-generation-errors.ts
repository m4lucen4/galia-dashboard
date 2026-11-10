import { sanitizeDiagnostic, type ProviderDiagnostic } from "./publication-generation-diagnostics.ts";

// Only these messages may cross the API boundary. Never return provider/DB text.
export const failures = {
  invalid_request: [400, "La solicitud no es válida.", false],
  unauthorized: [401, "Inicia sesión para continuar.", false],
  forbidden: [403, "No tienes acceso a este proyecto.", false],
  conflict: [409, "La solicitud no corresponde a esta generación.", false],
  invalid_project: [422, "Revisa los datos del proyecto y el número de publicaciones (1–4).", false],
  not_ready: [503, "La generación no está disponible temporalmente.", true],
  retry_exhausted: [409, "Se ha alcanzado el límite de reintentos.", false],
  project_changed: [409, "El proyecto se ha eliminado o ha cambiado de propietario.", false],
  provider_unavailable: [503, "El proveedor no está disponible. Puedes reintentar.", true],
  provider_refusal: [422, "El proveedor no ha podido generar este contenido.", true],
  invalid_response: [422, "No se ha recibido un contenido válido. Puedes reintentar.", true],
  lease_expired: [503, "La generación ha agotado el tiempo disponible.", true],
  internal_error: [500, "No se ha podido completar la operación.", true],
} as const;

export type FailureCode = keyof typeof failures;

export class GenerationError extends Error {
  readonly code: FailureCode;

  readonly diagnostic?: ProviderDiagnostic;

  constructor(code: FailureCode, diagnostic?: ProviderDiagnostic) {
    super(code);
    this.code = code;
    if (diagnostic) this.diagnostic = sanitizeDiagnostic(diagnostic);
  }
}

export function safeFailure(error: unknown) {
  const code = error instanceof GenerationError ? error.code : "internal_error";
  const [status, message, retryable] = failures[code];
  return { status, body: { code, message, retryable } };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
