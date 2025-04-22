import React, { ReactNode } from "react";

interface ButtonProps {
  title?: string;
  icon?: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  fullWidth?: boolean;
  secondary?: boolean;
  iconPosition?: "left" | "right";
}

export const Button: React.FC<ButtonProps> = ({
  title,
  icon,
  disabled,
  type,
  onClick,
  fullWidth = false,
  secondary = false,
  iconPosition = "left",
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`group relative ${
        fullWidth ? "w-full" : "w-auto"
      } flex items-center justify-center py-2 px-4 border text-sm font-medium rounded-md ${
        secondary
          ? "bg-white text-black border-black hover:bg-gray-200"
          : "bg-black text-white border-transparent hover:bg-gray-800"
      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 disabled:bg-gray-400`}
    >
      {/* If there's an icon and position is left */}
      {icon && iconPosition === "left" && (
        <span className={`${title ? "mr-2" : ""}`}>{icon}</span>
      )}

      {/* If there´s title */}
      {title && <span>{title}</span>}

      {/* If there's an icon and position is right */}
      {icon && iconPosition === "right" && (
        <span className={`${title ? "ml-2" : ""}`}>{icon}</span>
      )}
    </button>
  );
};
