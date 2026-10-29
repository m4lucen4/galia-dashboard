import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, ProjectColumnsConfig } from "@/types";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateSiteComponent } from "@/redux/actions/SiteComponentActions";
import { PillButton } from "@/components/shared/ui/PillButton";
import { myWebPanelClassName, myWebControlClassName, myWebOptionClassName, myWebSelectedOptionClassName } from "@/features/myWeb/components/myWebStyles";

interface ProjectColumnsEditorProps {
  component: SiteComponentDataProps;
}

const defaultConfig: ProjectColumnsConfig = {
  columns: 1,
  project_1: undefined,
  project_2: undefined,
  vertical_align_1: "top",
  vertical_align_2: "top",
  horizontal_align: "between",
  width_1col: "full",
};

const VERTICAL_OPTIONS: { value: "top" | "center" | "bottom"; label: string }[] = [
  { value: "top", label: "Arriba" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Abajo" },
];

const HORIZONTAL_OPTIONS: { value: "start" | "end" | "between" | "stretch"; label: string }[] = [
  { value: "start", label: "Inicio" },
  { value: "end", label: "Fin" },
  { value: "between", label: "Entre" },
  { value: "stretch", label: "Expandir" },
];

const WIDTH_1COL_OPTIONS: { value: "full" | "80" | "50"; label: string }[] = [
  { value: "full", label: "Ancho completo" },
  { value: "80", label: "80%" },
  { value: "50", label: "50%" },
];

export const ProjectColumnsEditor: React.FC<ProjectColumnsEditorProps> = ({ component }) => {
  const dispatch = useAppDispatch();
  const { projects } = useAppSelector((state) => state.project);

  const [form, setForm] = useState<ProjectColumnsConfig>(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "columns" in cfg) return cfg as ProjectColumnsConfig;
    return defaultConfig;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cfg = component.config;
    if (!Array.isArray(cfg) && "columns" in cfg) {
      setForm(cfg as ProjectColumnsConfig);
    }
  }, [component.config]);

  const handleColumnsChange = (value: 1 | 2) => {
    setForm((prev) => ({
      ...prev,
      columns: value,
      project_2: value === 1 ? undefined : prev.project_2,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dispatch(
        updateSiteComponent({
          componentId: component.id,
          updates: { config: form },
        }),
      ).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const selectClass = (active: boolean) =>
    `min-h-11 text-sm font-medium ${myWebOptionClassName} ${active ? myWebSelectedOptionClassName : ""}`;

  return (
    <div className={`@container text-[#010000] ${myWebPanelClassName}`}>
      {/* Número de columnas */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-2">Número de columnas</p>
        <div className="flex flex-wrap gap-2">
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={form.columns === n}
              onClick={() => handleColumnsChange(n)}
              className={`flex-1 ${selectClass(form.columns === n)}`}
            >
              {n === 1 ? "1 columna" : "2 columnas"}
            </button>
          ))}
        </div>
      </div>

      {/* Selección de proyectos */}
      <div className="space-y-4">
        {([1, 2] as const).map((col) => {
          if (col === 2 && form.columns === 1) return null;
          const field = col === 1 ? "project_1" : "project_2";
          return (
            <label key={col} className="block min-w-0 space-y-2">
              <span className="block text-sm font-medium">
                {form.columns === 2 ? `Proyecto — columna ${col}` : "Proyecto"}
              </span>
              <select
                value={form[field] ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [field]: e.target.value || undefined }))
                }
                className={myWebControlClassName}
              >
                <option value="">— Selecciona un proyecto —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      {/* Alineación vertical */}
      {(["vertical_align_1", "vertical_align_2"] as const).map((field, i) => {
        if (i === 1 && form.columns === 1) return null;
        const label = form.columns === 2 ? `Alineación vertical — columna ${i + 1}` : "Alineación vertical";
        return (
          <div key={field}>
            <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
            <div className="flex flex-wrap gap-2">
              {VERTICAL_OPTIONS.map(({ value, label: optLabel }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form[field] === value}
                  onClick={() => setForm((prev) => ({ ...prev, [field]: value }))}
                  className={`flex-1 ${selectClass(form[field] === value)}`}
                >
                  {optLabel}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Ancho — solo 1 columna */}
      {form.columns === 1 && (
        <div>
          <p className="text-sm font-medium text-gray-900 mb-2">Ancho del proyecto</p>
          <div className="flex flex-wrap gap-2">
            {WIDTH_1COL_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={(form.width_1col ?? "full") === value}
                onClick={() => setForm((prev) => ({ ...prev, width_1col: value }))}
                className={`flex-1 ${selectClass((form.width_1col ?? "full") === value)}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alineación horizontal — solo 2 columnas */}
      {form.columns === 2 && (
        <div>
          <p className="text-sm font-medium text-gray-900 mb-2">Alineación horizontal</p>
          <div className="grid grid-cols-2 gap-2">
            {HORIZONTAL_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={form.horizontal_align === value}
                onClick={() => setForm((prev) => ({ ...prev, horizontal_align: value }))}
                className={selectClass(form.horizontal_align === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Guardar */}
      <div className="flex flex-wrap items-center gap-3">
        <PillButton onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </PillButton>
        {saved && <span role="status" className="text-sm">Cambios guardados</span>}
      </div>
    </div>
  );
};
