import type { ReactNode } from "react";
import {
  myWebMutedClassName,
  myWebOptionClassName,
  myWebSelectedOptionClassName,
  myWebThumbnailClassName,
} from "@/features/myWeb/components/myWebStyles";

interface LayoutChoiceProps {
  label: string;
  preview: ReactNode;
  selected: boolean;
  onSelect: () => void;
  description?: string;
  disabled?: boolean;
}

// The preview is a thumbnail, not a canvas scaled to the available form width.
export const LayoutChoice = ({
  label,
  preview,
  selected,
  onSelect,
  description,
  disabled = false,
}: LayoutChoiceProps) => (
  <button
    type="button"
    aria-pressed={selected}
    disabled={disabled}
    onClick={onSelect}
    className={`${myWebOptionClassName} flex min-h-20 w-full items-center gap-3 ${selected ? myWebSelectedOptionClassName : ""}`}
  >
    <span aria-hidden="true" className={myWebThumbnailClassName}>{preview}</span>
    <span className="min-w-0 space-y-1 break-words text-sm">
      <span className="block font-medium">{label}</span>
      {description && <span className={`block ${myWebMutedClassName}`}>{description}</span>}
    </span>
  </button>
);
