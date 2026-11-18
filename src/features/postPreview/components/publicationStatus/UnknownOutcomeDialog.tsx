import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Alert } from "../../../../components/shared/ui/Alert";
import type { PendingAcknowledgement } from "../../hooks/usePublicationActions";

interface UnknownOutcomeDialogProps {
  acknowledgement: PendingAcknowledgement;
  onCancel: () => void;
}

/**
 * Asked before retrying (or scheduling over) a target whose post may already exist (S11): the user
 * must check the network and confirm explicitly; only then the request is resent with the acknowledgement.
 */
export const UnknownOutcomeDialog: React.FC<UnknownOutcomeDialogProps> = ({
  acknowledgement,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(false);
  const network =
    acknowledgement.networks.length > 0
      ? acknowledgement.networks
          .map((name) => t(`previewProjects.publication.networks.${name}`))
          .join(" / ")
      : t("previewProjects.publication.networks.generic");

  return (
    <Alert
      title={t("previewProjects.publication.unknownOutcome.title")}
      description={t("previewProjects.publication.unknownOutcome.description", { network })}
      icon={ExclamationTriangleIcon}
      onAccept={acknowledgement.onConfirm}
      onCancel={onCancel}
      disabledConfirmButton={!checked}
    >
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#010000]/15 bg-[#010000]/5 px-4 py-3 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#010000]/30 accent-[#010000] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010000]"
        />
        <span>
          {t("previewProjects.publication.unknownOutcome.confirm", { network })}
        </span>
      </label>
    </Alert>
  );
};
