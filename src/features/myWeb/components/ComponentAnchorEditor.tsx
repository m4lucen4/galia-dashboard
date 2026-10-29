import { useState } from "react";
import type { SiteComponentDataProps } from "@/types";
import { useAppDispatch } from "@/redux/hooks";
import { updateSiteComponent } from "@/redux/actions/SiteComponentActions";
import { normalizeAnchor } from "@/helpers/siteAnchors";
import { PillButton } from "@/components/shared/ui/PillButton";
import { myWebControlClassName, myWebLabelClassName, myWebMutedClassName } from "@/features/myWeb/components/myWebStyles";

// Metadata lives outside config: one editor covers every home block format.
export function ComponentAnchorEditor({ component }: { component: SiteComponentDataProps }) {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState(component.anchor_id ? `#${component.anchor_id}` : "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    let anchor: string | null;
    try { anchor = normalizeAnchor(value); }
    catch (error) { setMessage((error as Error).message); return; }
    setSaving(true);
    try {
      await dispatch(updateSiteComponent({ componentId: component.id, updates: { anchor_id: anchor } })).unwrap();
      setValue(anchor ? `#${anchor}` : "");
      setMessage("Ancla guardada");
    } catch (error) {
      setMessage(typeof error === "string" ? error : (error as { message?: string })?.message ?? "No se pudo guardar el ancla");
    } finally { setSaving(false); }
  };
  return (
    <div className="mb-5 min-w-0 space-y-3 border-b border-[#010000]/20 pb-5">
      <label className={myWebLabelClassName} htmlFor={`anchor-${component.id}`}>Ancla de Inicio (opcional)</label>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <input id={`anchor-${component.id}`} aria-describedby={`anchor-help-${component.id}`} className={`${myWebControlClassName} sm:max-w-sm`} value={value} placeholder="#ancla1" onChange={(e) => setValue(e.target.value)} />
        <PillButton variant="outline" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar ancla"}</PillButton>
      </div>
      <p id={`anchor-help-${component.id}`} className={myWebMutedClassName}>Usa esta referencia como destino de un enlace del menú. Para quitarla o borrar el bloque, cambia primero los enlaces que la utilizan.</p>
      {message && <p role="status" className="text-sm">{message}</p>}
    </div>
  );
}
