import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

interface AdministrationToolCardProps {
  title: string;
  description: string;
  actionLabel: string;
  to: string;
  icon: ReactNode;
}

export const AdministrationToolCard = ({
  title,
  description,
  actionLabel,
  to,
  icon,
}: AdministrationToolCardProps) => (
  <section className="flex min-w-0 flex-col items-start rounded-[28px] border border-[#010000]/20 p-5 sm:p-7">
    <div className="flex min-w-0 items-center gap-4">
      <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#010000]/5">
        {icon}
      </div>
      <h2 className="min-w-0 text-2xl font-medium tracking-[-0.03em]">{title}</h2>
    </div>
    <p className="mt-2 mb-7 text-sm leading-relaxed text-[#010000]/65">
      {description}
    </p>
    <Link
      to={to}
      className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-transparent bg-[#010000] px-5 py-3 text-sm leading-tight font-medium text-[#d8e4d6] hover:bg-[#3a3a3a] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-4"
    >
      {actionLabel}
      <ArrowUpRightIcon className="size-4 shrink-0" aria-hidden="true" />
    </Link>
  </section>
);
