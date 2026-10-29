import { useId, type ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type TextFieldProps = ComponentPropsWithoutRef<"input"> & {
  label: string;
  error?: string;
};

export const TextField = ({ label, error, id: customId, name, className, ...props }: TextFieldProps) => {
  const generatedId = useId();
  const id = customId ?? generatedId;
  const describedBy = [props["aria-describedby"], error ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}{props.required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        {...props}
        id={id}
        name={name ?? id}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy}
        className={twMerge(
          "min-h-12 w-full min-w-0 rounded-full border-[1.5px] border-[#010000]/40 bg-transparent px-4 py-3 text-base text-[#010000] placeholder:text-[#010000]/50 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[#010000]",
          className,
        )}
      />
      {error && <p id={`${id}-error`} className="text-sm font-medium">{error}</p>}
    </div>
  );
};
