import { getInitials } from "../redux/actions/ProjectActions";
import type { ProjectDataProps, UserDataProps } from "../types";

export const getProjectNasFolderName = (
  projectId: string,
  user: UserDataProps,
  odooId: string | number | undefined = user.odoo_id,
): string => {
  const initials = getInitials(user.first_name, user.last_name);

  return odooId
    ? `${projectId}-${odooId}-${initials}`
    : `${projectId}-${initials}`;
};

export const getProjectNasBaseFolderForUser = (
  projectId: string,
  user: UserDataProps,
  odooId?: string | number,
): string | null => {
  if (!user.folder_nas) return null;

  return `${user.folder_nas}/${getProjectNasFolderName(projectId, user, odooId)}`;
};

export const getProjectNasBaseFolder = (
  project: ProjectDataProps,
  currentUser: UserDataProps | null,
): string | null => {
  if (currentUser?.role === "photographer" && currentUser.folder_nas) {
    return getProjectNasBaseFolderForUser(project.id, currentUser);
  }

  if (
    project.userData?.role === "photographer" &&
    project.userData.folder_nas
  ) {
    return getProjectNasBaseFolderForUser(project.id, project.userData);
  }

  return null;
};

export const getProjectNasFileFolder = (
  project: ProjectDataProps,
  currentUser: UserDataProps | null,
): string | null => {
  const baseFolder = getProjectNasBaseFolder(project, currentUser);

  if (!baseFolder) return null;

  const suffix = project.nas_folder ? `${project.id}_min` : `${project.id}_alta`;

  return `/${baseFolder}/${suffix}`;
};
