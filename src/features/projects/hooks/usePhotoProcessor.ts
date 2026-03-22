import { useState, useEffect, useRef, useCallback } from "react";

const PROCESSOR_URL = import.meta.env.VITE_PHOTO_PROCESSOR_URL;
const PROCESSOR_TOKEN = import.meta.env.VITE_PHOTO_PROCESSOR_TOKEN;

export interface FotoTag {
  filename: string;
  descripcion_corta: string;
  iluminacion: string[];
  tipo_plano: string[];
  atmosfera_mood: string[];
  materiales_visibles: string[];
  elementos_arquitectonicos: string[];
  rating: string;
}

export interface ProcessorAnalysis {
  ok: boolean;
  titulo: string;
  descripcion: string;
  tags: string[];
  web?: string | null;
  anio?: string;
  foto_tags: FotoTag[];
}

export interface AddPhotosAnalysis {
  ok: boolean;
  message: string;
  fileMapping: Record<string, string>;
  foto_tags: FotoTag[];
}

export type ProcessorState = "idle" | "processing" | "done" | "error";

export interface UsePhotoProcessorResult {
  processorState: ProcessorState;
  processorMessage: string;
  analysis: ProcessorAnalysis | null;
  addPhotosResult: AddPhotosAnalysis | null;
  startProcessing: (folder: string) => void;
  startAddPhotos: (folder: string, projectId: string, odooId: string) => void;
}

export const usePhotoProcessor = (): UsePhotoProcessorResult => {
  const [processorState, setProcessorState] = useState<ProcessorState>("idle");
  const [processorMessage, setProcessorMessage] = useState("");
  const [analysis, setAnalysis] = useState<ProcessorAnalysis | null>(null);
  const [addPhotosResult, setAddPhotosResult] =
    useState<AddPhotosAnalysis | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const folderRef = useRef<string>("");

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `${PROCESSOR_URL}/status?folder=${encodeURIComponent(folderRef.current)}`,
        { headers: { Authorization: `Bearer ${PROCESSOR_TOKEN}` } },
      );
      const data = await res.json();

      if (!data.inProgress) {
        stopPolling();
        if (data.ok) {
          if (folderRef.current.startsWith("add:")) {
            setAddPhotosResult(data.analysis ?? null);
          } else {
            setAnalysis(data.analysis ?? null);
          }
          setProcessorState("done");
          setProcessorMessage(data.message);
        } else {
          setProcessorState("error");
          setProcessorMessage(data.message);
        }
      }
    } catch {
      stopPolling();
      setProcessorState("error");
      setProcessorMessage("Error al comprobar el estado del procesado.");
    }
  }, []);

  const startProcessing = useCallback(
    async (folder: string) => {
      folderRef.current = folder;
      setProcessorState("processing");
      setProcessorMessage("");
      setAnalysis(null);

      try {
        const res = await fetch(`${PROCESSOR_URL}/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${PROCESSOR_TOKEN}`,
          },
          body: JSON.stringify({ folder }),
        });
        const data = await res.json();

        if (!res.ok) {
          setProcessorState("error");
          setProcessorMessage(data.message ?? "Error al iniciar el procesado.");
          return;
        }

        pollingRef.current = setInterval(checkStatus, 3000);
      } catch {
        setProcessorState("error");
        setProcessorMessage("Error al conectar con el procesador.");
      }
    },
    [checkStatus],
  );

  const startAddPhotos = useCallback(
    async (folder: string, projectId: string, odooId: string) => {
      folderRef.current = `add:${folder}`;
      setProcessorState("processing");
      setProcessorMessage("");
      setAddPhotosResult(null);

      try {
        const res = await fetch(`${PROCESSOR_URL}/add-photos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${PROCESSOR_TOKEN}`,
          },
          body: JSON.stringify({ folder, projectId, odooId }),
        });

        if (!res.ok) {
          const data = await res.json();
          setProcessorState("error");
          setProcessorMessage(data.message ?? "Error al iniciar el procesado.");
          return;
        }

        pollingRef.current = setInterval(checkStatus, 3000);
      } catch {
        setProcessorState("error");
        setProcessorMessage("Error al conectar con el procesador.");
      }
    },
    [checkStatus],
  );

  return {
    processorState,
    processorMessage,
    analysis,
    addPhotosResult,
    startProcessing,
    startAddPhotos,
  };
};
