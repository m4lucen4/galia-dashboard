import { useState, useRef, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type {
  ArchiveFilters as Filters,
  ArchiveAuthor,
} from "../../../redux/actions/ArchiveActions";

interface ArchiveFiltersProps {
  filters: Filters;
  allTags: string[];
  allAuthors: ArchiveAuthor[];
  onChange: (filters: Filters) => void;
}

const CATEGORIES = [
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
      {children}
    </p>
  );
}

export function ArchiveFilters({ filters, allTags, allAuthors, onChange }: ArchiveFiltersProps) {
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const suggestions =
    tagInput.length > 0
      ? allTags.filter(
          (t) =>
            t.toLowerCase().includes(tagInput.toLowerCase()) &&
            !filters.tags.includes(t),
        )
      : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addTag(tag: string) {
    if (!filters.tags.includes(tag)) {
      onChange({ ...filters, tags: [...filters.tags, tag] });
    }
    setTagInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange({ ...filters, tags: filters.tags.filter((t) => t !== tag) });
  }

  const hasFilters =
    filters.tags.length > 0 || filters.category || filters.year || filters.authorId;

  return (
    <div className="flex flex-col gap-7">
      {/* Category */}
      <div>
        <SectionLabel>Categoría</SectionLabel>
        <div className="flex flex-col gap-0.5">
          {CATEGORIES.map((c) => (
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

      {/* Authors */}
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

      {/* Year */}
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

      {/* Tags */}
      <div>
        <SectionLabel>Etiquetas</SectionLabel>
        <div className="relative" ref={dropdownRef}>
          <input
            ref={inputRef}
            type="text"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => tagInput.length > 0 && setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) addTag(suggestions[0]);
            }}
            placeholder="Buscar etiqueta..."
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-gray-400 shadow-sm transition-colors"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 w-full z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={() => addTag(tag)}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tag chips */}
        {filters.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {filters.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Clear all */}
      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            onChange({ tags: [], category: "", year: "", rating: filters.rating, authorId: "" })
          }
          className="text-xs text-gray-400 hover:text-gray-700 text-left transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
