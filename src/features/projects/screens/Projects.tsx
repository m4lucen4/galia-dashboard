import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import { Drawer } from "../../../components/shared/ui/Drawer";
import { Alert } from "../../../components/shared/ui/Alert";
import { Button } from "../../../components/shared/ui/Button";
import { errorMessages } from "../../../helpers";
import {
  addProject,
  CreateProjectProps,
  updateProject,
  updateProjectPreview,
  updateProjectDraft,
  deleteProject,
} from "../../../redux/actions/ProjectActions";
import {
  clearProjectErrors,
  clearSelectedProject,
} from "../../../redux/slices/ProjectSlice";
import { ProjectsTable } from "../components/projectsTable";
import { useProjectsData } from "../../../hooks/useProjectsData";
import { WorkingInProgress } from "../../../components/shared/ui/WorkingInProgress";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProjectsForm } from "../components/ProjectsForm";

export const Projects = () => {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stateFilter, setStateFilter] = useState<string>("");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { project, projectAddRequest, projects, projectsFetchRequest } =
    useAppSelector((state: RootState) => state.project);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchProjectsData = useProjectsData(user);
  const errorMessage = errorMessages({
    addError: projectAddRequest.messages,
  });

  const uniqueStates = Array.from(
    new Set(projects.map((project) => project.state))
  ).filter(Boolean) as string[];

  const filteredProjects = stateFilter
    ? projects.filter((project) => project.state === stateFilter)
    : projects;

  useEffect(() => {
    fetchProjectsData();
  }, [fetchProjectsData]);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        dispatch(clearProjectErrors());
        navigate("/preview-projects");
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, navigate, dispatch]);

  const handleOpenDrawer = () => {
    setIsEditMode(false);
    setDrawerOpen(true);
  };

  const handleEditProject = () => {
    dispatch(clearSelectedProject());
    setIsEditMode(true);
    setDrawerOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (selectedProjectId) {
      dispatch(deleteProject(selectedProjectId))
        .unwrap()
        .then(() => {
          fetchProjectsData();
          setShowDeleteModal(false);
        })
        .catch((error) => {
          console.error("Error deleting project:", error);
          setShowDeleteModal(false);
        });
    }
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

  const handleLaunchProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowLaunchModal(true);
  };

  const handleRecoveyProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowRecoveryModal(true);
  };

  const handleConfirmLaunch = () => {
    if (selectedProjectId) {
      dispatch(updateProjectPreview(selectedProjectId))
        .unwrap()
        .then(() => {
          fetchProjectsData();
          setShowLaunchModal(false);
          setIsLoading(true);
        });
    }
  };

  const handleConfirmRecovery = () => {
    if (selectedProjectId) {
      dispatch(updateProjectDraft(selectedProjectId))
        .unwrap()
        .then(() => {
          fetchProjectsData();
          setShowRecoveryModal(false);
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
      requiredAI: project.requiredAI,
      prompt: project.prompt,
      user: project.user,
      weblink: project.weblink,
      image_data: project.image_data,
      publications: project.publications,
      googleMaps: project.googleMaps,
      promoter: project.promoter,
      collaborators: project.collaborators,
      authors: project.authors,
      category: project.category,
      year: project.year,
      showMap: project.showMap,
      photoCredit: project.photoCredit,
      photoCreditLink: project.photoCreditLink,
    };
  };

  const clearFilter = () => {
    setStateFilter("");
  };

  if (!user) {
    return;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <WorkingInProgress
          customMessages={[
            t("projects.stage1"),
            t("projects.stage2"),
            t("projects.stage3"),
            t("projects.stage4"),
            t("projects.stage5"),
          ]}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">
        {t("projects.title")}
      </h3>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-7xl text-sm/6 text-gray-500">
          {t("projects.description")}
        </p>
      </div>
      <div className="flex justify-between items-center mb-4">
        <Button title={t("projects.create")} onClick={handleOpenDrawer} />
        <div className="flex items-center space-x-2">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("projects.allStates")}</option>
            {uniqueStates.map((state) => (
              <option key={state} value={state}>
                {state === "draft"
                  ? "Draft"
                  : state === "preview"
                    ? "Preview"
                    : state === "inProgress"
                      ? "In progress"
                      : state === "launched"
                        ? "Launched"
                        : state}
              </option>
            ))}
          </select>
          <Button
            title={t("projects.cleanFilters")}
            onClick={clearFilter}
            secondary
          />
        </div>
      </div>
      <Drawer
        title={
          isEditMode ? t("projects.editProject") : t("projects.createProject")
        }
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
        projects={filteredProjects}
        isLoading={projectsFetchRequest.inProgress}
        onEditProject={handleEditProject}
        onLaunchProject={handleLaunchProject}
        onRecoveryProject={handleRecoveyProject}
        onDeleteProject={handleDeleteProject}
      />
      {errorMessage && (
        <Alert
          title="Error"
          description={errorMessage}
          onAccept={() => dispatch(clearProjectErrors())}
        />
      )}
      {showLaunchModal && (
        <Alert
          title={t("projects.launchTitle")}
          description={t("projects.launchDescription")}
          onAccept={handleConfirmLaunch}
          onCancel={() => setShowLaunchModal(false)}
        />
      )}
      {showRecoveryModal && (
        <Alert
          title={t("projects.recoveryTitle")}
          description={t("projects.recoveryDescription")}
          onAccept={handleConfirmRecovery}
          onCancel={() => setShowRecoveryModal(false)}
        />
      )}
      {showDeleteModal && (
        <Alert
          title={t("projects.deleteTitle")}
          description={t("projects.deleteDescription")}
          onAccept={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};
