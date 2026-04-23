import React from "react";

const FONT_OPTIONS = [
  "Inter",
  "Playfair Display",
  "Montserrat",
  "Lora",
  "Raleway",
  "DM Sans",
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
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );
};
