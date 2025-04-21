import { useCallback } from "react";
import { useAppDispatch } from "../redux/hooks";
import {
  fetchProjects,
  fetchProjectsByUserId,
} from "../redux/actions/ProjectActions";
import { UserProps } from "../types";

/**
 * Custom hook to load projects based on user role
 * @param user Current application user
 * @returns Function to load projects
 */
export const useProjectsData = (user: UserProps | null | undefined) => {
  const dispatch = useAppDispatch();

  const fetchProjectsData = useCallback(() => {
    if (!user) return;

    if (user.role === "admin") {
      dispatch(fetchProjects());
    } else if (user.role === "customer") {
      dispatch(fetchProjectsByUserId(user.uid));
    }
  }, [dispatch, user]);

  return fetchProjectsData;
};
