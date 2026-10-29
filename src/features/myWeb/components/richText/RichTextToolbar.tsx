import type { ReactNode, RefObject } from "react";
import { myWebIconButtonClassName } from "@/features/myWeb/components/myWebStyles";

interface ToolButtonProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  onActivate: () => void;
  children: ReactNode;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  expanded?: boolean;
}

const ToolButton = ({ label, active, disabled, onActivate, children, buttonRef, expanded }: ToolButtonProps) => (
  <button
    ref={buttonRef}
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    aria-expanded={expanded}
    aria-haspopup={expanded === undefined ? undefined : "dialog"}
    disabled={disabled}
    // Keep the editor selection on pointer activation; click also handles Enter/Space.
    onMouseDown={(event) => event.preventDefault()}
    onClick={onActivate}
    className={`${myWebIconButtonClassName} text-sm ${active ? "bg-[#010000] text-[#d8e4d6] hover:bg-[#010000]" : ""}`}
  >
    {children}
  </button>
);

interface RichTextToolbarProps {
  ready: boolean;
  bold: boolean;
  italic: boolean;
  fontSizes: { t1: boolean; t2: boolean; t3: boolean };
  alignment: "left" | "center" | "right";
  link: boolean;
  linkOpen: boolean;
  linkButtonRef: RefObject<HTMLButtonElement | null>;
  onBold: () => void;
  onItalic: () => void;
  onFontSize: (key: "t1" | "t2" | "t3") => void;
  onAlign: (alignment: "left" | "center" | "right") => void;
  onLink: () => void;
}

export const RichTextToolbar = (props: RichTextToolbarProps) => (
  <div role="group" aria-label="Formato del texto" className="flex flex-wrap items-center gap-1 border-b border-[#010000]/20 p-2">
    <ToolButton label="Negrita" active={props.bold} disabled={!props.ready} onActivate={props.onBold}><strong>N</strong></ToolButton>
    <ToolButton label="Cursiva" active={props.italic} disabled={!props.ready} onActivate={props.onItalic}><em>C</em></ToolButton>
    {(["t1", "t2", "t3"] as const).map((key, index) => (
      <ToolButton key={key} label={`Tamaño ${index + 1}`} active={props.fontSizes[key]} disabled={!props.ready} onActivate={() => props.onFontSize(key)}>
        {key.toUpperCase()}
      </ToolButton>
    ))}
    <ToolButton label="Alinear a la izquierda" active={props.alignment === "left"} disabled={!props.ready} onActivate={() => props.onAlign("left")}>←</ToolButton>
    <ToolButton label="Centrar" active={props.alignment === "center"} disabled={!props.ready} onActivate={() => props.onAlign("center")}>↔</ToolButton>
    <ToolButton label="Alinear a la derecha" active={props.alignment === "right"} disabled={!props.ready} onActivate={() => props.onAlign("right")}>→</ToolButton>
    <ToolButton label="Añadir enlace" active={props.link} disabled={!props.ready} onActivate={props.onLink} buttonRef={props.linkButtonRef} expanded={props.linkOpen}>🔗</ToolButton>
  </div>
);
