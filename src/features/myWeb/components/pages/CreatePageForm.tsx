import type { HomeAnchorOption } from "@/helpers/siteAnchors";
import { PillButton } from "@/components/shared/ui/PillButton";
import {
  myWebControlClassName,
  myWebHeadingClassName,
  myWebLabelClassName,
  myWebMutedClassName,
  myWebPanelClassName,
} from "@/features/myWeb/components/myWebStyles";

interface CreatePageFormProps {
  pageType: "page" | "home_anchor";
  title: string;
  slug: string;
  slugError: string;
  target: string;
  anchors: HomeAnchorOption[];
  anchorsLoading: boolean;
  anchorMessage: string;
  creating: boolean;
  error: string;
  valid: boolean;
  onTypeChange: (value: "page" | "home_anchor") => void;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onRefresh: () => void;
  onCreate: () => void;
  onCancel: () => void;
}

// Controlled presentation only; creation and draft lifetime belong to the tab bar.
export function CreatePageForm(props: CreatePageFormProps) {
  return (
    <section className={myWebPanelClassName} aria-labelledby="create-page-heading">
      <div>
        <h3 id="create-page-heading" className={myWebHeadingClassName}>Añadir a tu web</h3>
        <p className={myWebMutedClassName}>Crea una página con contenido propio o un enlace a una sección de Inicio.</p>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className={myWebLabelClassName}>
          Tipo de elemento
          <select className={`${myWebControlClassName} mt-2`} value={props.pageType} onChange={(event) => props.onTypeChange(event.target.value as "page" | "home_anchor")}>
            <option value="page">Página con componentes</option>
            <option value="home_anchor">Enlace a Inicio</option>
          </select>
        </label>
        <label className={myWebLabelClassName}>
          Título
          <input autoFocus className={`${myWebControlClassName} mt-2`} value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} placeholder="Ej: Sobre nosotros" />
        </label>
        {props.pageType === "home_anchor" ? (
          <div className="min-w-0 space-y-2">
            <label className={myWebLabelClassName} htmlFor="new-anchor-target">Ancla de Inicio</label>
            <select id="new-anchor-target" className={myWebControlClassName} value={props.target} onChange={(event) => props.onTargetChange(event.target.value)} disabled={props.anchorsLoading}>
              <option value="">Selecciona un ancla</option>
              {props.anchors.map((anchor) => <option key={anchor.id} value={anchor.id}>#{anchor.anchor_id} · {anchor.type}{!anchor.visible ? " (oculto)" : ""}</option>)}
            </select>
            {!props.anchors.length && !props.anchorsLoading && <p className={myWebMutedClassName}>Añade primero un ancla a un componente de Inicio.</p>}
            {props.anchorMessage && <p role="alert" className="text-sm text-red-700">{props.anchorMessage}</p>}
            <PillButton variant="outline" onClick={props.onRefresh}>Actualizar anclas</PillButton>
          </div>
        ) : (
          <div className="min-w-0 space-y-2">
            <label className={myWebLabelClassName} htmlFor="new-page-slug">Slug (aparece en la URL)</label>
            <input id="new-page-slug" className={myWebControlClassName} value={props.slug} onChange={(event) => props.onSlugChange(event.target.value)} placeholder="Ej: sobre-nosotros" aria-invalid={!!props.slugError} aria-describedby={props.slugError ? "new-page-slug-error" : undefined} />
            {props.slugError && <p id="new-page-slug-error" className="text-sm text-red-700">{props.slugError}</p>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <PillButton onClick={props.onCreate} disabled={!props.valid || props.creating}>{props.creating ? "Creando..." : "Crear"}</PillButton>
        <PillButton variant="outline" onClick={props.onCancel}>Cancelar</PillButton>
      </div>
      {props.error && <p role="alert" className="text-sm text-red-700">{props.error}</p>}
    </section>
  );
}
