import React, { useState, useRef, useEffect, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ALL_ICONS = Object.entries(LucideIcons).filter(
  ([name, value]) =>
    /^[A-Z]/.test(name) &&
    value != null &&
    name !== "createLucideIcon",
) as [string, LucideIcon][];

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_ICONS.slice(0, 80);
    const q = search.toLowerCase();
    return ALL_ICONS.filter(([name]) => name.toLowerCase().includes(q)).slice(
      0,
      120,
    );
  }, [search]);

  const SelectedIcon = value
    ? (LucideIcons as unknown as Record<string, LucideIcon>)[value]
    : null;

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm text-black">Icono del botón</label>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors"
        >
          {SelectedIcon ? (
            <>
              <SelectedIcon className="h-4 w-4" />
              <span className="text-xs text-gray-500">{value}</span>
            </>
          ) : (
            <span className="text-gray-400 text-xs">Sin icono</span>
          )}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Quitar
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar icono..."
              className="w-full rounded-md px-2 py-1.5 text-sm border border-gray-300 focus:outline-none focus:border-gray-600"
            />
          </div>
          <div className="grid grid-cols-8 gap-1 p-2 max-h-52 overflow-y-auto">
            {filtered.map(([name, Icon]) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                  setSearch("");
                }}
                className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                  value === name
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="p-3 text-xs text-gray-400 text-center">
              Sin resultados
            </p>
          )}
        </div>
      )}
    </div>
  );
};
