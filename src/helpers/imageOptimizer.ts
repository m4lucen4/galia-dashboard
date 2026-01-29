import imageCompression from "browser-image-compression";

export type SocialMediaPreset = "social" | "web";

export interface OptimizationProgress {
  fileName: string;
  progress: number;
  status: "optimizing" | "completed" | "error";
  originalSize: number;
  optimizedSize?: number;
  error?: string;
}

interface PresetConfig {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  quality: number;
  fileType?: string;
}

// Presets optimizados para diferentes usos
const PRESETS: Record<SocialMediaPreset, PresetConfig> = {
  social: {
    maxSizeMB: 4.5, // Optimizado para Instagram, LinkedIn, Facebook
    maxWidthOrHeight: 1200, // Balance entre Instagram (1080) y LinkedIn (1200)
    quality: 0.85, // Buena calidad visual
    fileType: "image/jpeg",
  },
  web: {
    maxSizeMB: 3, // Optimizado para carga rápida en web
    maxWidthOrHeight: 1920, // Full HD
    quality: 0.8,
    fileType: "image/jpeg",
  },
};

/**
 * Optimiza una imagen usando un preset
 */
export async function optimizeImage(
  file: File,
  preset: SocialMediaPreset = "web",
  onProgress?: (progress: number) => void
): Promise<File> {
  const config = PRESETS[preset];

  const options = {
    maxSizeMB: config.maxSizeMB,
    maxWidthOrHeight: config.maxWidthOrHeight,
    useWebWorker: true, // Usa Web Worker para no bloquear el UI
    fileType: config.fileType,
    initialQuality: config.quality,
    onProgress: onProgress,
  };

  try {
    const optimizedFile = await imageCompression(file, options);

    // Retornar el archivo optimizado con el nombre original
    return new File([optimizedFile], file.name, {
      type: optimizedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Error optimizing image:", error);
    throw error;
  }
}

/**
 * Optimiza múltiples imágenes en paralelo
 */
export async function optimizeImages(
  files: File[],
  preset: SocialMediaPreset = "web",
  onProgressUpdate?: (progress: OptimizationProgress[]) => void
): Promise<File[]> {
  const progressMap = new Map<string, OptimizationProgress>();

  // Inicializar progreso para cada archivo
  files.forEach((file) => {
    progressMap.set(file.name, {
      fileName: file.name,
      progress: 0,
      status: "optimizing",
      originalSize: file.size,
    });
  });

  // Notificar progreso inicial
  if (onProgressUpdate) {
    onProgressUpdate(Array.from(progressMap.values()));
  }

  // Optimizar todas las imágenes en paralelo
  const optimizationPromises = files.map(async (file) => {
    try {
      const optimizedFile = await optimizeImage(file, preset, (progress) => {
        // Actualizar progreso individual
        const fileProgress = progressMap.get(file.name);
        if (fileProgress) {
          fileProgress.progress = progress;
          if (onProgressUpdate) {
            onProgressUpdate(Array.from(progressMap.values()));
          }
        }
      });

      // Marcar como completado
      const fileProgress = progressMap.get(file.name);
      if (fileProgress) {
        fileProgress.status = "completed";
        fileProgress.progress = 100;
        fileProgress.optimizedSize = optimizedFile.size;
        if (onProgressUpdate) {
          onProgressUpdate(Array.from(progressMap.values()));
        }
      }

      return optimizedFile;
    } catch (error) {
      // Marcar como error
      const fileProgress = progressMap.get(file.name);
      if (fileProgress) {
        fileProgress.status = "error";
        fileProgress.error =
          error instanceof Error ? error.message : "Unknown error";
        if (onProgressUpdate) {
          onProgressUpdate(Array.from(progressMap.values()));
        }
      }

      // Retornar el archivo original si falla la optimización
      console.warn(`Failed to optimize ${file.name}, using original`);
      return file;
    }
  });

  return Promise.all(optimizationPromises);
}

/**
 * Formatea el tamaño de archivo en formato legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Calcula el porcentaje de reducción de tamaño
 */
export function calculateReduction(
  originalSize: number,
  optimizedSize: number
): number {
  const reduction = ((originalSize - optimizedSize) / originalSize) * 100;
  return Math.round(reduction);
}
