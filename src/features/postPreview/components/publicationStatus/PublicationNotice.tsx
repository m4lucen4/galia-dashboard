import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { PublicationNotice as Notice } from "../../hooks/usePublicationActions";

interface PublicationNoticeProps {
  notice: Notice | null;
  onDismiss: () => void;
}

const AUTO_HIDE_MS = 8_000;

/** Inline success / error message for publish, retry and reset actions (S1). Errors stay until dismissed. */
export const PublicationNotice: React.FC<PublicationNoticeProps> = ({ notice, onDismiss }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!notice || notice.kind !== "success") return;
    const id = setTimeout(onDismiss, AUTO_HIDE_MS);
    return () => clearTimeout(id);
  }, [notice, onDismiss]);

  if (!notice) return null;
  const isError = notice.kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
        isError
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-green-300 bg-green-50 text-green-900"
      }`}
    >
      <p className="min-w-0">{notice.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("previewProjects.publication.actions.dismiss")}
        className="shrink-0 rounded-full p-1 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
