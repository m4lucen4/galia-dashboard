"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Button } from "./Button";
import { useTranslation } from "react-i18next";

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
    <Dialog open={open} onClose={handleOutsideClick} className="relative z-10">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95"
          >
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-800 sm:mx-0 sm:size-10">
                  <Icon aria-hidden="true" className={iconClassName} />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-black"
                  >
                    {title}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-800">{description}</p>
                  </div>
                  <div className="mt-4">{children}</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row-reverse sm:gap-2">
                {onCancel && (
                  <Button
                    title={t("shared.cancel")}
                    secondary
                    onClick={handleCancel}
                  />
                )}

                <Button
                  title={t("shared.confirm")}
                  disabled={disabledConfirmButton}
                  onClick={handleAccept}
                />
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};
