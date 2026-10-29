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
        relative min-w-0 group rounded-[28px] border cursor-pointer overflow-hidden
        transition-all duration-200
        ${
          isSelected
            ? "border-[#010000] bg-[#010000]/10 ring-1 ring-[#010000]"
            : "border-[#010000]/20 hover:border-[#010000]/60 hover:bg-[#010000]/5"
        }
      `}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircleIconSolid className="h-6 w-6 text-[#010000]" />
        </div>
      )}

      <div className="aspect-square relative bg-[#010000]/5 overflow-hidden">
        {isFile && fileItem ? (
          <img
            src={fileItem.url}
            alt={fileItem.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderIcon className="h-20 w-20 text-[#010000]/60" />
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-[#010000] break-all">
          {item.name}
        </p>
        {isFile && fileItem && (
          <p className="font-['Geist_Mono',monospace] text-xs text-[#010000]/65 mt-2">
            {(fileItem.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>
    </div>
  );
};
