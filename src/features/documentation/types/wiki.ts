export type WikiMark =
  | { type: "bold" | "italic" | "strike" | "code" | "underline" }
  | { type: "link"; attrs: { href: string } };

export type WikiNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: WikiMark[];
  content?: WikiNode[];
};

export type WikiDocument = { type: "doc"; content: WikiNode[] };

export type WikiArticleNavigation = {
  id: string;
  title: string;
  slug: string;
  position: number;
  canonicalLink: string;
};

export type WikiSubsectionNavigation = {
  id: string;
  title: string;
  slug: string;
  position: number;
  articles: WikiArticleNavigation[];
};

export type WikiSectionNavigation = {
  id: string;
  title: string;
  slug: string;
  position: number;
  subsections: WikiSubsectionNavigation[];
};

export type WikiArticle = WikiArticleNavigation & {
  summary: string;
  content: WikiDocument;
  publishedAt: string;
};

export type WikiSection = Omit<WikiSectionNavigation, "subsections"> & {
  subsections: Array<Omit<WikiSubsectionNavigation, "articles"> & { articles: WikiArticle[] }>;
};

export type WikiSearchResult = {
  section_id: string;
  section_slug: string;
  article_id: string;
  article_slug: string;
  title: string;
  summary: string;
  rank: number;
};

export type WikiRequest = { inProgress: boolean; messages: string; ok: boolean };
