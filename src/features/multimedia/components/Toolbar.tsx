import {
  FolderPlusIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  FolderArrowDownIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { PillButton } from "@/components/shared/ui/PillButton";

interface ToolbarProps {
  selectedCount: number;
  onCreateFolder: () => void;
  onDelete: () => void;
  onUpload: () => void;
  onMove: () => void;
  deleteLoading?: boolean;
  moveLoading?: boolean;
  canMove: boolean;
}

export const Toolbar = ({
  selectedCount,
  onCreateFolder,
  onDelete,
  onUpload,
  onMove,
  deleteLoading,
  moveLoading,
  canMove,
}: ToolbarProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#010000]/15 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <PillButton onClick={onCreateFolder} variant="outline">
          <FolderPlusIcon className="h-5 w-5 shrink-0" />
          <span>{t("multimedia.newFolder")}</span>
        </PillButton>
        <PillButton onClick={onUpload}>
          <ArrowUpTrayIcon className="h-5 w-5 shrink-0" />
          <span>{t("multimedia.upload")}</span>
        </PillButton>
      </div>
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-['Geist_Mono',monospace] text-xs text-[#010000]/70">
            {selectedCount} {t("multimedia.selected")}
          </span>
          <PillButton
            onClick={onDelete}
            disabled={deleteLoading}
            variant="outline"
            className="border-red-800 text-red-800 hover:bg-red-800 hover:text-white"
          >
            <TrashIcon className="h-5 w-5 shrink-0" />
            <span>
              {deleteLoading
                ? t("multimedia.deleting")
                : t("multimedia.delete")}
            </span>
          </PillButton>
          <PillButton onClick={onMove} disabled={!canMove || moveLoading}>
            <FolderArrowDownIcon className="h-5 w-5 shrink-0" />
            <span>
              {moveLoading ? t("multimedia.moving") : t("multimedia.move")}
            </span>
          </PillButton>
        </div>
      )}
    </div>
  );
};
