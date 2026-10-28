import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";
import { BrandMark } from "@/components/shared/ui/BrandMark";
import "@/features/newWeb/fonts.css";

export const AuthLayout = ({ children, wide = false, showHeader = true }: { children: ReactNode; wide?: boolean; showHeader?: boolean }) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col bg-[#d8e4d6] px-5 py-6 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000] sm:px-8 lg:px-10 [&_:where(a,button,input):focus-visible]:outline-2 [&_:where(a,button,input):focus-visible]:outline-solid [&_:where(a,button,input):focus-visible]:outline-[#010000] [&_:where(a,button,input):focus-visible]:outline-offset-4">
      {showHeader && (
        <header className="flex flex-wrap items-center justify-between gap-5">
          <Link to="/" className="rounded-full" aria-label="Mocklab: inicio"><BrandMark /></Link>
          <Link to="/" className="rounded-full text-sm underline underline-offset-4">{t("login.goBackWeb")}</Link>
        </header>
      )}
      <main className="flex flex-1 flex-col justify-center py-10 lg:py-14">
        <div className={twMerge("mx-auto w-full min-w-0", !wide && "max-w-lg")}>{children}</div>
      </main>
    </div>
  );
};

export const AuthPanel = ({ children }: { children: ReactNode }) => (
  <section className="rounded-[28px] border border-[#010000]/20 p-6 sm:p-8 lg:p-10">{children}</section>
);

export const AuthHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-8 space-y-3">
    <h1 className="text-3xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-4xl">{title}</h1>
    <p className="text-base leading-relaxed text-[#010000]/70">{subtitle}</p>
  </div>
);

export const AuthActionLink = ({ className, ...props }: ComponentProps<typeof Link>) => (
  <Link className={twMerge("inline-flex min-h-11 w-full items-center justify-center rounded-full border-[1.5px] border-[#010000] px-5 py-3 text-center text-sm leading-tight font-medium hover:bg-[#010000] hover:text-[#d8e4d6]", className)} {...props} />
);
