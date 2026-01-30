import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "../../../components/shared/ui/Alert";
import {
  FolderPlusIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

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

  const handleAccept = () => {
    if (isValid) {
      onCreateFolder(folderName);
      setFolderName("");
    }
  };

  const handleCancel = () => {
    setFolderName("");
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_LENGTH) {
      setFolderName(value);
    }
  };

  if (!isOpen) return null;

  return (
    <Alert
      title={t("multimedia.createNewFolder")}
      description=""
      onAccept={handleAccept}
      onCancel={handleCancel}
      icon={FolderPlusIcon}
      iconClassName="size-6 text-white"
      disabledConfirmButton={!isValid || loading}
    >
      <div className="mt-4">
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
    </Alert>
  );
};
