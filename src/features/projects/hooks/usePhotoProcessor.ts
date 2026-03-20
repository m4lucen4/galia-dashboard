import { useState, useEffect, useRef, useCallback } from "react";

const PROCESSOR_URL = import.meta.env.VITE_PHOTO_PROCESSOR_URL;
const PROCESSOR_TOKEN = import.meta.env.VITE_PHOTO_PROCESSOR_TOKEN;

export type ProcessorState = "idle" | "processing" | "done" | "error";

export interface UsePhotoProcessorResult {
  processorState: ProcessorState;
  processorMessage: string;
  startProcessing: (folder: string) => void;
}

export const usePhotoProcessor = (): UsePhotoProcessorResult => {
  const [processorState, setProcessorState] = useState<ProcessorState>("idle");
  const [processorMessage, setProcessorMessage] = useState("");
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

  return { processorState, processorMessage, startProcessing };
};
