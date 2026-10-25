import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

type ButtonStyleProps = {
  variant?: "solid" | "outline" | "text";
};

const variantClasses = {
  solid: "bg-[#010000] text-[#d8e4d6] font-medium hover:bg-[#3a3a3a]",
  outline: "border-[#010000] bg-transparent text-[#010000] hover:bg-[#010000] hover:text-[#d8e4d6]",
  text: "px-3.5 bg-transparent text-[#010000] hover:bg-[#010000] hover:text-[#d8e4d6]",
};

const buttonClassName = (
  variant: NonNullable<ButtonStyleProps["variant"]>,
  className = "",
) =>
  twMerge(
    "inline-flex min-h-11 items-center justify-center rounded-[999px] border-[1.5px] border-solid border-transparent px-4.5 py-2.5 font-[inherit] text-[length:inherit] leading-[1.25] text-center no-underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
    variantClasses[variant],
    className,
  );

export const Button = ({
  variant = "solid",
  className = "",
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button"> & ButtonStyleProps) => (
  <button
    className={buttonClassName(variant, className)}
    type={type}
    {...props}
  />
);

type ButtonLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> &
  ButtonStyleProps & { href: string };

export const ButtonLink = ({
  variant = "solid",
  className = "",
  ...props
}: ButtonLinkProps) => (
  <a className={buttonClassName(variant, className)} {...props} />
);
