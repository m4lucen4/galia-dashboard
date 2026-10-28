import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const SettingsSection = ({ title, subtitle, children }: SettingsSectionProps) => (
  <section className="min-w-0 rounded-[28px] border border-[#010000]/20 p-5 sm:p-7">
    <header className="mb-7 space-y-2">
      <h2 className="text-2xl font-medium tracking-[-0.03em]">{title}</h2>
      <p className="text-sm leading-relaxed text-[#010000]/65">{subtitle}</p>
    </header>
    {children}
  </section>
);
