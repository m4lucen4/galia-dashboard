import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  PreviewProjectDataProps,
  PublicationTarget,
  SocialNetworksCheck,
} from "@/types";
import {
  formatInstantInMadrid,
  madridWallClockToInstant,
} from "@/helpers/publishDate";
import {
  buildPublicationTargets,
  type PublicationTargetRequest,
  isPublicationPublishingError,
  newPublishRequestId,
  publishPublicationNow,
  resetPublicationTargets,
  retryPublicationTarget,
  schedulePublication,
} from "../services/publicationPublishing";
import { isUnknownOutcome } from "../helpers/publicationTargets";

export interface PublicationNotice {
  kind: "success" | "error";
  message: string;
}

export interface PendingAcknowledgement {
  /** Networks whose earlier publication may exist; empty when unknown. */
  networks: Array<"instagram" | "linkedin">;
  onConfirm: () => void;
}

interface Handlers {
  onSuccess: (targets: PublicationTarget[]) => void;
  onError: (message: string) => void;
}

interface Options {
  /** Current targets of a publication (to name the networks of an unknown outcome). */
  targetsFor: (previewId: string) => PublicationTarget[];
  /** Authoritative answer of the function: update the shown targets right away. */
  applyTargets: (previewId: string, targets: PublicationTarget[]) => void;
  /** Refresh the publication list (state badges come from the legacy projection). */
  onRefresh: () => void;
}

export interface PublishParams {
  project: PreviewProjectDataProps;
  /** Madrid wall-clock label of the date input ("YYYY-MM-DD HH:mm:ss+00"). */
  publishDate: string;
  publishNow: boolean;
  socialNetworks: SocialNetworksCheck;
}

/**
 * Publish, retry and reset through the Edge Function (S1, S11, S23): one request id per user action,
 * the acknowledgement dialog for an unknown outcome, busy flags and translated messages.
 */
export function usePublicationActions({ targetsFor, applyTargets, onRefresh }: Options) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<PublicationNotice | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<PendingAcknowledgement | null>(null);
  // An uncertain answer (timeout) may have succeeded: the same action reuses its request id.
  const uncertainRef = useRef<{ signature: string; requestId: string } | null>(null);

  const errorMessage = useCallback(
    (error: unknown): string => {
      const code = isPublicationPublishingError(error) ? error.code : "default";
      return t(`previewProjects.publication.requestErrors.${code}`, {
        defaultValue: t("previewProjects.publication.requestErrors.default"),
      });
    },
    [t],
  );

  const setBusyFlag = (previewId: string, on: boolean) =>
    setBusy((current) => {
      const next = new Set(current);
      if (on) next.add(previewId);
      else next.delete(previewId);
      return next;
    });

  const execute = useCallback(
    async (
      previewId: string,
      send: (acknowledge: boolean) => Promise<PublicationTarget[]>,
      handlers: Handlers,
      acknowledged = false,
    ): Promise<void> => {
      setBusyFlag(previewId, true);
      try {
        const targets = await send(acknowledged);
        uncertainRef.current = null;
        applyTargets(previewId, targets);
        handlers.onSuccess(targets);
      } catch (error) {
        if (
          isPublicationPublishingError(error) &&
          error.code === "confirmation_required" &&
          !acknowledged
        ) {
          const networks = targetsFor(previewId)
            .filter(isUnknownOutcome)
            .map((target) => target.network);
          setAcknowledgement({
            networks,
            onConfirm: () => {
              setAcknowledgement(null);
              void execute(previewId, send, handlers, true);
            },
          });
        } else {
          if (!isPublicationPublishingError(error) || error.code !== "uncertain") {
            uncertainRef.current = null;
          }
          handlers.onError(errorMessage(error));
          // The outcome may differ from what is shown: reload.
          onRefresh();
        }
      } finally {
        setBusyFlag(previewId, false);
      }
    },
    [applyTargets, errorMessage, onRefresh, targetsFor],
  );

  const showSuccess = useCallback(
    (message: string) => setNotice({ kind: "success", message }),
    [],
  );
  const showError = useCallback(
    (message: string) => setNotice({ kind: "error", message }),
    [],
  );

  /** Schedule or publish now from the publish configuration. */
  const publish = useCallback(
    (params: PublishParams, handlers: Handlers) => {
      const previewId = String(params.project.id);
      let targets: PublicationTargetRequest[];
      try {
        targets = buildPublicationTargets(params.socialNetworks);
      } catch (error) {
        handlers.onError(errorMessage(error));
        return;
      }
      if (targets.length === 0) {
        handlers.onError(t("previewProjects.publication.requestErrors.no_networks"));
        return;
      }
      let runAt: string | null = null;
      if (!params.publishNow) {
        // The input holds the Madrid wall-clock the user picked; the server stores the real instant.
        runAt = madridWallClockToInstant(params.publishDate)?.toISOString() ?? null;
        if (!runAt) {
          handlers.onError(t("previewProjects.publication.requestErrors.invalid_date"));
          return;
        }
      }
      const signature = JSON.stringify([previewId, params.publishNow, runAt, targets]);
      const requestId =
        uncertainRef.current?.signature === signature
          ? uncertainRef.current.requestId
          : newPublishRequestId();
      uncertainRef.current = { signature, requestId };
      void execute(
        previewId,
        (acknowledgeUnknownOutcome) =>
          runAt
            ? schedulePublication({ previewId, requestId, runAt, targets, acknowledgeUnknownOutcome })
            : publishPublicationNow({ previewId, requestId, targets, acknowledgeUnknownOutcome }),
        {
          onSuccess: (result) => {
            onRefresh();
            showSuccess(
              runAt
                ? t("previewProjects.publication.notices.scheduled", {
                    date: formatInstantInMadrid(runAt),
                  })
                : t("previewProjects.publication.notices.publishingNow"),
            );
            handlers.onSuccess(result);
          },
          onError: handlers.onError,
        },
      );
    },
    [errorMessage, execute, onRefresh, showSuccess, t],
  );

  /** Retry one failed or waiting target. An unknown outcome asks for confirmation first. */
  const retry = useCallback(
    (target: PublicationTarget) => {
      const run = (acknowledge: boolean) =>
        execute(
          target.previewId,
          (ack) =>
            retryPublicationTarget({
              previewId: target.previewId,
              targetId: target.id,
              acknowledgeUnknownOutcome: ack,
            }),
          {
            onSuccess: () => {
              onRefresh();
              showSuccess(
                t("previewProjects.publication.notices.retried", {
                  network: t(`previewProjects.publication.networks.${target.network}`),
                }),
              );
            },
            onError: showError,
          },
          acknowledge,
        );
      if (isUnknownOutcome(target)) {
        setAcknowledgement({
          networks: [target.network],
          onConfirm: () => {
            setAcknowledgement(null);
            void run(true);
          },
        });
        return;
      }
      void run(false);
    },
    [execute, onRefresh, showError, showSuccess, t],
  );

  /**
   * Unschedule or prepare to publish again (archives the targets and clears the legacy columns).
   * Always shows the success or error notice; the handlers add what the caller needs (close a dialog,
   * open the configuration).
   */
  const reset = useCallback(
    (project: PreviewProjectDataProps, handlers?: Partial<Handlers>) => {
      const previewId = String(project.id);
      void execute(
        previewId,
        (acknowledgeUnknownOutcome) =>
          resetPublicationTargets({ previewId, acknowledgeUnknownOutcome }),
        {
          onSuccess: (targets) => {
            onRefresh();
            showSuccess(t("previewProjects.publication.notices.reset"));
            handlers?.onSuccess?.(targets);
          },
          onError: (message) => {
            showError(message);
            handlers?.onError?.(message);
          },
        },
      );
    },
    [execute, onRefresh, showError, showSuccess, t],
  );

  return {
    isBusy: (previewId: string) => busy.has(String(previewId)),
    notice,
    dismissNotice: () => setNotice(null),
    acknowledgement,
    cancelAcknowledgement: () => setAcknowledgement(null),
    publish,
    retry,
    reset,
  };
}
