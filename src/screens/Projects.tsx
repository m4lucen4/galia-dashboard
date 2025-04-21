import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { RootState } from "../redux/store";
import { Drawer } from "../components/shared/ui/Drawer";
import { Alert } from "../components/shared/ui/Alert";
import { Button } from "../components/shared/ui/Button";
import { errorMessages } from "../helpers";
import { ProjectsForm } from "../components/projects/ProjectsForm";
import {
  addProject,
  CreateProjectProps,
  updateProject,
} from "../redux/actions/ProjectActions";
import {
  clearProjectErrors,
  clearSelectedProject,
} from "../redux/slices/ProjectSlice";
import { ProjectsTable } from "../components/projects/ProjectsTable";
import { useProjectsData } from "../hooks/useProjectsData";

export const Projects = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { project, projectAddRequest, projects, projectsFetchRequest } =
    useAppSelector((state: RootState) => state.project);

  const fetchProjectsData = useProjectsData(user);
  const errorMessage = errorMessages({
    addError: projectAddRequest.messages,
  });

  console.log("proyecto", project);

  useEffect(() => {
    fetchProjectsData();
  }, [fetchProjectsData]);

  const handleOpenDrawer = () => {
    setIsEditMode(false);
    setDrawerOpen(true);
  };

  const handleEditProject = () => {
    dispatch(clearSelectedProject());
    setIsEditMode(true);
    setDrawerOpen(true);
  };

  const handleProjectSubmit = (formData: CreateProjectProps) => {
    if (isEditMode && project) {
      const updateData = {
        ...formData,
        id: project.id,
      };

      dispatch(updateProject(updateData))
        .unwrap()
        .then(() => {
          fetchProjectsData();
          setDrawerOpen(false);
        });
    } else {
      dispatch(addProject(formData))
        .unwrap()
        .then(() => {
          fetchProjectsData();
          setDrawerOpen(false);
        });
    }
  };

  const getFormData = () => {
    if (!project) return undefined;

    return {
      id: project.id,
      title: project.title,
      state: project.state,
      description: project.description,
      keywords: project.keywords,
      user: project.user,
      weblink: project.weblink,
      image_data: project.image_data,
    };
  };

  if (!user) {
    return;
  }

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">Projects</h3>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
          From here you can create and edit project drafts and launch them for
          the first publication version
        </p>
      </div>
      <Button title="Create new project" onClick={handleOpenDrawer} />
      <Drawer
        title={isEditMode ? "Edit Project" : "Create Project"}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <ProjectsForm
          initialData={isEditMode ? getFormData() : undefined}
          onSubmit={handleProjectSubmit}
          loading={projectAddRequest.inProgress}
          isEditMode={isEditMode}
          user={user}
        />
      </Drawer>
      <ProjectsTable
        projects={projects}
        isLoading={projectsFetchRequest.inProgress}
        onEditProject={handleEditProject}
      />
      {errorMessage && (
        <Alert
          title="Error"
          description={errorMessage}
          onAccept={() => dispatch(clearProjectErrors())}
        />
      )}
    </div>
  );
};
