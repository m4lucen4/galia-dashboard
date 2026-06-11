import React from "react";

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Franklin Gothic Book", value: "Libre Franklin" },
  { label: "Roboto", value: "Roboto" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Inter", value: "Inter" },
  { label: "Lato", value: "Lato" },
  { label: "Merriweather", value: "Merriweather" },
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
  return (
    <div>
      <label className="text-sm text-black">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 sm:text-sm/6"
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
