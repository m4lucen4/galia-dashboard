import React, { useState, useEffect, useRef } from "react";
import countriesData from "../../../assets/regions/countries.json";

interface Country {
  id: number;
  name: string;
  code: string;
}

const countries: Country[] = countriesData.result.records;

interface InputAutoCompleteProps {
  id: string;
  label: string;
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const InputAutoComplete: React.FC<InputAutoCompleteProps> = ({
  id,
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  className,
}) => {
  const getNameById = (id: number | null): string => {
    if (id === null) return "";
    return countries.find((c) => c.id === id)?.name || "";
  };

  const [inputValue, setInputValue] = useState(getNameById(value));
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<Country[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(getNameById(value));
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setInputValue(getNameById(value));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    if (text === "") {
      onChange(null);
      setIsOpen(false);
      return;
    }

    if (text.length >= 3) {
      const matches = countries.filter((c) =>
        c.name.toLowerCase().includes(text.toLowerCase()),
      );
      setFiltered(matches);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (country: Country) => {
    setInputValue(country.name);
    onChange(country.id);
    setIsOpen(false);
  };

  const baseClassName =
    "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 sm:text-sm/6";

  const inputClassName = className || baseClassName;

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm text-black" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-blue-600 font-medium">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        disabled={disabled}
        required={required}
        autoComplete="off"
        className={inputClassName}
      />
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">
              No hay coincidencias
            </li>
          ) : (
            filtered.map((country) => (
              <li
                key={country.id}
                onMouseDown={() => handleSelect(country)}
                className="px-3 py-2 text-sm text-gray-900 cursor-pointer hover:bg-gray-100"
              >
                {country.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
