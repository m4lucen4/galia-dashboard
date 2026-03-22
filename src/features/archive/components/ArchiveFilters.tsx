import { useState } from "react";
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type {
  ArchiveFilters as Filters,
  ArchiveAuthor,
  TagCategories,
} from "../../../redux/actions/ArchiveActions";

interface ArchiveFiltersProps {
  filters: Filters;
  tagCategories: TagCategories;
  allAuthors: ArchiveAuthor[];
  onChange: (filters: Filters) => void;
}

const PROJECT_CATEGORIES = [
  { value: "", label: "Todas" },
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "oficinas", label: "Oficinas" },
  { value: "hotelero", label: "Hotelero" },
  { value: "educacional", label: "Educacional" },
  { value: "sanitario", label: "Sanitario" },
  { value: "industrial", label: "Industrial" },
  { value: "urbanismo", label: "Urbanismo" },
  { value: "rehabilitación", label: "Rehabilitación" },
  { value: "interiorismo", label: "Interiorismo" },
];

const TAG_SECTIONS: {
  key: keyof TagCategories;
  label: string;
}[] = [
  { key: "iluminacion", label: "Iluminación" },
  { key: "tipo_plano", label: "Tipo de plano" },
  { key: "atmosfera_mood", label: "Atmósfera" },
  { key: "materiales_visibles", label: "Materiales" },
  { key: "elementos_arquitectonicos", label: "Elementos" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
      {children}
    </p>
  );
}

const COLLAPSED_LIMIT = 6;

function TagSection({
  label,
  available,
  selected,
  onToggle,
}: {
  label: string;
  available: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (available.length === 0) return null;

  const visible = expanded ? available : available.slice(0, COLLAPSED_LIMIT);

  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-col gap-0.5">
        {visible.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={`text-left text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center justify-between gap-1 ${
                active
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span className="truncate">{tag}</span>
              {active && <XMarkIcon className="h-3 w-3 shrink-0 opacity-60" />}
            </button>
          );
        })}
      </div>
      {available.length > COLLAPSED_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2"
        >
          <ChevronDownIcon
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          {expanded
            ? "Ver menos"
            : `+${available.length - COLLAPSED_LIMIT} más`}
        </button>
      )}
    </div>
  );
}

export function ArchiveFilters({
  filters,
  tagCategories,
  allAuthors,
  onChange,
}: ArchiveFiltersProps) {
  function toggleTag(key: keyof TagCategories, tag: string) {
    const current = filters[key] as string[];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    onChange({ ...filters, [key]: updated });
  }

  const hasFilters =
    filters.category ||
    filters.year ||
    filters.authorId ||
    TAG_SECTIONS.some((s) => (filters[s.key] as string[]).length > 0);

  return (
    <div className="flex flex-col gap-7">
      {/* Categoría de proyecto */}
      <div>
        <SectionLabel>Categoría</SectionLabel>
        <div className="flex flex-col gap-0.5">
          {PROJECT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ ...filters, category: c.value })}
              className={`text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${
                filters.category === c.value
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fotógrafo */}
      {allAuthors.length > 0 && (
        <div>
          <SectionLabel>Fotógrafo</SectionLabel>
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => onChange({ ...filters, authorId: "" })}
              className={`text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${
                filters.authorId === ""
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Todos
            </button>
            {allAuthors.map((author) => (
              <button
                key={author.id}
                type="button"
                onClick={() => onChange({ ...filters, authorId: author.id })}
                className={`text-left text-sm px-2 py-1.5 rounded-lg transition-colors truncate ${
                  filters.authorId === author.id
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {author.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Año */}
      <div>
        <SectionLabel>Año</SectionLabel>
        <input
          type="text"
          value={filters.year}
          onChange={(e) => onChange({ ...filters, year: e.target.value })}
          placeholder="Ej. 2023"
          maxLength={4}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-gray-400 shadow-sm transition-colors"
        />
      </div>

      {/* Tag categories */}
      {TAG_SECTIONS.map((section) => (
        <TagSection
          key={section.key}
          label={section.label}
          available={tagCategories[section.key]}
          selected={filters[section.key] as string[]}
          onToggle={(tag) => toggleTag(section.key, tag)}
        />
      ))}

      {/* Limpiar */}
      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            onChange({
              category: "",
              year: "",
              rating: filters.rating,
              authorId: "",
              iluminacion: [],
              tipo_plano: [],
              atmosfera_mood: [],
              materiales_visibles: [],
              elementos_arquitectonicos: [],
            })
          }
          className="text-xs text-gray-400 hover:text-gray-700 text-left transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
