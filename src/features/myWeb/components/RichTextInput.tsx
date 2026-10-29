import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent, useEditorState, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { RichTextToolbar } from "@/features/myWeb/components/richText/RichTextToolbar";
import { LinkPopover } from "@/features/myWeb/components/richText/LinkPopover";
import type { LinkType } from "@/features/myWeb/components/richText/LinkPopover";
import { myWebLabelClassName, myWebMutedClassName } from "@/features/myWeb/components/myWebStyles";

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
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label || "Contenido de texto",
        "aria-invalid": error ? "true" : "false",
        class:
          "rich-text-editor min-h-[7rem] px-4 py-3 text-sm text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
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

  const dismissLinkPopover = () => {
    setLinkPopoverOpen(false);
    linkButtonRef.current?.focus();
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
    <div className="min-w-0 space-y-2">
      {label && <p className={myWebLabelClassName}>{label}</p>}
      <div className={`overflow-hidden rounded-2xl border ${error ? "border-red-500" : "border-[#010000]/40"}`}>
        <RichTextToolbar
          ready={!!editor}
          bold={editorState?.bold ?? false}
          italic={editorState?.italic ?? false}
          fontSizes={{ t1: editorState?.t1 ?? false, t2: editorState?.t2 ?? false, t3: editorState?.t3 ?? false }}
          alignment={editorState?.alignCenter ? "center" : editorState?.alignRight ? "right" : "left"}
          link={editorState?.link ?? false}
          linkOpen={linkPopoverOpen}
          linkButtonRef={linkButtonRef}
          onBold={() => editor?.chain().focus().toggleBold().run()}
          onItalic={() => editor?.chain().focus().toggleItalic().run()}
          onFontSize={handleFontSize}
          onAlign={(alignment) => editor?.chain().focus().setTextAlign(alignment).run()}
          onLink={openLinkPopover}
        />
        {linkPopoverOpen && createPortal(
          <LinkPopover
            popoverRef={linkPopoverRef}
            position={linkPopoverPos}
            type={linkType}
            value={linkValue}
            hasLink={editorState?.link ?? false}
            onTypeChange={setLinkType}
            onValueChange={setLinkValue}
            onApply={applyLink}
            onRemove={removeLink}
            onDismiss={dismissLinkPopover}
          />,
          document.body,
        )}
        <div className="relative">
          <EditorContent editor={editor} />
          {isEmpty && placeholder && <p className="pointer-events-none absolute left-4 top-3 select-none text-sm text-[#010000]/50">{placeholder}</p>}
        </div>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : (
        <p className={myWebMutedClassName}>
          <strong>N</strong> = negrita · <em>C</em> = cursiva · T1/T2/T3 = tamaño · 🔗 = enlace · Intro = nueva línea
        </p>
      )}
    </div>
  );
};
