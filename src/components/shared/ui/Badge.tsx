import React from "react";

interface BadgeProps {
  title: string;
  extraInfo?: string;
  primaryColor: "green" | "yellow" | "blue" | "red" | "gray";
  url?: string;
}

const colorClasses = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  blue: "bg-blue-100 text-blue-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-800",
};

export const Badge: React.FC<BadgeProps> = ({
  title,
  extraInfo,
  primaryColor,
  url,
}) => {
  const handleClick = () => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="relative group">
      <span
        className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-medium ${
          url ? "cursor-pointer hover:opacity-80" : "cursor-help"
        } ${colorClasses[primaryColor]}`}
        onClick={handleClick}
      >
        {title}
      </span>

      {extraInfo && (
        <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
            {extraInfo}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};
