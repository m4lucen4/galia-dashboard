import { useState } from "react";
import type { Editor } from "@tiptap/react";

const safeHref = (href: string) => /^(https?:\/\/[^\s]+|mailto:[^\s]+|\/[^\s]*|#[^\s]*)$/.test(href);

type ToolbarButtonProps = {
  name: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

const ToolbarButton = ({ name, active = false, disabled, onClick }: ToolbarButtonProps) => (
  <button
    type="button"
    title={name}
    aria-label={name}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    className={`rounded px-2 py-1 text-sm disabled:opacity-50 ${active ? "bg-gray-900 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
  >
    {name}
  </button>
);

type Props = {
  editor: Editor | null;
  disabled: boolean;
  onError: (message: string) => void;
};

export const WikiEditorToolbar = ({ editor, disabled, onError }: Props) => {
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const unavailable = disabled || !editor;
  const run = (command: () => boolean) => {
    if (!command()) onError("No se ha podido aplicar ese formato en la selección actual.");
  };

  const setLink = () => {
    const value = href.trim();
    if (!editor || !safeHref(value)) {
      onError("El enlace debe ser https, mailto, una ruta interna o un ancla.");
      return;
    }
    run(() => editor.chain().focus().setLink({ href: value }).run());
    setHref("");
    setLinkOpen(false);
  };

  const button = (name: string, command: () => boolean, active = false) => (
    <ToolbarButton name={name} active={active} disabled={unavailable} onClick={() => run(command)} />
  );

  return (
    <div className="border-y border-gray-200 py-3">
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((level) => button(
          `Título ${level}`,
          () => editor?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run() ?? false,
          editor?.isActive("heading", { level }),
        ))}
        {button("Negrita", () => editor?.chain().focus().toggleBold().run() ?? false, editor?.isActive("bold"))}
        {button("Cursiva", () => editor?.chain().focus().toggleItalic().run() ?? false, editor?.isActive("italic"))}
        {button("Tachado", () => editor?.chain().focus().toggleStrike().run() ?? false, editor?.isActive("strike"))}
        {button("Subrayado", () => editor?.chain().focus().toggleMark("underline").run() ?? false, editor?.isActive("underline"))}
        {button("Código", () => editor?.chain().focus().toggleCode().run() ?? false, editor?.isActive("code"))}
        {button("Lista", () => editor?.chain().focus().toggleBulletList().run() ?? false, editor?.isActive("bulletList"))}
        {button("Lista numerada", () => editor?.chain().focus().toggleOrderedList().run() ?? false, editor?.isActive("orderedList"))}
        {button("Cita", () => editor?.chain().focus().toggleBlockquote().run() ?? false, editor?.isActive("blockquote"))}
        {button("Bloque de código", () => editor?.chain().focus().toggleCodeBlock().run() ?? false, editor?.isActive("codeBlock"))}
        {button("Separador", () => editor?.chain().focus().setHorizontalRule().run() ?? false)}
        <ToolbarButton name="Enlace" active={editor?.isActive("link")} disabled={unavailable} onClick={() => setLinkOpen(true)} />
        {button("Quitar enlace", () => editor?.chain().focus().unsetLink().run() ?? false)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {button("Insertar tabla", () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() ?? false)}
        {button("Añadir fila", () => editor?.chain().focus().addRowAfter().run() ?? false)}
        {button("Eliminar fila", () => editor?.chain().focus().deleteRow().run() ?? false)}
        {button("Añadir columna", () => editor?.chain().focus().addColumnAfter().run() ?? false)}
        {button("Eliminar columna", () => editor?.chain().focus().deleteColumn().run() ?? false)}
        {button("Eliminar tabla", () => editor?.chain().focus().deleteTable().run() ?? false)}
        {(["info", "tip", "warning"] as const).map((kind) => button(
          `Aviso ${kind}`,
          () => editor?.chain().focus().toggleWrap("callout", { kind }).run() ?? false,
          editor?.isActive("callout", { kind }),
        ))}
      </div>
      {linkOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium" htmlFor="wiki-link">
            Enlace
            <input id="wiki-link" value={href} onChange={(event) => setHref(event.target.value)} placeholder="https:// o /ruta" className="mt-1 block rounded border border-gray-300 px-3 py-2" />
          </label>
          <button type="button" onClick={setLink} className="rounded bg-gray-900 px-3 py-2 text-sm text-white">Aplicar</button>
          <button type="button" onClick={() => setLinkOpen(false)} className="px-3 py-2 text-sm underline">Cancelar</button>
        </div>
      )}
    </div>
  );
};
