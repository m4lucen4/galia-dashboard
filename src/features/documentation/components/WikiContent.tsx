import { useEffect, useState } from "react";
import { supabase } from "@/helpers/supabase";
import type { WikiMark, WikiNode } from "../types/wiki";

const safeHref = (href: string) => /^(https?:\/\/[^\s]+|mailto:[^\s]+|\/[^\s]*|#[^\s]*)$/.test(href) ? href : null;
const attrs = (node: WikiNode) => node.attrs ?? {};

function MediaImage({ node }: { node: WikiNode }) {
  const mediaId = typeof attrs(node).mediaId === "string" ? String(attrs(node).mediaId) : "";
  const alt = typeof attrs(node).alt === "string" ? String(attrs(node).alt) : "";
  const caption = typeof attrs(node).caption === "string" ? String(attrs(node).caption) : "";
  const [image, setImage] = useState<{ mediaId: string; url: string | null; failed: boolean }>({ mediaId: "", url: null, failed: false });
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (!mediaId) return;
    supabase.storage.from("wiki-media").download(mediaId).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) { setImage({ mediaId, url: null, failed: true }); return; }
      objectUrl = URL.createObjectURL(data); setImage({ mediaId, url: objectUrl, failed: false });
    });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [mediaId]);
  const visible = image.mediaId === mediaId ? image : { url: null, failed: false };
  return <figure className="my-6"><div className="min-h-40 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">{visible.url && <img src={visible.url} alt={alt} loading="lazy" className="max-h-[32rem] w-full object-contain" />}{!visible.url && <span className="text-sm text-gray-500">{visible.failed ? "No se ha podido cargar la imagen." : "Cargando imagen…"}</span>}</div>{caption && <figcaption className="mt-2 text-center text-sm text-gray-500">{caption}</figcaption>}</figure>;
}

function MarkedText({ node }: { node: WikiNode }) {
  let value: React.ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    value = applyMark(mark, value);
  }
  return <>{value}</>;
}

function applyMark(mark: WikiMark, value: React.ReactNode) {
  if (mark.type === "bold") return <strong>{value}</strong>;
  if (mark.type === "italic") return <em>{value}</em>;
  if (mark.type === "strike") return <s>{value}</s>;
  if (mark.type === "underline") return <u>{value}</u>;
  if (mark.type === "code") return <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">{value}</code>;
  if (mark.type !== "link") return value;
  const href = safeHref(mark.attrs.href);
  return href ? <a href={href} className="text-blue-700 underline" target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>{value}</a> : value;
}

export function WikiContent({ nodes }: { nodes: WikiNode[] }) {
  return <>{nodes.map((node, index) => <WikiNodeView key={`${node.type}-${index}`} node={node} />)}</>;
}

function WikiNodeView({ node }: { node: WikiNode }) {
  const children = <WikiContent nodes={node.content ?? []} />;
  if (node.type === "text") return <MarkedText node={node} />;
  if (node.type === "paragraph") return <p className="my-4 leading-7 text-gray-700">{children}</p>;
  if (node.type === "heading") { const level = Number(attrs(node).level); if (level === 1) return <h1 className="mt-10 scroll-mt-24 text-4xl font-bold text-gray-900">{children}</h1>; if (level === 3) return <h3 className="mt-8 scroll-mt-24 text-xl font-bold text-gray-900">{children}</h3>; return <h2 className="mt-10 scroll-mt-24 text-2xl font-bold text-gray-900">{children}</h2>; }
  if (node.type === "bulletList") return <ul className="my-4 list-disc space-y-2 pl-6 text-gray-700">{children}</ul>;
  if (node.type === "orderedList") return <ol className="my-4 list-decimal space-y-2 pl-6 text-gray-700">{children}</ol>;
  if (node.type === "listItem") return <li>{children}</li>;
  if (node.type === "blockquote") return <blockquote className="my-6 border-l-4 border-gray-300 pl-4 italic text-gray-600">{children}</blockquote>;
  if (node.type === "codeBlock") return <pre className="my-6 overflow-x-auto rounded-xl bg-gray-900 p-4 text-sm text-gray-100"><code>{children}</code></pre>;
  if (node.type === "hardBreak") return <br />;
  if (node.type === "horizontalRule") return <hr className="my-8 border-gray-200" />;
  if (node.type === "image") return <MediaImage node={node} />;
  if (node.type === "callout") { const kind = attrs(node).kind === "warning" ? "border-amber-300 bg-amber-50" : attrs(node).kind === "tip" ? "border-green-300 bg-green-50" : "border-blue-300 bg-blue-50"; return <aside className={`my-6 rounded-xl border px-5 py-2 ${kind}`}>{children}</aside>; }
  if (node.type === "table") return <div className="my-6 overflow-x-auto"><table className="w-full border-collapse border border-gray-200">{children}</table></div>;
  if (node.type === "tableRow") return <tr>{children}</tr>;
  if (node.type === "tableHeader" || node.type === "tableCell") { const Tag = node.type === "tableHeader" ? "th" : "td"; const colspan = Math.min(Math.max(Number(attrs(node).colspan) || 1, 1), 20); const rowspan = Math.min(Math.max(Number(attrs(node).rowspan) || 1, 1), 20); return <Tag colSpan={colspan} rowSpan={rowspan} className="border border-gray-200 p-3 text-left align-top">{children}</Tag>; }
  return null;
}
