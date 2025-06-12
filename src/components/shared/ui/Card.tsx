import React from "react";
import { useNavigate } from "react-router-dom";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  navigateTo?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  navigateTo,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (navigateTo) {
      navigate(navigateTo);
    }
  };
  return (
    <div
      className={`bg-white border border-black rounded-lg shadow-md overflow-hidden ${
        navigateTo ? "cursor-pointer hover:shadow-lg transition-shadow" : ""
      }`}
      onClick={handleClick}
    >
      {title && (
        <div className="px-6 pt-4">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        </div>
      )}
      {subtitle && (
        <div className="px-6">
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};
