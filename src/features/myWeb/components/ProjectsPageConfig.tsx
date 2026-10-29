import React, { useEffect, useMemo } from "react";
import { SitePageDataProps, ProjectListConfig, ProjectListLayout, SiteComponentDataProps } from "@/types";
import { LayoutSelector } from "@/features/myWeb/components/LayoutSelector";
import { DetailTypeSelector } from "@/features/myWeb/components/DetailTypeSelector";
import { ProjectOrderList } from "@/features/myWeb/components/projects/ProjectOrderList";
import { myWebMutedClassName, myWebPanelClassName } from "@/features/myWeb/components/myWebStyles";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  upsertProjectListComponent,
  saveProjectListOrder,
  saveProjectListHidden,
  saveProjectListDetailType,
  saveProjectListShowDescriptions,
} from "@/redux/actions/SiteComponentActions";
import { fetchProjects, fetchProjectsByUserId } from "@/redux/actions/ProjectActions";

interface ProjectsPageConfigProps {
  page: SitePageDataProps;
  components: SiteComponentDataProps[];
}

export const ProjectsPageConfig: React.FC<ProjectsPageConfigProps> = ({
  page,
  components,
}) => {
  const dispatch = useAppDispatch();
  const { saveRequest } = useAppSelector((state) => state.siteComponent);
  const { projects, projectsFetchRequest, projectFetchByUserIdRequest } = useAppSelector((state) => state.project);
  const user = useAppSelector((state) => state.auth.user);

  const projectListComponent = components.find(
    (c) => c.page_id === page.id && c.type === "project_list",
  );

  const config = projectListComponent && !Array.isArray(projectListComponent.config)
    ? (projectListComponent.config as ProjectListConfig)
    : null;

  const currentLayout: ProjectListLayout = config?.layout ?? "grid-4";
  const currentOrder: string[] | undefined = config?.project_order;
  const hiddenProjects: string[] = config?.hidden_projects ?? [];
  const currentDetailType: 1 | 2 = config?.detail_type ?? 1;
  const showDescriptions = config?.show_descriptions ?? true;

  useEffect(() => {
    if (projects.length === 0 && user?.uid) {
      if (user.role === "admin") {
        dispatch(fetchProjects());
      } else {
        dispatch(fetchProjectsByUserId(user.uid));
      }
    }
  }, [dispatch, projects.length, user]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (currentOrder && currentOrder.length > 0) {
        const ai = currentOrder.indexOf(String(a.id));
        const bi = currentOrder.indexOf(String(b.id));
        if (ai === -1 && bi === -1) {
          return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
        }
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });
  }, [projects, currentOrder]);

  const handleLayoutChange = (layout: ProjectListLayout) => {
    dispatch(upsertProjectListComponent({ pageId: page.id, layout }));
  };

  const handleDetailTypeChange = (detail_type: 1 | 2) => {
    dispatch(saveProjectListDetailType({ pageId: page.id, detail_type }));
  };

  const handleShowDescriptionsChange = (show_descriptions: boolean) => {
    dispatch(saveProjectListShowDescriptions({ pageId: page.id, show_descriptions }));
  };

  const handleToggleHidden = (projectId: string) => {
    const isHidden = hiddenProjects.includes(projectId);
    const updated = isHidden
      ? hiddenProjects.filter((id) => id !== projectId)
      : [...hiddenProjects, projectId];
    dispatch(saveProjectListHidden({ pageId: page.id, hidden_projects: updated }));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newSorted = [...sortedProjects];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newSorted[index], newSorted[swapIndex]] = [newSorted[swapIndex], newSorted[index]];
    dispatch(saveProjectListOrder({ pageId: page.id, project_order: newSorted.map((p) => String(p.id)) }));
  };

  const isLoadingProjects = projectsFetchRequest.inProgress || projectFetchByUserIdRequest.inProgress;

  return (
    <div className="min-w-0 space-y-5 text-[#010000]">
      <p className={myWebMutedClassName}>Esta página muestra automáticamente todos tus proyectos. Personaliza su presentación y visibilidad.</p>
      <section className={myWebPanelClassName} aria-labelledby={`project-layout-${page.id}`}>
        <h3 id={`project-layout-${page.id}`} className="text-lg font-medium">Presentación de las tarjetas</h3>
        <LayoutSelector value={currentLayout} onChange={handleLayoutChange} disabled={saveRequest.inProgress} />
        <div className="space-y-1">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl text-sm font-medium">
            <input
              type="checkbox"
              checked={showDescriptions}
              onChange={(event) => handleShowDescriptionsChange(event.target.checked)}
              disabled={saveRequest.inProgress}
              className="size-5 shrink-0 accent-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
            />
            Mostrar descripciones en las tarjetas
          </label>
          <p className={myWebMutedClassName}>Se aplica a las tarjetas de ambos diseños de proyectos, no al detalle del proyecto.</p>
        </div>
      </section>
      <section className={myWebPanelClassName} aria-labelledby={`project-detail-${page.id}`}>
        <h3 id={`project-detail-${page.id}`} className="text-lg font-medium">Diseño del detalle de proyecto</h3>
        <DetailTypeSelector value={currentDetailType} onChange={handleDetailTypeChange} disabled={saveRequest.inProgress} />
      </section>
      <section className={myWebPanelClassName} aria-label="Proyectos de tu web">
        <ProjectOrderList
          projects={sortedProjects}
          hiddenProjects={hiddenProjects}
          loading={isLoadingProjects}
          disabled={saveRequest.inProgress}
          onToggleHidden={handleToggleHidden}
          onMove={handleMove}
        />
      </section>
    </div>
  );
};
