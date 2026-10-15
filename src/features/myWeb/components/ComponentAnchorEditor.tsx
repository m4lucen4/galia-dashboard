import { useState } from "react";
import type { SiteComponentDataProps } from "../../../types";
import { useAppDispatch } from "../../../redux/hooks";
import { updateSiteComponent } from "../../../redux/actions/SiteComponentActions";
import { normalizeAnchor } from "../../../helpers/siteAnchors";

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
    <div className="mb-4 space-y-2 border-b pb-4">
      <label className="block text-sm" htmlFor={`anchor-${component.id}`}>Ancla de Inicio (opcional)</label>
      <input id={`anchor-${component.id}`} className="border rounded p-2 text-sm" value={value} placeholder="#ancla1" onChange={(e) => setValue(e.target.value)} />
      <button type="button" className="ml-2 text-sm underline disabled:opacity-40" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar ancla"}</button>
      <p className="text-xs text-gray-500">Usa esta referencia como destino de un enlace del menú. Para quitarla o borrar el bloque, cambia primero los enlaces que la utilizan.</p>
      {message && <p role="status" className="text-sm">{message}</p>}
    </div>
  );
}
