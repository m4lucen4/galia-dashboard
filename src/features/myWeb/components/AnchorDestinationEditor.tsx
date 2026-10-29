import { useState } from "react";
import type { SitePageDataProps } from "@/types";
import { useHomeAnchors } from "@/hooks/useHomeAnchors";
import { useAppDispatch } from "@/redux/hooks";
import { updateSitePage } from "@/redux/actions/SitePageActions";
import { PillButton } from "@/components/shared/ui/PillButton";
import {
  myWebControlClassName,
  myWebHeadingClassName,
  myWebLabelClassName,
  myWebMutedClassName,
  myWebPanelClassName,
} from "@/features/myWeb/components/myWebStyles";

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
    <section className={myWebPanelClassName} aria-labelledby={`destination-heading-${page.id}`}>
      <h3 id={`destination-heading-${page.id}`} className={myWebHeadingClassName}>Enlace a una sección de Inicio</h3>
      <p className={myWebMutedClassName}>Este elemento del menú no tiene componentes. Su destino sigue al componente aunque cambie el nombre del ancla.</p>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <label className={myWebLabelClassName}>Título
          <input className={`${myWebControlClassName} mt-2`} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={myWebLabelClassName}>Ancla de Inicio
          <select className={`${myWebControlClassName} mt-2`} value={target} onChange={(e) => setTarget(e.target.value)} disabled={request.inProgress}>
            <option value="">Selecciona un ancla</option>
            {anchors.map((anchor) => <option key={anchor.id} value={anchor.id}>#{anchor.anchor_id} · {anchor.type}{!anchor.visible ? " (oculto: no aparece en el menú)" : ""}</option>)}
          </select>
        </label>
      </div>
      {!anchors.length && !request.inProgress && <p className={myWebMutedClassName}>Añade primero un ancla a un componente de Inicio.</p>}
      {request.messages && <p role="alert">{request.messages}</p>}
      <div className="flex flex-wrap gap-3">
        <PillButton variant="outline" onClick={refresh}>Actualizar anclas</PillButton>
        <PillButton onClick={save} disabled={saving || request.inProgress || !title.trim() || !anchors.some((anchor) => anchor.id === target)}>{saving ? "Guardando..." : "Guardar enlace"}</PillButton>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
