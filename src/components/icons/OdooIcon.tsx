import React from "react";
import odooLogo from "../../assets/odoo.svg";

interface OdooIconProps {
  className?: string;
  size?: number;
}

export const OdooIcon: React.FC<OdooIconProps> = ({
  className = "",
  size = 20,
}) => {
  return (
    <img
      src={odooLogo}
      alt="Odoo"
      width={size}
      height={size}
      className={`rounded-sm ${className}`}
      title="Usuario vinculado a Odoo"
    />
  );
};
