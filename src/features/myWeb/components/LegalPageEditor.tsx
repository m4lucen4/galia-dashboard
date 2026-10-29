import React, { useState } from "react";
import { SitePageDataProps } from "@/types";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateSitePage } from "@/redux/actions/SitePageActions";
import { PillButton } from "@/components/shared/ui/PillButton";
import {
  myWebControlClassName,
  myWebHeadingClassName,
  myWebLabelClassName,
  myWebMutedClassName,
  myWebPanelClassName,
} from "@/features/myWeb/components/myWebStyles";

interface LegalPageEditorProps {
  page: SitePageDataProps;
}

export const LegalPageEditor: React.FC<LegalPageEditorProps> = ({ page }) => {
  const dispatch = useAppDispatch();
  const { saveRequest } = useAppSelector((state) => state.sitePage);
  const [prevPageId, setPrevPageId] = useState(page.id);
  const [content, setContent] = useState(page.content ?? "");

  if (prevPageId !== page.id) {
    setPrevPageId(page.id);
    setContent(page.content ?? "");
  }

  const handleSave = () => {
    dispatch(updateSitePage({ pageId: page.id, updates: { content } }));
  };

  return (
    <section className={`${myWebPanelClassName} w-full`} aria-labelledby={`legal-heading-${page.id}`}>
      <h3 id={`legal-heading-${page.id}`} className={myWebHeadingClassName}>{page.title}</h3>
      <p id={`legal-help-${page.id}`} className={myWebMutedClassName}>
        Escribe el contenido legal. Se respetarán los saltos de línea y tabulaciones.
        Para añadir un enlace usa el formato{" "}
        <code className="rounded bg-[#010000]/5 px-1">[texto](https://url.com)</code>.
      </p>

      <label className={myWebLabelClassName} htmlFor={`legal-content-${page.id}`}>Contenido legal</label>
      <textarea
        id={`legal-content-${page.id}`}
        aria-describedby={`legal-help-${page.id}`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        className={`${myWebControlClassName} resize-y leading-relaxed`}
        placeholder="Introduce aquí el texto del aviso legal y política de privacidad..."
      />

      <div className="flex flex-wrap items-center gap-3">
        <PillButton
          onClick={handleSave}
          disabled={saveRequest.inProgress}
        >
          {saveRequest.inProgress ? "Guardando..." : "Guardar cambios"}
        </PillButton>
        {saveRequest.ok && !saveRequest.inProgress && (
          <span role="status" className="text-sm text-green-800">Guardado correctamente</span>
        )}
        {saveRequest.messages && !saveRequest.inProgress && (
          <span role="alert" className="text-sm text-red-700">{saveRequest.messages}</span>
        )}
      </div>
    </section>
  );
};
