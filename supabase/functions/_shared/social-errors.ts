// Social connections: closed error codes shared by the OAuth functions and the worker.
// Only these messages may cross the API boundary. Never return provider or database text.
export { corsHeaders, jsonResponse } from "./publication-generation-errors.ts";

export const socialFailures = {
  invalid_request: [400, "La solicitud no es válida.", false],
  unauthorized: [401, "Inicia sesión para continuar.", false],
  forbidden: [403, "No tienes acceso a esta conexión.", false],
  not_connected: [409, "La red social no está conectada.", false],
  provider_unavailable: [503, "La red social no está disponible en este momento. Puedes reintentar.", true],
  provider_rejected: [422, "La red social ha rechazado la solicitud. Vuelve a conectar la cuenta.", false],
  token_invalid: [422, "La conexión ha caducado o se ha revocado. Vuelve a conectar la cuenta.", false],
  permission_missing: [422, "Faltan permisos. Vuelve a conectar la cuenta y acepta todos los permisos.", false],
  internal_error: [500, "No se ha podido completar la operación.", true],
} as const;

export type SocialFailureCode = keyof typeof socialFailures;

export function isSocialFailureCode(value: unknown): value is SocialFailureCode {
  return typeof value === "string" && Object.hasOwn(socialFailures, value);
}

export class SocialError extends Error {
  readonly code: SocialFailureCode;

  constructor(code: SocialFailureCode) {
    super(code);
    this.code = code;
  }
}

export function socialFailure(error: unknown) {
  const code = error instanceof SocialError ? error.code : "internal_error";
  const [status, message, retryable] = socialFailures[code];
  return { status, body: { code, message, retryable } };
}

// Logs the code and the error class only: provider errors may embed URLs or tokens.
export function logSocialError(scope: string, error: unknown): void {
  const code = error instanceof SocialError ? error.code : "internal_error";
  const name = error instanceof Error ? error.name : typeof error;
  console.error(`[${scope}] ${code} (${name})`);
}
