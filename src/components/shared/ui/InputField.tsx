import React, { useState, useEffect } from "react";

interface InputFieldProps {
  label: string;
  id: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  required?: boolean;
  type:
    | "text"
    | "email"
    | "checkbox"
    | "password"
    | "tel"
    | "number"
    | "url"
    | "textarea"
    | "date"
    | "dateTime";
  value: string;
  error?: string;
  min?: string;
  helperText?: string;
  className?: string;
}

// Generate time slots in 15-minute intervals
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slots.push(timeString);
    }
  }
  return slots;
};

// Parse timestampz format (e.g., "2025-06-06 00:00:00+00") to date and time
const parseTimestampz = (
  timestampz: string
): { date: string; time: string } => {
  if (!timestampz) {
    return { date: "", time: "00:00" };
  }

  // Extract date and time from format "YYYY-MM-DD HH:mm:ss+00"
  const match = timestampz.match(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})/);
  if (match) {
    return { date: match[1], time: match[2] };
  }

  return { date: "", time: "00:00" };
};

// Format date and time to timestampz format
const formatToTimestampz = (date: string, time: string): string => {
  if (!date) return "";
  const timeValue = time || "00:00";
  return `${date} ${timeValue}:00+00`;
};

export const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder = "",
  id,
  disabled = false,
  onChange,
  required,
  type,
  value,
  error,
  min,
  helperText,
  className,
}) => {
  const baseClassName =
    "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 sm:text-sm/6";

  const inputClassName = className || baseClassName;

  // State for dateTime type
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("00:00");

  // Parse initial value for dateTime type
  useEffect(() => {
    if (type === "dateTime" && value) {
      const parsed = parseTimestampz(value);
      setDateValue(parsed.date);
      setTimeValue(parsed.time);
    }
  }, [type, value]);

  // Handle date change for dateTime type
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDateValue(newDate);

    if (onChange) {
      const timestampz = formatToTimestampz(newDate, timeValue);
      // Create a synthetic event with the combined value
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: timestampz },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  // Handle time change for dateTime type
  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);

    if (onChange) {
      const timestampz = formatToTimestampz(dateValue, newTime);
      // Create a synthetic event with the combined value
      const syntheticEvent = {
        target: { value: timestampz, name: id },
        currentTarget: { value: timestampz, name: id },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  const timeSlots = generateTimeSlots();

  return (
    <div>
      <label className="text-sm text-black" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-blue-600 font-medium">*</span>}
      </label>
      {type === "dateTime" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              id={`${id}-date`}
              name={`${id}-date`}
              disabled={disabled}
              onChange={handleDateChange}
              required={required}
              type="date"
              value={dateValue}
              className={inputClassName}
              min={min}
            />
          </div>
          <div>
            <select
              id={`${id}-time`}
              name={`${id}-time`}
              disabled={disabled}
              onChange={handleTimeChange}
              required={required}
              value={timeValue}
              className={inputClassName}
            >
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : type === "textarea" ? (
        <textarea
          id={id}
          name={id}
          disabled={disabled}
          placeholder={placeholder}
          onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
          required={required}
          value={value}
          className={`${inputClassName} min-h-[6em]`}
          rows={6}
        />
      ) : (
        <input
          id={id}
          name={id}
          disabled={disabled}
          placeholder={placeholder}
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
          required={required}
          type={type}
          value={value}
          className={inputClassName}
          min={min}
        />
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" id={`${id}-error`}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p
          className="mt-2 text-xs text-gray-500 italic"
          id={`${id}-helper-text`}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};
