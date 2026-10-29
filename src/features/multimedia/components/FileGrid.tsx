import { useTranslation } from "react-i18next";
import { FileItem as FileItemType, FolderItem } from "../../../types";
import { FileItem } from "./FileItem";

interface FileGridProps {
  files: FileItemType[];
  folders: FolderItem[];
  selectedItems: string[];
  onSelectItem: (path: string) => void;
  onOpenFolder: (path: string) => void;
  onOpenFile: (file: FileItemType) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItemType | FolderItem) => void;
}

export const FileGrid = ({
  files,
  folders,
  selectedItems,
  onSelectItem,
  onOpenFolder,
  onOpenFile,
  onContextMenu,
}: FileGridProps) => {
  const { t } = useTranslation();
  const allItems = [...folders, ...files];

  if (allItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64 text-center text-[#010000]/65">
        <p>{t("multimedia.noFilesOrFolder")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
      {allItems.map((item) => (
        <FileItem
          key={item.path}
          item={item}
          isSelected={selectedItems.includes(item.path)}
          onSelect={() => onSelectItem(item.path)}
          onDoubleClick={() => {
            if (item.type === "folder") {
              onOpenFolder(item.path);
            } else {
              onOpenFile(item as FileItemType);
            }
          }}
          onContextMenu={(e) => onContextMenu(e, item)}
        />
      ))}
    </div>
  );
};
