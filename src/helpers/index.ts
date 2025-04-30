import { Coordinates, LoginProps } from "../types";

/**
 * Valida el formulario de inicio de sesión
 * @param formData Datos del formulario a validar
 * @returns Objeto con errores encontrados
 */
export const validateLoginForm = (
  formData: LoginProps
): Partial<LoginProps> => {
  const errors: Partial<LoginProps> = {};

  if (!formData.email) {
    errors.email = "El email es requerido";
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = "Email inválido";
  }

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

/**
 * Format a date from ISO format to DD-MM-YYYY
 * @param dateString - Date in ISO format (e.g. 2025-04-22T19:36:46.394739+00:00)
 * @returns Date formatted as DD-MM-YYYY
 */
export const formatDateToDDMMYYYY = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error("Error format date:", error);
    return dateString;
  }
};

/**
 * Format a date according to a custom format
 * @param dateString - Date in ISO format
 * @param format - Desired format ('dd-mm-yyyy', 'mm-dd-yyyy', etc.)
 * @returns Date formatted according to the specified format
 */
export const formatDate = (
  dateString: string,
  format: string = "dd-mm-yyyy"
): string => {
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    switch (format.toLowerCase()) {
      case "dd-mm-yyyy":
        return `${day}-${month}-${year}`;
      case "mm-dd-yyyy":
        return `${month}-${day}-${year}`;
      case "yyyy-mm-dd":
        return `${year}-${month}-${day}`;
      default:
        return `${day}-${month}-${year}`;
    }
  } catch (error) {
    console.error("Error when format date:", error);
    return dateString;
  }
};

/**
 * Format a date from ISO format to DD-MM-YYYY
 * @param dateString - Date in ISO format (e.g. 2025-04-22T19:36:46.394739+00:00)
 * @returns Date formatted as DD-MM-YYYY
 */
export const isDateInPast = (dateString: string | undefined): boolean => {
  if (!dateString) return false;

  const publishDate = new Date(dateString);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  publishDate.setHours(0, 0, 0, 0);

  return publishDate <= today;
};

/**
 * Truncate a string to a specified length and add ellipsis if necessary
 * @param text - The text to truncate
 * @param maxLength - The maximum length of the text
 * @returns The truncated text with ellipsis if it was truncated
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Extract coordinates from a Google Maps URL
 * @param url - The Google Maps URL
 * @returns An object with latitude and longitude or null if not found
 */
export const extractCoordinates = (url: string): Coordinates | null => {
  try {
    if (!url) return null;

    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);

    if (match && match.length >= 3) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
      };
    }
    return null;
  } catch (error) {
    console.error("Error extracting coordinates:", error);
    return null;
  }
};
