import React, { useId } from "react";
import { myWebControlClassName, myWebLabelClassName } from "@/features/myWeb/components/myWebStyles";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
}) => {
  const id = useId();
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className={myWebLabelClassName}>{label}</label>
      <div className="flex min-w-0 items-center gap-3">
        <input
          type="color"
          aria-label={`${label}: selector de color`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-12 shrink-0 cursor-pointer rounded-2xl border border-[#010000]/40 bg-transparent p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={myWebControlClassName}
          placeholder="#000000"
        />
      </div>
    </div>
  );
};
