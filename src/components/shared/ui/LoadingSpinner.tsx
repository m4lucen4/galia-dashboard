import { FC } from "react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  color?: "primary" | "secondary" | "white";
  fullPage?: boolean;
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = "medium",
  color = "primary",
  fullPage = false,
}) => {
  const sizeClasses = {
    small: "w-5 h-5 border-2",
    medium: "w-8 h-8 border-3",
    large: "w-12 h-12 border-4",
  };

  const colorClasses = {
    primary: "border-blue-500 border-t-transparent",
    secondary: "border-gray-500 border-t-transparent",
    white: "border-white border-t-transparent",
  };

  const spinnerClasses = `inline-block rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]}`;

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-50">
        <div className={spinnerClasses}></div>
      </div>
    );
  }

  return <div className={spinnerClasses}></div>;
};
