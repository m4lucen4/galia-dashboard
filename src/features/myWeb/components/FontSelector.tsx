import React, { useId } from "react";
import { myWebControlClassName, myWebLabelClassName } from "@/features/myWeb/components/myWebStyles";

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Franklin Gothic Book", value: "Libre Franklin" },
  { label: "Roboto", value: "Roboto" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Inter", value: "Inter" },
  { label: "Lato", value: "Lato" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "Fraunces", value: "Fraunces" },
  { label: "Plus Jakarta Sans", value: "Plus Jakarta Sans" },
  { label: "Newsreader", value: "Newsreader" },
];

interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
  label?: string;
}

export const FontSelector: React.FC<FontSelectorProps> = ({
  value,
  onChange,
  label = "Fuente",
}) => {
  const id = useId();
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className={myWebLabelClassName}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={myWebControlClassName}
      >
        {FONT_OPTIONS.map((font) => (
          <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
            {font.label}
          </option>
        ))}
      </select>
    </div>
  );
};
