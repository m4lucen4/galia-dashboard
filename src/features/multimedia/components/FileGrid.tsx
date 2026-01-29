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
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>{t("multimedia.noFilesOrFolder")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
