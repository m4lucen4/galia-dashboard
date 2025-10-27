import { Coordinates, LoginProps, PreviewProjectDataProps } from "../types";

interface ProjectStateInfo {
  displayState: string;
  className: string;
}

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

/**
 * Get the current date in ISO format
 * @returns The current date in ISO format
 */
const categoryMap: Record<string, string> = {
  residencial: "Residencial",
  docente: "Docente",
  oficinas: "Oficinas",
  planeamiento: "Planeamiento",
  cultural: "Cultural",
  publico: "Espacio público",
  rehabilitacion: "Rehabilitación",
  interiorismo: "Interiorismo",
  sanitario: "Sanitario",
};

/**
 * Get the label for a category value
 * @param categoryValue - The category value to get the label for
 * @returns The label for the category value or an empty string if not found
 */
export const getCategoryLabel = (categoryValue: string | undefined): string => {
  if (!categoryValue) return "";
  return categoryMap[categoryValue] || categoryValue;
};

/**
 * Determines the display state and styling for a project based on its publication results
 * @param project - The project data containing publication results and state
 * @returns {ProjectStateInfo} An object containing the display state and CSS class name
 *
 * The function evaluates Instagram and LinkedIn publication results to determine:
 * - "published" (green) - All attempted publications were successful
 * - "scheduled" (blue) - The project is scheduled for future publication
 * - "error en publicación" (red) - All attempted publications failed
 * - "publicado con errores" (yellow) - Mix of successes and failures
 * - "publicado parcialmente" (blue) - Some successes with no failures
 * - "error parcial" (orange) - Some failures with no successes
 * - Default state (green/gray) - When no publication results exist
 */
export const getProjectStateInfo = (
  project: PreviewProjectDataProps
): ProjectStateInfo => {
  const { instagramResult, linkedlnResult, state } = project;

  if (state === "scheduled") {
    return {
      displayState: "scheduled",
      className: "bg-blue-100 text-blue-800",
    };
  }

  if (!instagramResult && !linkedlnResult) {
    return {
      displayState: state,
      className:
        state === "published"
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-black",
    };
  }

  const successCount =
    (instagramResult === "true" || instagramResult === "notSelected" ? 1 : 0) +
    (linkedlnResult === "true" || linkedlnResult === "notSelected" ? 1 : 0);

  const failureCount =
    (instagramResult === "false" ? 1 : 0) +
    (linkedlnResult === "false" ? 1 : 0);

  const totalAttempts = (instagramResult ? 1 : 0) + (linkedlnResult ? 1 : 0);

  if (successCount === totalAttempts && totalAttempts > 0) {
    return {
      displayState: "published",
      className: "bg-green-100 text-green-800",
    };
  }

  if (failureCount === totalAttempts && totalAttempts > 0) {
    return {
      displayState: "error en publicación",
      className: "bg-red-100 text-red-800",
    };
  }

  if (successCount > 0 && failureCount > 0) {
    return {
      displayState: "publicado con errores",
      className: "bg-yellow-100 text-yellow-800",
    };
  }

  if (successCount > 0 && failureCount === 0) {
    return {
      displayState: "publicado parcialmente",
      className: "bg-blue-100 text-blue-800",
    };
  }

  if (failureCount > 0 && successCount === 0) {
    return {
      displayState: "error parcial",
      className: "bg-orange-100 text-orange-800",
    };
  }

  return {
    displayState: state,
    className:
      state === "published"
        ? "bg-green-100 text-green-800"
        : "bg-gray-100 text-black",
  };
};

export interface ImageValidationResult {
  validFiles: File[];
  invalidFiles: string[];
  invalidAspectRatioFiles: string[];
}

export interface ImageValidationOptions {
  maxFileSize?: number;
  minAspectRatio?: number;
  maxAspectRatio?: number;
  maxImages?: number;
  existingImagesCount?: number;
}

/**
 * Validates an array of image files based on size and aspect ratio constraints
 * @param files - Array of files to validate
 * @param options - Validation options including size and aspect ratio limits
 * @returns Promise that resolves to validation results
 */
export const validateImageFiles = async (
  files: File[],
  options: ImageValidationOptions = {}
): Promise<ImageValidationResult> => {
  const {
    maxFileSize = 5 * 1024 * 1024, // 5MB default
    minAspectRatio = 0.8,
    maxAspectRatio = 1.91,
    maxImages = 10,
    existingImagesCount = 0,
  } = options;

  const validFiles: File[] = [];
  const invalidFiles: string[] = [];
  const invalidAspectRatioFiles: string[] = [];

  const processFile = (file: File): Promise<void> => {
    return new Promise((resolve) => {
      // Validate file size
      if (file.size > maxFileSize) {
        invalidFiles.push(
          `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`
        );
        resolve();
        return;
      }

      // Validate aspect ratio
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;

        if (aspectRatio < minAspectRatio || aspectRatio > maxAspectRatio) {
          invalidAspectRatioFiles.push(
            `${file.name} (ratio: ${aspectRatio.toFixed(2)})`
          );
        } else {
          validFiles.push(file);
        }

        // Clean up the object URL
        URL.revokeObjectURL(img.src);
        resolve();
      };

      img.onerror = () => {
        invalidFiles.push(`${file.name} (formato no válido)`);
        URL.revokeObjectURL(img.src);
        resolve();
      };

      img.src = URL.createObjectURL(file);
    });
  };

  await Promise.all(files.map(processFile));

  // Limit the number of valid files based on existing images
  const maxNewImages = maxImages - existingImagesCount;
  const limitedValidFiles = validFiles.slice(0, maxNewImages);

  return {
    validFiles: limitedValidFiles,
    invalidFiles,
    invalidAspectRatioFiles,
  };
};

/**
 * Normalizes a URL by adding protocol and www if needed
 * @param url - The URL string to normalize
 * @param addWww - Whether to add www if not present (default: false)
 * @returns The normalized URL or empty string if invalid
 */
export const normalizeUrl = (url: string, addWww: boolean = false): string => {
  if (!url || url.trim() === "") {
    return "";
  }

  let normalizedUrl = url.trim().toLowerCase();

  // Remove trailing slash
  normalizedUrl = normalizedUrl.replace(/\/$/, "");

  // Check if it already has a protocol
  const hasProtocol = /^https?:\/\//.test(normalizedUrl);

  if (!hasProtocol) {
    // Add https:// if no protocol is present
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Add www if requested and not present
  if (
    addWww &&
    !normalizedUrl.includes("://www.") &&
    !normalizedUrl.includes("://localhost")
  ) {
    normalizedUrl = normalizedUrl.replace("://", "://www.");
  }

  // Basic domain validation
  try {
    const urlObj = new URL(normalizedUrl);
    // Check if hostname has at least one dot (basic domain check)
    if (!urlObj.hostname.includes(".") && urlObj.hostname !== "localhost") {
      return "";
    }
    return normalizedUrl;
  } catch {
    // If URL constructor fails, it's not a valid URL
    return "";
  }
};

export const openPopup = (
  url: string,
  name = "instagram_oauth",
  width = 600,
  height = 700
): Window | null => {
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  return window.open(
    url,
    name,
    `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
};
