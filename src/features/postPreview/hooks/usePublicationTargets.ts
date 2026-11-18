import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicationTarget } from "@/types";
import { SOCIAL_PUBLISHING_EDGE_ENABLED } from "@/helpers/publishDate";
import {
  listPublicationTargets,
  subscribeToPublicationTargets,
} from "../services/publicationPublishing";
import {
  applyTargetEvent,
  replaceTargets,
  setPreviewTargets,
  type TargetsByPreview,
} from "../helpers/publicationTargets";

// Fallback when realtime is not delivering: refresh while something is in flight or due.
const POLL_MS = 20_000;
const POLL_HORIZON_MS = 2 * 60_000;
// Several realtime events of one publish usually arrive together; refresh the list once.
const CHANGE_DEBOUNCE_MS = 1_500;

/**
 * Current publication_targets of the visible publications (S1, S23): one query, then realtime
 * changes. Does nothing (and returns no targets) with the Edge switch off.
 *
 * `onTargetsChanged` runs (debounced) after a realtime change so the publication list, whose legacy
 * columns the server updates in the same transaction, can refresh its state badges.
 */
export function usePublicationTargets(
  previewIds: string[],
  onTargetsChanged?: () => void,
) {
  const [targets, setTargets] = useState<TargetsByPreview>({});
  const idsKey = SOCIAL_PUBLISHING_EDGE_ENABLED ? previewIds.join(",") : "";
  const targetsRef = useRef(targets);
  const onChangedRef = useRef(onTargetsChanged);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);
  useEffect(() => {
    onChangedRef.current = onTargetsChanged;
  }, [onTargetsChanged]);

  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(",");
    let active = true;
    let debounce: ReturnType<typeof setTimeout> | undefined;

    const load = () =>
      listPublicationTargets(ids)
        .then((list) => {
          if (active) setTargets((current) => replaceTargets(current, ids, list));
        })
        .catch(() => {
          // Keep what is shown; realtime and the next refresh retry silently.
        });

    void load();
    const unsubscribe = subscribeToPublicationTargets(ids, (event) => {
      if (!active) return;
      setTargets((current) => applyTargetEvent(current, event));
      clearTimeout(debounce);
      debounce = setTimeout(() => onChangedRef.current?.(), CHANGE_DEBOUNCE_MS);
    });
    const poll = setInterval(() => {
      const now = Date.now();
      const inFlight = ids.some((id) =>
        (targetsRef.current[id] ?? []).some(
          (target) =>
            target.status === "running" ||
            (target.status === "pending" &&
              Date.parse(target.runAt) <= now + POLL_HORIZON_MS),
        ),
      );
      if (inFlight) void load();
    }, POLL_MS);

    return () => {
      active = false;
      clearTimeout(debounce);
      clearInterval(poll);
      unsubscribe();
    };
  }, [idsKey]);

  /** Applies an authoritative answer of the publish function (no waiting for realtime). */
  const applyTargets = useCallback(
    (previewId: string, list: PublicationTarget[]) =>
      setTargets((current) => setPreviewTargets(current, previewId, list)),
    [],
  );

  return { targets, applyTargets };
}
