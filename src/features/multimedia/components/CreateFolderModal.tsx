import { Fragment, useState, useMemo } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  FolderPlusIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (folderName: string) => void;
  loading?: boolean;
}

const FOLDER_NAME_REGEX = /^[a-zA-Z0-9]+$/;
const MAX_LENGTH = 20;

export const CreateFolderModal = ({
  isOpen,
  onClose,
  onCreateFolder,
  loading,
}: CreateFolderModalProps) => {
  const { t } = useTranslation();
  const [folderName, setFolderName] = useState("");

  const validationError = useMemo(() => {
    if (!folderName) return null;

    if (folderName.length > MAX_LENGTH) {
      return `Máximo ${MAX_LENGTH} caracteres permitidos`;
    }

    if (!FOLDER_NAME_REGEX.test(folderName)) {
      return "Sólo números y letras están permitidos (sin espacios, acentos o símbolos)";
    }

    return null;
  }, [folderName]);

  const isValid = folderName.length > 0 && !validationError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onCreateFolder(folderName);
      setFolderName("");
    }
  };

  const handleClose = () => {
    setFolderName("");
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_LENGTH) {
      setFolderName(value);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <FolderPlusIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <DialogTitle
                    as="h3"
                    className="text-lg font-semibold text-gray-900"
                  >
                    {t("multimedia.createNewFolder")}
                  </DialogTitle>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label
                      htmlFor="folderName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {t("multimedia.folderName")}
                    </label>
                    <input
                      type="text"
                      id="folderName"
                      value={folderName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        validationError
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                      placeholder={t("multimedia.folderNamePlaceholder")}
                      autoFocus
                      disabled={loading}
                      maxLength={MAX_LENGTH}
                    />

                    {validationError && (
                      <div className="mt-2 flex items-start gap-2 text-red-600">
                        <ExclamationCircleIcon className="h-5 w-5 shrink-0 mt-0.5" />
                        <p className="text-sm">{validationError}</p>
                      </div>
                    )}

                    <p className="mt-2 text-xs text-gray-500">
                      {t("multimedia.folderRequired")}
                    </p>

                    <div className="mt-1 text-xs text-gray-400 text-right">
                      {folderName.length}/{MAX_LENGTH}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      disabled={loading}
                    >
                      {t("multimedia.cancel")}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!isValid || loading}
                    >
                      {loading
                        ? t("multimedia.creating")
                        : t("multimedia.create")}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
