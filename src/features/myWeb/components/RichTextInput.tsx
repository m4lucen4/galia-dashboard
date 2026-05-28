import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent, useEditorState, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";

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

  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontSize],
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
      empty: editor.isEmpty,
    }),
  });

  const isBold = editorState?.bold ?? false;
  const isItalic = editorState?.italic ?? false;
  const isEmpty = editorState?.empty ?? isEffectivelyEmpty(value);

  const handleFontSize = (key: "t1" | "t2" | "t3") => {
    if (!editor) return;
    if (editorState?.[key]) {
      (editor.chain().focus() as unknown as { unsetFontSize: () => { run: () => boolean } }).unsetFontSize().run();
    } else {
      (editor.chain().focus() as unknown as { setFontSize: (s: string) => { run: () => boolean } }).setFontSize(FONT_SIZES[key]).run();
    }
  };

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
          <strong>N</strong> = negrita · <em>C</em> = cursiva · T1/T2/T3 = tamaño · Intro = nueva línea
        </p>
      )}
    </div>
  );
};
