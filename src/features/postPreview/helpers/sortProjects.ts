import type { PreviewProjectDataProps } from "@/types";

/** Order of the publication cards: drafts first, then the latest publish date first. */
export const sortPreviewProjects = (
  projects: PreviewProjectDataProps[],
): PreviewProjectDataProps[] =>
  [...projects].sort((a, b) => {
    if (a.state !== b.state) {
      if (a.state === "preview") return -1;
      if (b.state === "preview") return 1;
    }

    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return (
      new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
  });
