import { useCallback } from "react";
import { useAppDispatch } from "../redux/hooks";
import { UserDataProps } from "../types";
import {
  fetchPreviewProjects,
  fetchPreviewProjectsByUserId,
} from "../redux/actions/PreviewProjectActions";

/**
 * Custom hook to load previewprojects based on user role
 * @param user Current application user
 * @returns Function to load preview projects
 */
export const usePreviewProjectsData = (
  user: UserDataProps | null | undefined
) => {
  const dispatch = useAppDispatch();

  const fetchPreviewProjectsData = useCallback(() => {
    if (!user) return;

    if (user.role === "admin") {
      dispatch(fetchPreviewProjects());
    } else if (user.role === "customer") {
      dispatch(fetchPreviewProjectsByUserId(user.uid));
    }
  }, [dispatch, user]);

  return fetchPreviewProjectsData;
};
