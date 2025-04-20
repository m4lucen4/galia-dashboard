import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { RootState } from "../redux/store";
import {
  fetchUserByUid,
  updateUser,
  UpdateUserProps,
} from "../redux/actions/UserActions";
import { Drawer } from "../components/shared/ui/Drawer";
import { Alert } from "../components/shared/ui/Alert";
import { Button } from "../components/shared/ui/Button";
import { errorMessages } from "../helpers";
import { ProjectsForm } from "../components/projects/ProjectsForm";
import {
  addProject,
  CreateProjectProps,
  fetchProjects,
} from "../redux/actions/ProjectActions";
import { clearProjectErrors } from "../redux/slices/ProjectSlice";
import { ProjectsTable } from "../components/projects/ProjectsTable";

export const Projects = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { userData } = useAppSelector((state: RootState) => state.user);
  const { project, projectAddRequest, projects, projectsFetchRequest } =
    useAppSelector((state: RootState) => state.project);

  const errorMessage = errorMessages({
    addError: projectAddRequest.messages,
  });

  useEffect(() => {
    dispatch(fetchProjects());
    if (user?.uid) {
      dispatch(fetchUserByUid(user.uid));
    }
  }, [user, dispatch]);

  const handleOpenDrawer = () => {
    setIsEditMode(false);
    setDrawerOpen(true);
  };

  const handleEditProject = () => {
    setIsEditMode(true);
    setDrawerOpen(true);
  };

  const handleProjectSubmit = (formData: CreateProjectProps) => {
    if (isEditMode && project && userData) {
      const updateProject: UpdateUserProps = {
        id: project.id,
        uid: userData.uid,
      };

      dispatch(updateUser(updateProject))
        .unwrap()
        .then(() => {
          // Cuando la actualización sea exitosa, refrescamos la lista de usuarios
          dispatch(fetchProjects());
          setDrawerOpen(false);
        })
        .catch((error) => {
          console.error("Error al actualizar el usuario:", error);
          // El mensaje de error se mostrará a través del estado de Redux
        });
    } else {
      // Modo creación - usamos la acción addUser existente
      dispatch(addProject(formData))
        .unwrap()
        .then(() => {
          dispatch(fetchProjects());
          setDrawerOpen(false);
        })
        .catch((error) => {
          console.error("Error al crear el usuario:", error);
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
    };
  };

  if (!userData) {
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
          userData={userData}
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
