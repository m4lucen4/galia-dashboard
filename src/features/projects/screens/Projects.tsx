import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import { Drawer } from "../../../components/shared/ui/Drawer";
import { Alert } from "../../../components/shared/ui/Alert";
import { PillButton } from "@/components/shared/ui/PillButton";
import { ChartBarIcon, PlusIcon } from "@heroicons/react/24/outline";
import { DropdownButton } from "../../../components/shared/ui/DropdownButton";
import { errorMessages } from "../../../helpers";
import {
  updateProjectPreview,
  updateProjectDraft,
  deleteProject,
  assignProject,
} from "../../../redux/actions/ProjectActions";
import { fetchUsers } from "../../../redux/actions/UserActions";
import {
  clearProjectErrors,
} from "../../../redux/slices/ProjectSlice";
import { ProjectsTable } from "../components/projectsTable";
import { useProjectsData } from "../../../hooks/useProjectsData";
import { useProjectPreviewRealtime } from "../../../hooks/useProjectPreviewRealtime";
import { WorkingInProgress } from "../../../components/shared/ui/WorkingInProgress";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProjectsForm } from "../components/ProjectsForm";
import { UserSearchSelector } from "../components/UserSearchSelector";
import { MultimediaUploadModal } from "../components/MultimediaUploadModal";
import { nasDeleteFolder } from "../../../redux/actions/NasActions";
import { getProjectNasBaseFolder } from "../../../helpers/nasPaths";
import { useProjectDrawer } from "../hooks/useProjectDrawer";
import { useProjectFilters } from "../hooks/useProjectFilters";
import { ProjectsFilters } from "../components/ProjectsFilters";

export const Projects = () => {
  const { t } = useTranslation();
  const [processingProjectId, setProcessingProjectId] = useState<string | null>(
    null,
  );
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showTimeoutError, setShowTimeoutError] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const {
    project,
    projectAddRequest,
    projectUpdateRequest,
    projects,
    projectsFetchRequest,
    assignProjectRequest,
  } = useAppSelector((state: RootState) => state.project);
  const { users } = useAppSelector((state: RootState) => state.user);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [pendingNasFolder, setPendingNasFolder] = useState<string | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showMultimediaModal, setShowMultimediaModal] = useState(false);

  const fetchProjectsData = useProjectsData(user);
  const {
    drawerOpen,
    isEditMode,
    handleOpenDrawer,
    handleCloseDrawer,
    handleCreateFromMultimedia,
    handleEditProject,
    formProps,
  } = useProjectDrawer({
    user,
    users,
    project,
    loading: projectAddRequest.inProgress || projectUpdateRequest.inProgress,
    fetchProjectsData,
  });
  const errorMessage = errorMessages({
    addError: projectAddRequest.messages,
    assignError: assignProjectRequest.messages,
  });

  // Subscribe to realtime updates for project preview creation
  const { isCompleted, recordCount } =
    useProjectPreviewRealtime(processingProjectId);

  const {
    titleFilter,
    stateFilter,
    ownerFilter,
    uniqueStates,
    ownerOptions,
    filteredProjects,
    filterChangeVersion,
    clearFilters,
    handleTitleFilterChange,
    handleStateFilterChange,
    handleOwnerFilterChange,
  } = useProjectFilters({ projects, users });

  useEffect(() => {
    fetchProjectsData();
    if (user?.role === "admin") {
      dispatch(fetchUsers());
    }
  }, [fetchProjectsData, dispatch, user?.role]);

  // Handle workflow completion via realtime
  useEffect(() => {
    if (isCompleted && processingProjectId) {
      // Use setTimeout to move state updates out of the synchronous effect
      setTimeout(() => {
        setProcessingProjectId(null);
        setShowSuccessAlert(true);
        fetchProjectsData();
      }, 0);
    }
  }, [isCompleted, processingProjectId, recordCount, fetchProjectsData]);

  // Fallback timeout: if workflow doesn't complete in 3 minutes, show error
  useEffect(() => {
    if (!processingProjectId) return;

    const timeoutId = setTimeout(
      () => {
        setProcessingProjectId(null);
        setShowTimeoutError(true);
      },
      3 * 60 * 1000,
    ); // 3 minutes (180 seconds)

    return () => clearTimeout(timeoutId);
  }, [processingProjectId]);

  const handleDeleteProject = (projectId: string) => {
    const proj = projects.find((p) => String(p.id) === projectId);
    const nasFolder = proj ? getProjectNasBaseFolder(proj, user) : null;
    setSelectedProjectId(projectId);
    setPendingNasFolder(nasFolder);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (selectedProjectId) {
      dispatch(deleteProject(selectedProjectId))
        .unwrap()
        .then(() => {
          fetchProjectsData();
          setShowDeleteModal(false);
          if (pendingNasFolder) {
            dispatch(nasDeleteFolder(pendingNasFolder));
          }
          setPendingNasFolder(null);
        })
        .catch((error) => {
          console.error("Error deleting project:", error);
          setShowDeleteModal(false);
          setPendingNasFolder(null);
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

  const handleAssignProject = (projectId: string) => {
    setSelectedProjectId(projectId);

    // Find the project and set the currently assigned user if exists
    const project = projects.find((p) => p.id === projectId);
    setSelectedUser(project?.assigned || null);

    setShowAssignModal(true);
    // Fetch users when opening the modal
    dispatch(fetchUsers());
  };

  const handleConfirmAssign = () => {
    if (selectedProjectId && selectedUser) {
      dispatch(
        assignProject({
          projectId: selectedProjectId,
          assignedUserId: selectedUser,
        }),
      )
        .unwrap()
        .then(() => {
          fetchProjectsData();
          setShowAssignModal(false);
          setSelectedUser(null);
        })
        .catch((error) => {
          console.error("Error assigning project:", error);
        });
    }
  };

  const handleConfirmLaunch = () => {
    if (selectedProjectId) {
      const project = projects.find((p) => p.id === selectedProjectId);

      dispatch(updateProjectPreview(selectedProjectId))
        .unwrap()
        .then(() => {
          fetchProjectsData();
          setShowLaunchModal(false);

          if (project?.requiredAI) {
            setProcessingProjectId(selectedProjectId);
          } else {
            setShowSuccessAlert(true);
          }
        })
        .catch((error) => {
          console.error("Error launching project:", error);
          setShowLaunchModal(false);
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

  if (!user) {
    return;
  }

  if (processingProjectId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]">
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
    <div className="min-w-0 space-y-10 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#010000]/15 pb-8">
        <div className="min-w-0 space-y-3">
          <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-5xl">
            {t("projects.title")}
          </h1>
          <p className="text-base leading-relaxed text-[#010000]/65">
            {t("projects.description")}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto">
          {(user?.role === "admin" ||
            (user?.role === "photographer" && user.odoo_id)) ? (
            <div className="[&>div>button]:min-h-11 [&>div>button]:gap-2 [&>div>button]:rounded-full [&>div>button]:bg-[#010000] [&>div>button]:px-5 [&>div>button]:py-3 [&>div>button]:text-[#d8e4d6] [&>div>button]:focus-visible:outline-2 [&>div>button]:focus-visible:outline-offset-4 [&>div>button]:focus-visible:outline-[#010000] [&>div>button]:focus:ring-0 [&>div>div]:w-60 [&>div>div]:rounded-2xl [&>div>div]:border-[#010000]/20 [&>div>div]:bg-[#d8e4d6] [&_li>button]:min-h-11 [&_li>button]:text-[#010000] [&_li>button]:hover:bg-[#010000]/5 [&_li>button]:focus-visible:outline-2 [&_li>button]:focus-visible:-outline-offset-2 [&_li>button]:focus-visible:outline-[#010000]">
              <DropdownButton
                title={t("projects.create")}
                options={[
                  {
                    label: t("projects.createFromScratch"),
                    onClick: handleOpenDrawer,
                  },
                  {
                    label: t("projects.createFromMultimedia"),
                    onClick: () => setShowMultimediaModal(true),
                  },
                ]}
              />
            </div>
          ) : (
            <PillButton onClick={handleOpenDrawer}>
              <PlusIcon className="size-4 shrink-0" aria-hidden="true" />
              {t("projects.create")}
            </PillButton>
          )}
          <PillButton
            variant="outline"
            onClick={() => navigate("/projects-analytics")}
          >
            <ChartBarIcon className="size-4 shrink-0" aria-hidden="true" />
            {t("projects.viewAnalytics")}
          </PillButton>
        </div>
      </header>
      <ProjectsFilters
        isAdmin={user.role === "admin"}
        titleFilter={titleFilter}
        stateFilter={stateFilter}
        ownerFilter={ownerFilter}
        uniqueStates={uniqueStates}
        ownerOptions={ownerOptions}
        onTitleFilterChange={handleTitleFilterChange}
        onStateFilterChange={handleStateFilterChange}
        onOwnerFilterChange={handleOwnerFilterChange}
        onClearFilters={clearFilters}
      />
      <Drawer
        variant="dashboard"
        closeLabel={t("users.closeForm")}
        title={
          isEditMode ? t("projects.editProject") : t("projects.createProject")
        }
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
      >
        <ProjectsForm
          {...formProps}
        />
      </Drawer>
      <ProjectsTable
        projects={filteredProjects}
        isLoading={projectsFetchRequest.inProgress}
        currentUser={user}
        onEditProject={handleEditProject}
        onLaunchProject={handleLaunchProject}
        onRecoveryProject={handleRecoveyProject}
        onDeleteProject={handleDeleteProject}
        onAssignProject={handleAssignProject}
        filterChangeVersion={filterChangeVersion}
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
      {showAssignModal && (
        <Alert
          title="Duplicar y asignar proyecto"
          description="Busca y selecciona el usuario al que deseas duplicar y asignar este proyecto:"
          onAccept={handleConfirmAssign}
          onCancel={() => {
            setShowAssignModal(false);
            setSelectedUser(null);
          }}
          disabledConfirmButton={!selectedUser}
        >
          <UserSearchSelector
            users={users}
            selectedUser={selectedUser}
            onUserSelect={setSelectedUser}
          />
        </Alert>
      )}
      {showSuccessAlert && (
        <Alert
          title="¡Éxito!"
          description={`El proyecto se ha procesado correctamente y está listo para preview.`}
          onAccept={() => {
            setShowSuccessAlert(false);
            navigate("/preview-projects");
          }}
        />
      )}
      {showTimeoutError && (
        <Alert
          title="Timeout"
          description="El procesamiento está tardando más de lo esperado. Por favor, verifica el estado del proyecto más tarde o contacta soporte si el problema persiste."
          onAccept={() => setShowTimeoutError(false)}
        />
      )}
      {user.folder_nas && (
        <MultimediaUploadModal
          isOpen={showMultimediaModal}
          onClose={() => setShowMultimediaModal(false)}
          userNasFolder={user.folder_nas ?? ""}
          userId={user.id}
          photographers={
            user.role === "admin"
              ? users.filter(
                  (u) => u.role === "photographer" && u.folder_nas && u.odoo_id,
                )
              : undefined
          }
          onCreateProject={(analysis, folderPath, targetUserId) => {
            setShowMultimediaModal(false);
            handleCreateFromMultimedia(analysis, folderPath, targetUserId);
          }}
        />
      )}
    </div>
  );
};
