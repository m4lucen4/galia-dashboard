import { useEffect, useState, useRef } from "react";
import { supabase } from "../helpers/supabase";

interface UseProjectPreviewRealtimeResult {
  isCompleted: boolean;
  recordCount: number;
  error: string | null;
}

/**
 * Custom hook to listen for new project preview records created by n8n workflow
 * @param projectId - The project ID to watch for new preview records
 * @returns Object with completion status and record count
 */
export const useProjectPreviewRealtime = (
  projectId: string | null,
): UseProjectPreviewRealtimeResult => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const prevProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset state when projectId changes (but not on initial mount with null)
    if (prevProjectIdRef.current !== projectId) {
      prevProjectIdRef.current = projectId;
      if (projectId) {
        setTimeout(() => {
          setIsCompleted(false);
          setRecordCount(0);
          setError(null);
        }, 0);
      }
    }

    if (!projectId) {
      return;
    }

    const channel = supabase
      .channel(`project-preview-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "projectsPreview",
          // TEMPORARILY REMOVED FILTER FOR DEBUGGING
          // filter: `id=eq.${projectId}`,
        },

        () => {
          setRecordCount((prev) => prev + 1);
          setIsCompleted(true);
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError("Error connecting to realtime updates");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  return { isCompleted, recordCount, error };
};
