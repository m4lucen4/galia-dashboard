import { useId, type ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type SharedProps = {
  label: string;
  error?: string;
};
type FormFieldProps = SharedProps & (
  | ({ multiline: true } & ComponentPropsWithoutRef<"textarea">)
  | ({ multiline?: false } & ComponentPropsWithoutRef<"input">)
);

export function FormField({ label, error, className: customClassName, ...props }: FormFieldProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const className = "w-full min-w-0 border-[1.5px] border-[#010000] bg-[#ffffff] px-4 text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] disabled:cursor-wait";
  const accessibility = {
    id,
    "aria-invalid": error ? true as const : undefined,
    "aria-describedby": [props["aria-describedby"], error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined,
  };
  const { multiline, ...nativeProps } = props;
  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-[15px]">
      <label htmlFor={id}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
      {multiline ? (
        <textarea {...nativeProps as ComponentPropsWithoutRef<"textarea">} {...accessibility} className={twMerge(className, "min-h-22 rounded-[20px] py-3", customClassName)} />
      ) : (
        <input {...nativeProps as ComponentPropsWithoutRef<"input">} {...accessibility} className={twMerge(className, "h-12 rounded-full", customClassName)} />
      )}
      {error && <p id={`${id}-error`} className="text-sm font-medium">{error}</p>}
    </div>
  );
}
