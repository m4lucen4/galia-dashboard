import React from "react";

interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  disabled = false,
  onChange,
  className,
}) => {
  return (
    <button
      disabled={disabled}
      type="button"
      className={`${
        checked ? "bg-black" : "bg-gray-200"
      } relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${className}`}
      role="switch"
      aria-checked={checked}
      onClick={onChange}
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        className={`${
          checked ? "translate-x-5" : "translate-x-0"
        } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );
};
