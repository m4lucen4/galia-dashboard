import { useEffect, useState } from "react";
import { Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { supabase } from "@/helpers/supabase";

const allowedKinds = ["info", "tip", "warning"] as const;

const MediaImageView = ({ node, selected }: NodeViewProps) => {
  const mediaId = typeof node.attrs.mediaId === "string" ? node.attrs.mediaId : "";
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
  const caption = typeof node.attrs.caption === "string" ? node.attrs.caption : "";
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    queueMicrotask(() => {
      if (!active) return;
      setUrl(null);
      setFailed(false);
    });

    if (!mediaId) return;
    void supabase.storage.from("wiki-media").download(mediaId).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        setFailed(true);
        return;
      }
      objectUrl = URL.createObjectURL(data);
      setUrl(objectUrl);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaId]);

  return (
    <NodeViewWrapper className={`my-5 rounded-xl border p-3 ${selected ? "border-gray-900" : "border-gray-200"}`}>
      {url ? <img src={url} alt={alt} className="max-h-96 w-full object-contain" /> : <p className="text-sm text-gray-500">{failed ? "No se ha podido cargar la imagen." : "Cargando imagen…"}</p>}
      {caption && <p className="mt-2 text-center text-sm text-gray-500">{caption}</p>}
    </NodeViewWrapper>
  );
};

export const WikiMediaImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({
    mediaId: { default: null },
    alt: { default: "" },
    caption: { default: "" },
    width: { default: null },
    height: { default: null },
  }),
  parseHTML: () => [],
  renderHTML: ({ HTMLAttributes }) => ["figure", HTMLAttributes],
  addNodeView: () => ReactNodeViewRenderer(MediaImageView),
});

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({
    kind: {
      default: "info",
      parseHTML: (element) => allowedKinds.includes(element.dataset.callout as typeof allowedKinds[number])
        ? element.dataset.callout
        : "info",
      renderHTML: (attributes) => ({ "data-callout": allowedKinds.includes(attributes.kind) ? attributes.kind : "info" }),
    },
  }),
  parseHTML: () => [{ tag: "aside[data-callout]" }],
  renderHTML: ({ HTMLAttributes }) => ["aside", HTMLAttributes, 0],
});
