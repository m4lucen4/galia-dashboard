import React, { useState, KeyboardEvent, useRef, useEffect } from "react";

interface KeywordInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export const KeywordInput: React.FC<KeywordInputProps> = ({
  label,
  id,
  value,
  onChange,
  required = false,
  placeholder = "Add keywords...",
  disabled = false,
  error,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inicializar keywords desde el valor recibido
  useEffect(() => {
    if (value && keywords.length === 0) {
      setKeywords(value.split(",").filter((k) => k.trim() !== ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const addKeyword = (keyword: string) => {
    keyword = keyword.trim();
    if (keyword && !keywords.includes(keyword)) {
      const newKeywords = [...keywords, keyword];
      setKeywords(newKeywords);
      onChange(newKeywords.join(","));
    }
    setInputValue("");
  };

  const removeKeyword = (index: number) => {
    const newKeywords = keywords.filter((_, i) => i !== index);
    setKeywords(newKeywords);
    onChange(newKeywords.join(","));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      addKeyword(inputValue);
    } else if (
      e.key === "Backspace" &&
      inputValue === "" &&
      keywords.length > 0
    ) {
      removeKeyword(keywords.length - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addKeyword(inputValue);
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <label className="text-base text-sm text-black" htmlFor={id}>
        {label}
      </label>
      <div
        className={`flex flex-wrap gap-2 min-h-[38px] p-2 border rounded-md bg-white ${
          error ? "border-red-500" : "border-gray-300"
        } focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-gray-800`}
        onClick={focusInput}
      >
        {keywords.map((keyword, index) => (
          <div
            key={index}
            className="bg-gray-200 rounded-md px-2 py-1 flex items-center"
          >
            <span className="mr-1">{keyword}</span>
            <button
              type="button"
              className="text-gray-600 hover:text-gray-900"
              onClick={(e) => {
                e.stopPropagation();
                removeKeyword(index);
              }}
              disabled={disabled}
            >
              &times;
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          id={id}
          name={id}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={keywords.length === 0 ? placeholder : ""}
          disabled={disabled}
          required={required && keywords.length === 0}
          className="flex-grow outline-none min-w-[80px] bg-transparent"
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600" id={`${id}-error`}>
          {error}
        </p>
      )}
      {required && keywords.length === 0 && (
        <p className="mt-1 text-xs text-gray-500">
          Click space or enter to add keywords. Press backspace to remove the
          last
        </p>
      )}
    </div>
  );
};
