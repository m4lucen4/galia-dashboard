import React from "react";

interface InputFieldProps {
  label: string;
  id: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  required?: boolean;
  type:
    | "text"
    | "email"
    | "checkbox"
    | "password"
    | "tel"
    | "number"
    | "url"
    | "textarea"
    | "date";
  value: string;
  error?: string;
  min?: string;
  helperText?: string;
  className?: string;
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
  min,
  helperText,
  className,
}) => {
  const baseClassName =
    "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 sm:text-sm/6";

  const inputClassName = className || baseClassName;

  return (
    <div>
      <label className="text-sm text-black" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-blue-600 font-medium">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          id={id}
          name={id}
          disabled={disabled}
          placeholder={placeholder}
          onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
          required={required}
          value={value}
          className={`${inputClassName} min-h-[6em]`}
          rows={6}
        />
      ) : (
        <input
          id={id}
          name={id}
          disabled={disabled}
          placeholder={placeholder}
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
          required={required}
          type={type}
          value={value}
          className={inputClassName}
          min={min}
        />
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" id={`${id}-error`}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p
          className="mt-2 text-xs text-gray-500 italic"
          id={`${id}-helper-text`}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};
