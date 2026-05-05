import React, { useEffect, useMemo } from "react";
import { SitePageDataProps, ProjectListConfig, ProjectListLayout, SiteComponentDataProps } from "../../../types";
import { LayoutSelector } from "./LayoutSelector";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { upsertProjectListComponent, saveProjectListOrder, saveProjectListHidden } from "../../../redux/actions/SiteComponentActions";
import { fetchProjects, fetchProjectsByUserId } from "../../../redux/actions/ProjectActions";
import { InformationCircleIcon, ChevronUpIcon, ChevronDownIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

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
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
        <InformationCircleIcon className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-600">
          Esta página muestra automáticamente todos tus proyectos.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-900 mb-2">Layout</p>
        <LayoutSelector
          value={currentLayout}
          onChange={handleLayoutChange}
          disabled={saveRequest.inProgress}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-900 mb-2">Orden de proyectos</p>
        {isLoadingProjects ? (
          <div className="flex items-center gap-2 py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
            <span className="text-sm text-gray-500">Cargando proyectos...</span>
          </div>
        ) : sortedProjects.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No hay proyectos disponibles.</p>
        ) : (
          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {sortedProjects.map((project, index) => {
              const projectId = String(project.id);
              const isHidden = hiddenProjects.includes(projectId);
              return (
                <div
                  key={project.id}
                  className={`flex items-center gap-2 p-2 border rounded-md ${isHidden ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200"}`}
                >
                  <span className="text-xs text-gray-400 font-mono w-16 shrink-0 truncate">
                    {projectId.slice(0, 8)}
                  </span>
                  <span className={`text-sm flex-1 truncate ${isHidden ? "text-gray-400 line-through" : "text-gray-800"}`}>
                    {project.title}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleHidden(projectId)}
                      disabled={saveRequest.inProgress}
                      className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={isHidden ? "Mostrar proyecto" : "Ocultar proyecto"}
                      title={isHidden ? "Mostrar proyecto" : "Ocultar proyecto"}
                    >
                      {isHidden
                        ? <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                        : <EyeIcon className="h-4 w-4 text-gray-600" />
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0 || saveRequest.inProgress}
                      className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Subir"
                    >
                      <ChevronUpIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, "down")}
                      disabled={index === sortedProjects.length - 1 || saveRequest.inProgress}
                      className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Bajar"
                    >
                      <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
