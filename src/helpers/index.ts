import { LoginProps } from "../types";

/**
 * Valida el formulario de inicio de sesión
 * @param formData Datos del formulario a validar
 * @returns Objeto con errores encontrados
 */
export const validateLoginForm = (
  formData: LoginProps
): Partial<LoginProps> => {
  const errors: Partial<LoginProps> = {};

  // Validación del email
  if (!formData.email) {
    errors.email = "El email es requerido";
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = "Email inválido";
  }

  // Validación de la contraseña
  if (!formData.password) {
    errors.password = "La contraseña es requerida";
  } else if (formData.password.length < 6) {
    errors.password = "La contraseña debe tener al menos 6 caracteres";
  }

  return errors;
};

/**
 * Verifica si un objeto de errores está vacío
 * @param errors Objeto de errores a verificar
 * @returns true si no hay errores, false si hay al menos uno
 */
export const isFormValid = (
  errors: Record<string, string | undefined>
): boolean => {
  return Object.keys(errors).length === 0;
};

/**
 * Helper que recibe múltiples fuentes de mensajes de error y devuelve el primer mensaje válido
 * @param errorSources - Objeto con múltiples fuentes de posibles mensajes de error
 * @returns El primer mensaje de error encontrado o null si no hay errores
 */
export const errorMessages = (
  errorSources: Record<string, string>
): string | null => {
  const messages = Object.values(errorSources);

  const firstError = messages.find((message) => !!message);

  return firstError || null;
};
