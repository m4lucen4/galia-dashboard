import { useId } from "react";
import { NavbarTypeSelector } from "@/features/myWeb/components/NavbarTypeSelector";
import {
  SettingsSection,
  type SiteSettingsSectionProps,
} from "@/features/myWeb/components/settings/SettingsSection";

function NavigationToggle({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  const id = useId();
  return (
    <label
      className="flex min-h-11 cursor-pointer items-center justify-between gap-5 rounded-2xl border border-[#010000]/20 p-4"
      htmlFor={id}
    >
      <span className="min-w-0 space-y-1">
        <span className="block text-sm font-medium">{label}</span>
        <span id={`${id}-description`} className="block text-sm text-[#010000]/65">
          {description}
        </span>
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-describedby={`${id}-description`}
        className="size-5 shrink-0 accent-[#010000] focus-visible:outline-2 focus-visible:outline-offset-4"
      />
    </label>
  );
}

export function SiteNavigationSection({ draft, onChange }: SiteSettingsSectionProps) {
  return (
    <SettingsSection
      title="Navegación y estructura"
      description="Elige cómo se recorre tu web y cómo se distribuye el contenido."
    >
      <NavigationToggle
        label="Ocultar navbar"
        description="La web no muestra ningún menú de navegación, ni siquiera al hacer scroll."
        checked={draft.navbar_hidden}
        onChange={() => onChange({ navbar_hidden: !draft.navbar_hidden })}
      />
      {!draft.navbar_hidden && (
        <>
          <NavbarTypeSelector
            value={draft.navbar_type}
            onChange={(navbar_type) => onChange({ navbar_type })}
          />
          <NavigationToggle
            label="Navbar transparente"
            description="En escritorio, el menú arranca transparente y muestra fondo al hacer scroll. En móvil siempre tiene fondo."
            checked={draft.navbar_transparent}
            onChange={() => onChange({ navbar_transparent: !draft.navbar_transparent })}
          />
        </>
      )}
      <NavigationToggle
        label="Ocultar footer"
        description="La web no muestra ningún pie de página."
        checked={draft.footer_hidden}
        onChange={() => onChange({ footer_hidden: !draft.footer_hidden })}
      />
      <NavigationToggle
        label="Web a ancho completo"
        description="La web ocupa todo el ancho de la pantalla en lugar de un ancho fijo."
        checked={draft.full_width}
        onChange={() => onChange({ full_width: !draft.full_width })}
      />
    </SettingsSection>
  );
}
