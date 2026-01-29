import {
  FolderPlusIcon,
  TrashIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

interface ToolbarProps {
  selectedCount: number;
  onCreateFolder: () => void;
  onDelete: () => void;
  onUpload: () => void;
  deleteLoading?: boolean;
}

export const Toolbar = ({
  selectedCount,
  onCreateFolder,
  onDelete,
  onUpload,
  deleteLoading,
}: ToolbarProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-white border-b">
      <div className="flex items-center gap-2">
        <button
          onClick={onCreateFolder}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <FolderPlusIcon className="h-5 w-5" />
          <span>{t("multimedia.newFolder")}</span>
        </button>

        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          <ArrowUpTrayIcon className="h-5 w-5" />
          <span>{t("multimedia.upload")}</span>
        </button>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {selectedCount} {t("multimedia.selected")}
          </span>
          <button
            onClick={onDelete}
            disabled={deleteLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <TrashIcon className="h-5 w-5" />
            <span>
              {deleteLoading
                ? t("multimedia.deleting")
                : t("multimedia.delete")}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
