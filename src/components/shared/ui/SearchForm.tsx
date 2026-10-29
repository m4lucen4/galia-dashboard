import { useId, useRef, useState, type FormEvent } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { twMerge } from "tailwind-merge";
import { PillButton } from "./PillButton";

interface SearchFormProps {
  label: string;
  buttonLabel: string;
  clearLabel?: string;
  placeholder?: string;
  className?: string;
  onSearch: (query: string) => void;
}

export const SearchForm = ({ label, buttonLabel, clearLabel = "Limpiar búsqueda", placeholder, className, onSearch }: SearchFormProps) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    setSubmittedQuery(trimmedQuery);
    onSearch(trimmedQuery);
  };

  const handleClear = () => {
    setQuery("");
    setSubmittedQuery("");
    onSearch("");
    inputRef.current?.focus();
  };

  return (
    <form role="search" aria-label={label} onSubmit={handleSubmit} className={twMerge("flex min-w-0 flex-wrap items-stretch gap-3 sm:flex-nowrap", className)}>
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <div className="relative min-w-0 flex-1 sm:min-w-56">
        <input
          ref={inputRef}
          id={inputId}
          name="query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="min-h-11 w-full min-w-0 rounded-full border-[1.5px] border-[#010000]/40 bg-transparent py-3 pr-12 pl-4 text-sm text-[#010000] placeholder:text-[#010000]/55 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 [&::-webkit-search-cancel-button]:hidden"
        />
        {(query || submittedQuery) && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={clearLabel}
            title={clearLabel}
            className="absolute inset-y-0 right-1 my-auto flex size-10 items-center justify-center rounded-full text-[#010000]/70 hover:bg-[#010000]/5 hover:text-[#010000] focus-visible:outline-2 focus-visible:outline-[#010000] focus-visible:outline-offset-2"
          >
            <XMarkIcon className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <PillButton type="submit" variant="outline" className="shrink-0">
        <MagnifyingGlassIcon className="size-4" aria-hidden="true" />
        {buttonLabel}
      </PillButton>
    </form>
  );
};
