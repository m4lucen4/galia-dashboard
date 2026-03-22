import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import { Drawer } from "../../../components/shared/ui/Drawer";
import { Alert } from "../../../components/shared/ui/Alert";
import { Button } from "../../../components/shared/ui/Button";
import { DropdownButton } from "../../../components/shared/ui/DropdownButton";
import { errorMessages } from "../../../helpers";
import {
  addProject,
  CreateProjectProps,
  updateProject,
  updateProjectPreview,
  updateProjectDraft,
  deleteProject,
  assignProject,
  getInitials,
} from "../../../redux/actions/ProjectActions";
import { fetchUsers } from "../../../redux/actions/UserActions";
import {
  clearProjectErrors,
  clearSelectedProject,
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
import {
  type ProcessorAnalysis,
  type FotoTag,
} from "../hooks/usePhotoProcessor";
import { addProjectPhotos } from "../../../redux/actions/ProjectPhotoActions";
import {
  nasRenameFolder,
  nasRestructure,
  nasDeleteFolder,
} from "../../../redux/actions/NasActions";
import { ProjectDataProps } from "../../../types";

export const Projects = () => {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [processingProjectId, setProcessingProjectId] = useState<string | null>(
    null,
  );
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showTimeoutError, setShowTimeoutError] = useState(false);
  const [stateFilter, setStateFilter] = useState<string>("");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const {
    project,
    projectAddRequest,
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
  const [multimediaPreFill, setMultimediaPreFill] =
    useState<ProjectDataProps | null>(null);
  const [pendingFotoTags, setPendingFotoTags] = useState<FotoTag[] | null>(
    null,
  );
  const [multimediaMinFolder, setMultimediaMinFolder] = useState<string | null>(
    null,
  );
  const [multimediaTargetUser, setMultimediaTargetUser] =
    useState<(typeof users)[0] | null>(null);

  const fetchProjectsData = useProjectsData(user);
  const errorMessage = errorMessages({
    addError: projectAddRequest.messages,
    assignError: assignProjectRequest.messages,
  });

  // Subscribe to realtime updates for project preview creation
  const { isCompleted, recordCount } =
    useProjectPreviewRealtime(processingProjectId);

  const uniqueStates = Array.from(
    new Set(projects.map((project) => project.state)),
  ).filter((s): s is string => Boolean(s));

  const filteredProjects = stateFilter
    ? projects.filter((project) => project.state === stateFilter)
    : projects;

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

  const handleOpenDrawer = () => {
    setIsEditMode(false);
    setMultimediaPreFill(null);
    setPendingFotoTags(null);
    setMultimediaMinFolder(null);
    setDrawerOpen(true);
  };

  const handleCreateFromMultimedia = (
    analysis: ProcessorAnalysis,
    folderPath: string,
    targetUserId?: string,
  ) => {
    const targetUser = targetUserId
      ? (users.find((u) => u.uid === targetUserId) ?? null)
      : null;
    setMultimediaTargetUser(targetUser);

    const preFill: ProjectDataProps = {
      id: "",
      user: targetUserId ?? user!.uid,
      title: analysis.titulo,
      description: analysis.descripcion,
      keywords: analysis.tags.join(", "),
      weblink: analysis.web || "",
      year: analysis.anio || "",
      state: "draft",
      nas_folder: folderPath,
    };
    setMultimediaPreFill(preFill);
    setPendingFotoTags(analysis.foto_tags);
    setMultimediaMinFolder(`/${folderPath}/min`);
    setIsEditMode(false);
    dispatch(clearSelectedProject());
    setDrawerOpen(true);
  };

  const handleEditProject = () => {
    dispatch(clearSelectedProject());
    setIsEditMode(true);
    setDrawerOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    const proj = projects.find((p) => String(p.id) === projectId);
    const nasFolder = proj ? getNasParentFolder(proj) : null;
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
        .then((result) => {
          fetchProjectsData();
          setDrawerOpen(false);

          const newProjectId = result.project?.id;
          const nasFolder = multimediaPreFill?.nas_folder;
          const nasUser = multimediaTargetUser ?? user;

          if (newProjectId && nasFolder && nasUser?.folder_nas) {
            const initials = getInitials(nasUser.first_name, nasUser.last_name);
            const odooId = String(nasUser.odoo_id ?? "");
            const newFolderName = odooId
              ? `${newProjectId}-${odooId}-${initials}`
              : `${newProjectId}-${initials}`;
            const newFolderPath = `${nasUser.folder_nas}/${newFolderName}`;

            // Sequential: rename → restructure → save photos
            dispatch(nasRenameFolder({ from: nasFolder, to: newFolderPath }))
              .unwrap()
              .then(() =>
                dispatch(
                  nasRestructure({
                    folder: newFolderPath,
                    projectId: String(newProjectId),
                    odooId,
                  }),
                ).unwrap(),
              )
              .then((restructureResult) => {
                if (pendingFotoTags) {
                  const fileMapping = restructureResult.fileMapping ?? {};
                  const translatedTags = pendingFotoTags.map((tag) => ({
                    ...tag,
                    filename: fileMapping[tag.filename] ?? tag.filename,
                  }));
                  dispatch(
                    addProjectPhotos({
                      projectId: newProjectId,
                      fotoTags: translatedTags,
                    }),
                  );
                }
              })
              .catch((err) => {
                console.error("Error in post-create NAS operations:", err);
              });
          }

          setMultimediaPreFill(null);
          setPendingFotoTags(null);
          setMultimediaMinFolder(null);
          setMultimediaTargetUser(null);
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

  const getNasFolder = (): string | null => {
    if (!project) return null;

    // Multimedia projects use _min (thumbnails), traditional use _alta
    const suffix = project.nas_folder ? `${project.id}_min` : `${project.id}_alta`;

    // Photographer editing their own project
    if (user?.role === "photographer" && user.folder_nas) {
      const initials = getInitials(user.first_name, user.last_name);
      const folderName = user.odoo_id
        ? `${project.id}-${user.odoo_id}-${initials}`
        : `${project.id}-${initials}`;
      return `/${user.folder_nas}/${folderName}/${suffix}`;
    }

    // Admin editing a photographer's project
    if (
      project.userData?.role === "photographer" &&
      project.userData.folder_nas
    ) {
      const initials = getInitials(
        project.userData.first_name,
        project.userData.last_name,
      );
      const folderName = project.userData.odoo_id
        ? `${project.id}-${project.userData.odoo_id}-${initials}`
        : `${project.id}-${initials}`;
      return `/${project.userData.folder_nas}/${folderName}/${suffix}`;
    }

    return null;
  };

  const getNasParentFolder = (proj: ProjectDataProps): string | null => {
    if (user?.role === "photographer" && user.folder_nas) {
      const initials = getInitials(user.first_name, user.last_name);
      const folderName = user.odoo_id
        ? `${proj.id}-${user.odoo_id}-${initials}`
        : `${proj.id}-${initials}`;
      return `${user.folder_nas}/${folderName}`;
    }
    if (proj.userData?.role === "photographer" && proj.userData.folder_nas) {
      const initials = getInitials(
        proj.userData.first_name,
        proj.userData.last_name,
      );
      const folderName = proj.userData.odoo_id
        ? `${proj.id}-${proj.userData.odoo_id}-${initials}`
        : `${proj.id}-${initials}`;
      return `${proj.userData.folder_nas}/${folderName}`;
    }
    return null;
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
      category: project.category,
      year: project.year,
      showMap: project.showMap,
      projectCollaborators: project.projectCollaborators,
      nas_folder: project.nas_folder,
    };
  };

  const clearFilter = () => {
    setStateFilter("");
  };

  const getStateLabel = (state: string): string => {
    const stateLabels: Record<string, string> = {
      draft: "Draft",
      preview: "Preview",
      inProgress: "In progress",
      launched: "Launched",
    };
    return stateLabels[state] ?? state;
  };

  if (!user) {
    return;
  }

  if (processingProjectId) {
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
        {(user?.role === "admin" ||
          (user?.role === "photographer" && user.odoo_id)) ? (
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
        ) : (
          <Button title={t("projects.create")} onClick={handleOpenDrawer} />
        )}
        <div className="flex items-center space-x-2">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("projects.allStates")}</option>
            {uniqueStates.map((state) => (
              <option key={state} value={state}>
                {getStateLabel(state)}
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
        onClose={() => {
          setDrawerOpen(false);
          setMultimediaPreFill(null);
          setPendingFotoTags(null);
          setMultimediaMinFolder(null);
          setMultimediaTargetUser(null);
        }}
      >
        <ProjectsForm
          initialData={isEditMode ? getFormData() : (multimediaPreFill ?? undefined)}
          onSubmit={handleProjectSubmit}
          loading={projectAddRequest.inProgress}
          isEditMode={isEditMode}
          user={user}
          nasFolder={
            isEditMode
              ? (getNasFolder() ?? undefined)
              : (multimediaMinFolder ?? undefined)
          }
          projectId={isEditMode && project ? String(project.id) : undefined}
          odooId={
            isEditMode
              ? (user?.role === "photographer"
                  ? (user.odoo_id ? String(user.odoo_id) : undefined)
                  : (project?.userData?.odoo_id ? String(project.userData.odoo_id) : undefined))
              : undefined
          }
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
          title="Asignar Proyecto"
          description="Busca y selecciona el usuario al que deseas asignar este proyecto:"
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
