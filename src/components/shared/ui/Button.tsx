import React from "react";

interface ButtonProps {
  title: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  fullWidth?: boolean;
  secondary?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  disabled,
  type,
  onClick,
  fullWidth = false,
  secondary = false,
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`group relative ${
        fullWidth ? "w-full" : "w-auto"
      } flex justify-center py-2 px-4 border text-sm font-medium rounded-md ${
        secondary
          ? "bg-white text-black border-black hover:bg-gray-200"
          : "bg-black text-white border-transparent hover:bg-gray-800"
      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 disabled:bg-gray-400`}
    >
      {title}
    </button>
  );
};
