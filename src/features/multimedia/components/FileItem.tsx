import { FileItem as FileItemType, FolderItem } from "../../../types";
import { FolderIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleIconSolid } from "@heroicons/react/24/solid";

interface FileItemProps {
  item: FileItemType | FolderItem;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const FileItem = ({
  item,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: FileItemProps) => {
  const isFile = item.type === "file";
  const fileItem = isFile ? (item as FileItemType) : null;

  return (
    <div
      className={`
        relative group rounded-lg border-2 cursor-pointer
        transition-all duration-200
        ${
          isSelected
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-gray-300 hover:shadow-md"
        }
      `}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircleIconSolid className="h-6 w-6 text-blue-600" />
        </div>
      )}

      <div className="aspect-square relative bg-gray-100 rounded-t-lg overflow-hidden">
        {isFile && fileItem ? (
          <img
            src={fileItem.url}
            alt={fileItem.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderIcon className="h-20 w-20 text-gray-400" />
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">
          {item.name}
        </p>
        {isFile && fileItem && (
          <p className="text-xs text-gray-500 mt-1">
            {(fileItem.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>
    </div>
  );
};
