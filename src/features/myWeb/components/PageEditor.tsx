import React, { useEffect } from "react";
import { SitePageDataProps } from "../../../types";
import { ComponentList } from "./ComponentList";
import { ProjectsPageConfig } from "./ProjectsPageConfig";
import { LegalPageEditor } from "./LegalPageEditor";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { fetchSiteComponents } from "../../../redux/actions/SiteComponentActions";

interface PageEditorProps {
  page: SitePageDataProps;
}

export const PageEditor: React.FC<PageEditorProps> = ({ page }) => {
  const dispatch = useAppDispatch();
  const { components } = useAppSelector((state) => state.siteComponent);

  useEffect(() => {
    if (page.slug !== "aviso-legal") {
      dispatch(fetchSiteComponents(page.id));
    }
  }, [dispatch, page.id, page.slug]);

  if (page.slug === "aviso-legal") {
    return <LegalPageEditor page={page} />;
  }

  const pageComponents = components.filter((c) => c.page_id === page.id);

  if (page.slug === "proyectos") {
    return <ProjectsPageConfig page={page} components={pageComponents} />;
  }

  return <ComponentList pageId={page.id} components={pageComponents} />;
};
