import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  label: string;
  disabled?: boolean;
  children: ReactNode;
};

export const Tooltip = ({ label, disabled = false, children }: TooltipProps) => {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  const show = (element: HTMLElement) => {
    if (disabled) return;
    const rect = element.getBoundingClientRect();
    setPosition({ left: rect.right + 12, top: Math.min(window.innerHeight - 24, Math.max(24, rect.top + rect.height / 2)) });
  };

  return (
    <div
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={() => setPosition(null)}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={() => setPosition(null)}
      onKeyDown={(event) => { if (event.key === "Escape") setPosition(null); }}
      onWheel={() => setPosition(null)}
    >
      {children}
      {!disabled && position && createPortal(
        <span aria-hidden="true" style={position} className="pointer-events-none fixed z-60 -translate-y-1/2 rounded-xl bg-[#010000] px-3 py-2 font-['Hanken_Grotesk',system-ui,sans-serif] text-sm whitespace-nowrap text-[#d8e4d6] shadow-md">
          {label}
        </span>,
        document.body,
      )}
    </div>
  );
};
