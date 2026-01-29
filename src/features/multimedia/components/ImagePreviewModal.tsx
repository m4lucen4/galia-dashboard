import { Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { FileItem } from "../../../types";
import { useTranslation } from "react-i18next";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
}

export const ImagePreviewModal = ({
  isOpen,
  onClose,
  file,
}: ImagePreviewModalProps) => {
  const { t } = useTranslation();
  if (!file) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="relative w-full max-w-6xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={onClose}
                    className="rounded-full bg-gray-900 bg-opacity-50 p-2 text-white hover:bg-opacity-75 transition-all"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="bg-gray-100 p-4">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-auto max-h-[80vh] object-contain"
                  />
                </div>

                <div className="bg-white p-4 border-t">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {file.name}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      {t("multimedia.size")}: {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <p className="text-sm text-gray-600">
                      {t("multimedia.type")}: {file.mime_type}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t("multimedia.uploaded")}:{" "}
                      {new Date(file.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
