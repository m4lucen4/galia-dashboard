import { useEffect, useState, useRef } from "react";
import { supabase } from "../helpers/supabase";

interface UseIterationRealtimeResult {
  isCompleted: boolean;
  error: string | null;
}

/**
 * Custom hook to listen for iteration updates on a preview project
 * Detects when a new version is added to the versions array
 * @param projectId - The project ID to watch for iteration updates
 * @param isIterating - Whether an iteration is currently in progress
 * @returns Object with completion status
 */
export const useIterationRealtime = (
  projectId: string | null,
  isIterating: boolean,
): UseIterationRealtimeResult => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialVersionsCountRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset state when starting a new iteration
    if (isIterating && projectId) {
      // Use setTimeout to avoid calling setState synchronously within an effect
      setTimeout(() => {
        setIsCompleted(false);
        setError(null);
      }, 0);
      initialVersionsCountRef.current = null;
    }
  }, [isIterating, projectId]);

  useEffect(() => {
    if (!projectId || !isIterating) {
      return;
    }

    // Fetch initial versions count
    const fetchInitialCount = async () => {
      const { data, error } = await supabase
        .from("projectsPreview")
        .select("versions")
        .eq("id", projectId)
        .single();

      if (error) {
        console.error("Error fetching initial versions count:", error);
        return;
      }

      initialVersionsCountRef.current = data?.versions?.length || 0;
    };

    fetchInitialCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`iteration-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "projectsPreview",
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          const newVersionsCount = payload.new?.versions?.length || 0;
          const initialCount = initialVersionsCountRef.current || 0;

          // Check if a new version was added
          if (newVersionsCount > initialCount) {
            setIsCompleted(true);
          }
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
  }, [projectId, isIterating]);

  return { isCompleted, error };
};
