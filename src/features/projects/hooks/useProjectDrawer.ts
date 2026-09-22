import { useState } from "react";
import { useAppDispatch } from "../../../redux/hooks";
import {
  addProject,
  type CreateProjectProps,
  updateProject,
} from "../../../redux/actions/ProjectActions";
import { clearSelectedProject } from "../../../redux/slices/ProjectSlice";
import {
  nasRenameFolder,
  nasRestructure,
} from "../../../redux/actions/NasActions";
import { addProjectPhotos } from "../../../redux/actions/ProjectPhotoActions";
import {
  getProjectNasBaseFolderForUser,
  getProjectNasFileFolder,
} from "../../../helpers/nasPaths";
import type {
  ProjectDataProps,
  ProjectImageData,
  UserDataProps,
} from "../../../types";
import type { FotoTag, ProcessorAnalysis } from "./usePhotoProcessor";

type UseProjectDrawerProps = {
  user: UserDataProps | null;
  users: UserDataProps[];
  project: ProjectDataProps | null;
  loading: boolean;
  fetchProjectsData: () => void;
};

export const useProjectDrawer = ({
  user,
  users,
  project,
  loading,
  fetchProjectsData,
}: UseProjectDrawerProps) => {
  const dispatch = useAppDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [multimediaPreFill, setMultimediaPreFill] =
    useState<ProjectDataProps | null>(null);
  const [pendingFotoTags, setPendingFotoTags] = useState<FotoTag[] | null>(
    null,
  );
  const [multimediaMinFolder, setMultimediaMinFolder] = useState<string | null>(
    null,
  );
  const [multimediaTargetUser, setMultimediaTargetUser] =
    useState<UserDataProps | null>(null);

  const handleOpenDrawer = () => {
    setIsEditMode(false);
    setMultimediaPreFill(null);
    setPendingFotoTags(null);
    setMultimediaMinFolder(null);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setMultimediaPreFill(null);
    setPendingFotoTags(null);
    setMultimediaMinFolder(null);
    setMultimediaTargetUser(null);
  };

  const handleCreateFromMultimedia = (
    analysis: ProcessorAnalysis,
    folderPath: string,
    targetUserId?: string,
  ) => {
    const targetUser = targetUserId
      ? (users.find((user) => user.uid === targetUserId) ?? null)
      : null;
    setMultimediaTargetUser(targetUser);

    const preselectedImageData: ProjectImageData[] = analysis.foto_tags
      .filter(
        (fotoTag) =>
          fotoTag.supabase_url &&
          (fotoTag.rating === "heroica" || fotoTag.rating === "principal"),
      )
      .sort((a, b) =>
        a.rating === "heroica" ? -1 : b.rating === "heroica" ? 1 : 0,
      )
      .slice(0, 10)
      .map((fotoTag) => ({
        url: fotoTag.supabase_url!,
        status: "pending" as const,
      }));

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
      image_data:
        preselectedImageData.length > 0 ? preselectedImageData : undefined,
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
            const odooId = String(nasUser.odoo_id ?? "");
            const newFolderPath = getProjectNasBaseFolderForUser(
              newProjectId,
              nasUser,
              odooId,
            );

            if (newFolderPath) {
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
                        nasBasePath: newFolderPath,
                      }),
                    );
                  }
                })
                .catch((err) => {
                  console.error("Error in post-create NAS operations:", err);
                });
            }
          }

          setMultimediaPreFill(null);
          setPendingFotoTags(null);
          setMultimediaMinFolder(null);
          setMultimediaTargetUser(null);
        });
    }
  };

  return {
    drawerOpen,
    isEditMode,
    handleOpenDrawer,
    handleCloseDrawer,
    handleCreateFromMultimedia,
    handleEditProject,
    formProps: {
      initialData: isEditMode ? getFormData() : (multimediaPreFill ?? undefined),
      onSubmit: handleProjectSubmit,
      loading,
      isEditMode,
      user: user!,
      nasFolder: isEditMode
        ? (project
          ? getProjectNasFileFolder(project, user) ?? undefined
          : undefined)
        : (multimediaMinFolder ?? undefined),
      projectId: isEditMode && project ? String(project.id) : undefined,
      odooId: isEditMode
        ? user?.role === "photographer"
          ? user.odoo_id
            ? String(user.odoo_id)
            : undefined
          : project?.userData?.odoo_id
            ? String(project.userData.odoo_id)
            : undefined
        : undefined,
    },
  };
};
