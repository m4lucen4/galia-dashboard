import React, { useState } from "react";
import { SiteComponentDataProps, SeparatorConfig } from "../../../types";
import { useAppDispatch } from "../../../redux/hooks";
import { updateSiteComponent } from "../../../redux/actions/SiteComponentActions";

interface SeparatorEditorProps {
  component: SiteComponentDataProps;
}

const SIZES: { value: SeparatorConfig["size"]; label: string; barHeight: number }[] = [
  { value: "small", label: "Pequeño", barHeight: 16 },
  { value: "medium", label: "Mediano", barHeight: 32 },
  { value: "large", label: "Grande", barHeight: 52 },
];

const defaultConfig: SeparatorConfig = { size: "medium" };

export const SeparatorEditor: React.FC<SeparatorEditorProps> = ({ component }) => {
  const dispatch = useAppDispatch();

  const cfg = component.config;
  const currentSize: SeparatorConfig["size"] =
    !Array.isArray(cfg) && "size" in cfg
      ? (cfg as SeparatorConfig).size
      : defaultConfig.size;

  const [selected, setSelected] = useState<SeparatorConfig["size"]>(currentSize);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (size: SeparatorConfig["size"]) => {
    if (size === selected) return;
    setSelected(size);
    setSaving(true);
    try {
      await dispatch(
        updateSiteComponent({
          componentId: component.id,
          updates: { config: { size } },
        }),
      ).unwrap();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-900">Tamaño del separador</p>
      <div className="grid grid-cols-3 gap-3">
        {SIZES.map(({ value, label, barHeight }) => (
          <button
            key={value}
            type="button"
            disabled={saving}
            onClick={() => handleSelect(value)}
            className={`flex flex-col items-center justify-end gap-2 rounded-lg border-2 p-3 transition-colors ${
              selected === value
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 bg-white hover:border-gray-400"
            }`}
            style={{ height: "88px" }}
          >
            <div
              className="w-full rounded bg-gray-300"
              style={{ height: `${barHeight}px` }}
            />
            <span className="text-xs font-medium text-gray-700">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
