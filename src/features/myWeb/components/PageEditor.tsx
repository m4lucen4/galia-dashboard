import React, { useEffect } from "react";
import { SitePageDataProps } from "@/types";
import { ComponentList } from "@/features/myWeb/components/ComponentList";
import { AnchorDestinationEditor } from "@/features/myWeb/components/AnchorDestinationEditor";
import { ProjectsPageConfig } from "@/features/myWeb/components/ProjectsPageConfig";
import { LegalPageEditor } from "@/features/myWeb/components/LegalPageEditor";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchSiteComponents } from "@/redux/actions/SiteComponentActions";

interface PageEditorProps {
  page: SitePageDataProps;
}

export const PageEditor: React.FC<PageEditorProps> = ({ page }) => {
  const dispatch = useAppDispatch();
  const { components } = useAppSelector((state) => state.siteComponent);

  useEffect(() => {
    if (page.page_type !== "home_anchor" && page.slug !== "aviso-legal" && page.slug !== "politica-cookies") {
      dispatch(fetchSiteComponents(page.id));
    }
  }, [dispatch, page.id, page.slug, page.page_type]);

  if (page.page_type === "home_anchor") {
    return <AnchorDestinationEditor key={`${page.id}:${page.title}:${page.target_component_id}`} page={page} />;
  }

  if (page.slug === "aviso-legal" || page.slug === "politica-cookies") {
    return <LegalPageEditor page={page} />;
  }

  const pageComponents = components.filter((c) => c.page_id === page.id);

  if (page.slug === "proyectos") {
    return <ProjectsPageConfig page={page} components={pageComponents} />;
  }

  return <ComponentList pageId={page.id} components={pageComponents} isHome={page.slug === "home"} />;
};
