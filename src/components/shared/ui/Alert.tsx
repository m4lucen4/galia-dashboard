import { useState } from "react";
import {
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { PillButton } from "./PillButton";
import { useTranslation } from "react-i18next";
import "@/features/newWeb/fonts.css";

interface AlertProps {
  title: string;
  description: string;
  onAccept?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
  icon?: React.ElementType;
  iconClassName?: string;
  disabledConfirmButton?: boolean;
}

export const Alert: React.FC<AlertProps> = ({
  title,
  description,
  onAccept,
  onCancel,
  children,
  icon: Icon = ExclamationTriangleIcon,
  iconClassName = "size-6 text-white",
  disabledConfirmButton = false,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
  };

  const handleCancel = () => {
    setOpen(false);
    if (onCancel) {
      onCancel();
    }
  };

  const handleOutsideClick = () => {
    return false;
  };

  return (
    <Dialog open={open} onClose={handleOutsideClick} className="relative z-60 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[#010000]/45 transition-opacity duration-200 data-closed:opacity-0 motion-reduce:transition-none"
      />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <DialogPanel
            transition
            className="relative w-full max-w-lg rounded-[28px] border border-[#010000]/15 bg-[#d8e4d6] p-6 text-left shadow-xl data-closed:opacity-0 motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-safe:data-closed:translate-y-2 motion-safe:data-closed:scale-95 sm:p-8"
          >
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#010000]">
                <Icon aria-hidden="true" className={iconClassName} />
              </div>
              <DialogTitle as="h3" className="min-w-0 text-2xl leading-tight font-medium tracking-[-0.03em]">
                {title}
              </DialogTitle>
            </div>
            <Description className="mt-3 text-sm leading-relaxed text-[#010000]/75">
              {description}
            </Description>
            {children && <div className="mt-5">{children}</div>}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <PillButton
                disabled={disabledConfirmButton}
                className="w-full sm:w-auto sm:min-w-32"
                onClick={handleAccept}
              >
                {t("shared.confirm")}
              </PillButton>
              {onCancel && (
                <PillButton variant="outline" className="w-full sm:w-auto sm:min-w-32" onClick={handleCancel}>
                  {t("shared.cancel")}
                </PillButton>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};
