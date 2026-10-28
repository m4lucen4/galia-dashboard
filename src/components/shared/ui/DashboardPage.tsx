import type { ComponentPropsWithoutRef } from "react";
import { twMerge } from "tailwind-merge";

export const DashboardPage = ({ className, ...props }: ComponentPropsWithoutRef<"div">) => (
  <div className={twMerge("w-full min-w-0 px-5 py-6 sm:px-8 lg:px-10", className)} {...props} />
);
