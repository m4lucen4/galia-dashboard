import { useState } from "react";
import type { SitePageDataProps } from "../../../types";
import { useHomeAnchors } from "../../../hooks/useHomeAnchors";
import { useAppDispatch } from "../../../redux/hooks";
import { updateSitePage } from "../../../redux/actions/SitePageActions";

export function AnchorDestinationEditor({ page }: { page: SitePageDataProps }) {
  const dispatch = useAppDispatch();
  const { anchors, request, refresh } = useHomeAnchors(page.site_id);
  const [title, setTitle] = useState(page.title);
  const [target, setTarget] = useState(page.target_component_id ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const save = async () => {
    setSaving(true);
    try {
      await dispatch(updateSitePage({ pageId: page.id, updates: { title: title.trim(), target_component_id: target } })).unwrap();
      setMessage("Enlace guardado");
    } catch (error) {
      setMessage(typeof error === "string" ? error : (error as { message?: string })?.message ?? "No se pudo guardar el enlace");
    } finally { setSaving(false); }
  };
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Enlace a una sección de Inicio</h3>
      <p className="text-sm text-gray-500">Este elemento del menú no tiene componentes. Su destino sigue al componente aunque cambie el nombre del ancla.</p>
      <label className="block text-sm">Título
        <input className="block border rounded p-2" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="block text-sm">Ancla de Inicio
        <select className="block border rounded p-2" value={target} onChange={(e) => setTarget(e.target.value)} disabled={request.inProgress}>
          <option value="">Selecciona un ancla</option>
          {anchors.map((anchor) => <option key={anchor.id} value={anchor.id}>#{anchor.anchor_id} · {anchor.type}{!anchor.visible ? " (oculto: no aparece en el menú)" : ""}</option>)}
        </select>
      </label>
      {!anchors.length && !request.inProgress && <p className="text-sm">Añade primero un ancla a un componente de Inicio.</p>}
      {request.messages && <p role="alert">{request.messages}</p>}
      <button type="button" onClick={refresh} className="text-sm underline">Actualizar anclas</button>
      <button type="button" className="block border rounded px-3 py-2 disabled:opacity-40" onClick={save} disabled={saving || request.inProgress || !title.trim() || !anchors.some((anchor) => anchor.id === target)}>{saving ? "Guardando..." : "Guardar enlace"}</button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
