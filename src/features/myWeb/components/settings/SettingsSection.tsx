import type { ReactNode } from "react";
import type { SiteLanguageSettings } from "@/helpers/siteLanguages";
import { myWebHeadingClassName, myWebMutedClassName } from "@/features/myWeb/components/myWebStyles";

export interface SiteSettingsDraft extends SiteLanguageSettings {
  studio_name: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  tertiary_color: string;
  font: string;
  title_font: string;
  navbar_type: number;
  navbar_transparent: boolean;
  navbar_hidden: boolean;
  footer_hidden: boolean;
  full_width: boolean;
  instagram_url: string;
  facebook_url: string;
  linkedin_url: string;
  meta_description: string;
}

export interface SiteSettingsSectionProps {
  draft: SiteSettingsDraft;
  onChange: (updates: Partial<SiteSettingsDraft>) => void;
}

export function SettingsSection({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 max-w-3xl space-y-4 border-t border-[#010000]/15 pt-5" aria-label={title}>
      <div className="space-y-1">
        <h3 className={myWebHeadingClassName}>{title}</h3>
        <p className={myWebMutedClassName}>{description}</p>
      </div>
      {children}
    </section>
  );
}
