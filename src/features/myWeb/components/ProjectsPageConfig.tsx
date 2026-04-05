import React from "react";
import { SitePageDataProps, ProjectListConfig, ProjectListLayout, SiteComponentDataProps } from "../../../types";
import { LayoutSelector } from "./LayoutSelector";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { upsertProjectListComponent } from "../../../redux/actions/SiteComponentActions";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

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

  const projectListComponent = components.find(
    (c) => c.page_id === page.id && c.type === "project_list",
  );

  const currentLayout: ProjectListLayout =
    projectListComponent &&
    !Array.isArray(projectListComponent.config) &&
    (projectListComponent.config as ProjectListConfig).layout
      ? (projectListComponent.config as ProjectListConfig).layout
      : "grid-4";

  const handleLayoutChange = (layout: ProjectListLayout) => {
    dispatch(upsertProjectListComponent({ pageId: page.id, layout }));
  };

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
    </div>
  );
};
