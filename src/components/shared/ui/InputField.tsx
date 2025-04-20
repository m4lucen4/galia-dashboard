import React from "react";

interface InputFieldProps {
  label: string;
  id: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type: "text" | "email" | "checkbox" | "password" | "tel" | "number" | "url";
  value: string;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder = "",
  id,
  disabled = false,
  onChange,
  required,
  type,
  value,
  error,
}) => {
  return (
    <div>
      <label className="text-base text-sm text-black" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        disabled={disabled}
        placeholder={placeholder}
        onChange={onChange}
        required={required}
        type={type}
        value={value}
        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 sm:text-sm/6"
      />
      {error && (
        <p className="mt-2 text-sm text-red-600" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};
