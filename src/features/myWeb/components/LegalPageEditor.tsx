import React, { useState } from "react";
import { SitePageDataProps } from "../../../types";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { updateSitePage } from "../../../redux/actions/SitePageActions";

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
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Escribe el contenido legal. Se respetarán los saltos de línea y tabulaciones.
        Para añadir un enlace usa el formato{" "}
        <code className="bg-gray-100 px-1 rounded">[texto](https://url.com)</code>.
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={18}
        className="w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 resize-y font-mono leading-relaxed"
        placeholder="Introduce aquí el texto del aviso legal y política de privacidad..."
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saveRequest.inProgress}
          className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50"
        >
          {saveRequest.inProgress ? "Guardando..." : "Guardar cambios"}
        </button>
        {saveRequest.ok && !saveRequest.inProgress && (
          <span className="text-xs text-green-600">Guardado correctamente</span>
        )}
        {saveRequest.messages && !saveRequest.inProgress && (
          <span className="text-xs text-red-600">{saveRequest.messages}</span>
        )}
      </div>
    </div>
  );
};
