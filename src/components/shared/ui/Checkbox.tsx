import React from "react";

interface CheckboxProps {
  id: string;
  name?: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  name,
  label,
  checked,
  onChange,
  className,
}) => {
  return (
    <div className={["flex items-center", className].filter(Boolean).join(" ")}>
      <input
        type="checkbox"
        id={id}
        name={name ?? id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 text-black focus:ring-gray-400 border-gray-300 rounded"
      />
      <label
        htmlFor={id}
        className="ml-2 block text-sm text-gray-700 whitespace-nowrap"
      >
        {label}
      </label>
    </div>
  );
};
