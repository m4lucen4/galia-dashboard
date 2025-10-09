import React from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  disabled?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  value,
  disabled = false,
  onChange,
  options,
  required = false,
  className,
  placeholder,
}) => {
  const baseSelectClassName =
    "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  const selectClassName = className || baseSelectClassName;
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-base text-sm text-black" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-blue-600 font-medium">*</span>}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        disabled={disabled}
        onChange={onChange}
        className={selectClassName}
        required={required}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
