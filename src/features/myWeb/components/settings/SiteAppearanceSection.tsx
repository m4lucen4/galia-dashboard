import { myWebFieldGridClassName } from "@/features/myWeb/components/myWebStyles";
import { ColorPicker } from "@/features/myWeb/components/ColorPicker";
import { FontSelector } from "@/features/myWeb/components/FontSelector";
import {
  SettingsSection,
  type SiteSettingsSectionProps,
} from "@/features/myWeb/components/settings/SettingsSection";

export function SiteAppearanceSection({ draft, onChange }: SiteSettingsSectionProps) {
  return (
    <SettingsSection
      title="Colores y tipografía"
      description="Personaliza la identidad visual de tu web, sin cambiar el diseño del panel."
    >
      <div className={`${myWebFieldGridClassName} max-w-2xl`}>
        <ColorPicker
          label="Color primario"
          value={draft.primary_color}
          onChange={(primary_color) => onChange({ primary_color })}
        />
        <ColorPicker
          label="Color secundario"
          value={draft.secondary_color}
          onChange={(secondary_color) => onChange({ secondary_color })}
        />
        <ColorPicker
          label="Color de fondo"
          value={draft.background_color}
          onChange={(background_color) => onChange({ background_color })}
        />
        <ColorPicker
          label="Color terciario"
          value={draft.tertiary_color}
          onChange={(tertiary_color) => onChange({ tertiary_color })}
        />
        <FontSelector
          label="Fuente de títulos"
          value={draft.title_font}
          onChange={(title_font) => onChange({ title_font })}
        />
        <FontSelector
          label="Fuente de cuerpo"
          value={draft.font}
          onChange={(font) => onChange({ font })}
        />
      </div>
    </SettingsSection>
  );
}
