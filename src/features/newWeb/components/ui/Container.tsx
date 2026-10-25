import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

export const Container = ({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) => (
  <div
    className={twMerge("mx-auto w-full max-w-360 px-(--new-web-gutter)", className)}
    {...props}
  />
);
