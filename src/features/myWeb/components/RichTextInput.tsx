import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent, useEditorState, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";

type LinkType = "url" | "email" | "tel";

const parseLinkHref = (href: string | undefined): { type: LinkType; value: string } => {
  if (!href) return { type: "url", value: "" };
  if (href.startsWith("mailto:")) return { type: "email", value: href.slice("mailto:".length) };
  if (href.startsWith("tel:")) return { type: "tel", value: href.slice("tel:".length) };
  return { type: "url", value: href };
};

const buildLinkHref = (type: LinkType, rawValue: string): string => {
  const value = rawValue.trim();
  if (!value) return "";
  if (type === "email") return `mailto:${value.replace(/^mailto:/, "")}`;
  if (type === "tel") return `tel:${value.replace(/^tel:/, "")}`;
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const FONT_SIZES: Record<"t1" | "t2" | "t3", string> = {
  t1: "2.25rem",
  t2: "1.5rem",
  t3: "1rem",
};

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) =>
              (el as HTMLElement).style.fontSize || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: { chain: () => { setMark: (name: string, attrs: Record<string, unknown>) => { run: () => boolean } } }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: { chain: () => { setMark: (name: string, attrs: Record<string, unknown>) => { removeEmptyTextStyle: () => { run: () => boolean } } } }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    } as never;
  },
});

interface RichTextInputProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
}

const isEffectivelyEmpty = (html: string) =>
  !html.replace(/<[^>]*>/g, "").trim();

export const RichTextInput: React.FC<RichTextInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
}) => {
  const syncingRef = useRef(false);
  const linkPopoverRef = useRef<HTMLDivElement>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkPopoverPos, setLinkPopoverPos] = useState({ top: 0, left: 0 });
  const [linkType, setLinkType] = useState<LinkType>("url");
  const [linkValue, setLinkValue] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (syncingRef.current) return;
      onChange(editor.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class:
          "rich-text-editor min-h-[5rem] px-3 py-2 text-sm text-gray-900 focus:outline-none",
      },
    },
  });

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      t1: editor.isActive("textStyle", { fontSize: FONT_SIZES.t1 }),
      t2: editor.isActive("textStyle", { fontSize: FONT_SIZES.t2 }),
      t3: editor.isActive("textStyle", { fontSize: FONT_SIZES.t3 }),
      alignLeft: editor.isActive({ textAlign: "left" }),
      alignCenter: editor.isActive({ textAlign: "center" }),
      alignRight: editor.isActive({ textAlign: "right" }),
      link: editor.isActive("link"),
      empty: editor.isEmpty,
    }),
  });

  const isBold = editorState?.bold ?? false;
  const isItalic = editorState?.italic ?? false;
  const isAlignCenter = editorState?.alignCenter ?? false;
  const isAlignRight = editorState?.alignRight ?? false;
  const isAlignLeft = !isAlignCenter && !isAlignRight;
  const isEmpty = editorState?.empty ?? isEffectivelyEmpty(value);

  const handleFontSize = (key: "t1" | "t2" | "t3") => {
    if (!editor) return;
    if (editorState?.[key]) {
      (editor.chain().focus() as unknown as { unsetFontSize: () => { run: () => boolean } }).unsetFontSize().run();
    } else {
      (editor.chain().focus() as unknown as { setFontSize: (s: string) => { run: () => boolean } }).setFontSize(FONT_SIZES[key]).run();
    }
  };

  const openLinkPopover = () => {
    if (!editor) return;
    const { type, value } = parseLinkHref(editor.getAttributes("link").href as string | undefined);
    setLinkType(type);
    setLinkValue(value);
    const rect = linkButtonRef.current?.getBoundingClientRect();
    if (rect) setLinkPopoverPos({ top: rect.bottom + 4, left: rect.left });
    setLinkPopoverOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    const href = buildLinkHref(linkType, linkValue);
    if (!href) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkPopoverOpen(false);
  };

  const removeLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkPopoverOpen(false);
  };

  useEffect(() => {
    if (!linkPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (linkPopoverRef.current?.contains(target)) return;
      if (linkButtonRef.current?.contains(target)) return;
      setLinkPopoverOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [linkPopoverOpen]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.getHTML() !== value) {
      syncingRef.current = true;
      editor.commands.setContent(value || "");
      setTimeout(() => { syncingRef.current = false; }, 0);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-900 mb-1">
          {label}
        </label>
      )}
      <div
        className={`rounded-md border overflow-hidden focus-within:ring-1 ${
          error
            ? "border-red-300 focus-within:ring-red-400 focus-within:border-red-400"
            : "border-gray-300 focus-within:ring-gray-500 focus-within:border-gray-500"
        }`}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor?.chain().focus().toggleBold().run();
            }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              isBold
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <strong>N</strong>
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor?.chain().focus().toggleItalic().run();
            }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              isItalic
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <em>C</em>
          </button>
          <span className="w-px h-4 bg-gray-200 mx-0.5" />
          {(["t1", "t2", "t3"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleFontSize(key);
              }}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                editorState?.[key]
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {key.toUpperCase()}
            </button>
          ))}
          <span className="w-px h-4 bg-gray-200 mx-0.5" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor?.chain().focus().setTextAlign("left").run();
            }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              isAlignLeft
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
            title="Alinear a la izquierda"
          >
            ←
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor?.chain().focus().setTextAlign("center").run();
            }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              isAlignCenter
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
            title="Centrar"
          >
            ↔
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor?.chain().focus().setTextAlign("right").run();
            }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              isAlignRight
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
            title="Alinear a la derecha"
          >
            →
          </button>
          <span className="w-px h-4 bg-gray-200 mx-0.5" />
          <button
            ref={linkButtonRef}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              openLinkPopover();
            }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              editorState?.link
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
            title="Añadir enlace"
          >
            🔗
          </button>
          {linkPopoverOpen &&
            createPortal(
              <div
                ref={linkPopoverRef}
                style={{ top: linkPopoverPos.top, left: linkPopoverPos.left }}
                className="fixed z-50 w-64 rounded-md border border-gray-200 bg-white p-2 shadow-lg"
              >
                <div className="flex rounded-md border border-gray-300 overflow-hidden mb-2">
                  {(
                    [
                      { value: "url", label: "Enlace" },
                      { value: "email", label: "Email" },
                      { value: "tel", label: "Teléfono" },
                    ] as const
                  ).map(({ value, label }, idx) => (
                    <button
                      key={value}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setLinkType(value);
                      }}
                      className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${idx > 0 ? "border-l border-gray-300" : ""} ${
                        linkType === value
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    }
                  }}
                  placeholder={
                    linkType === "email"
                      ? "nombre@ejemplo.com"
                      : linkType === "tel"
                        ? "+34 600 000 000"
                        : "https://ejemplo.com o /proyectos"
                  }
                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500 mb-2"
                />
                <div className="flex items-center justify-between gap-2">
                  {editorState?.link ? (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        removeLink();
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Quitar enlace
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyLink();
                    }}
                    disabled={!linkValue.trim()}
                    className="px-3 py-1 text-xs font-medium rounded bg-gray-900 text-white disabled:opacity-40"
                  >
                    Aplicar
                  </button>
                </div>
              </div>,
              document.body,
            )}
        </div>
        {/* Editor area */}
        <div className="relative">
          <EditorContent editor={editor} />
          {isEmpty && placeholder && (
            <p className="absolute top-2 left-3 text-sm text-gray-400 pointer-events-none select-none">
              {placeholder}
            </p>
          )}
        </div>
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-gray-400">
          <strong>N</strong> = negrita · <em>C</em> = cursiva · T1/T2/T3 = tamaño · 🔗 = enlace · Intro = nueva línea
        </p>
      )}
    </div>
  );
};
