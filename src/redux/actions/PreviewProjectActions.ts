import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  PreviewProjectDataProps,
  ProjectImageData,
  SocialNetworksCheck,
  SupabaseError,
  UpdatePreviewProjectProps,
  UpdateProjectPublishingProps,
} from "../../types";
import { supabase } from "../../helpers/supabase";

export type CreateProjectProps = Omit<
  PreviewProjectDataProps,
  "id" | "created_at" | "updated_at"
> & {
  images?: File[];
};

export const fetchPreviewProjects = createAsyncThunk(
  "projectsPreview/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const { data: projects, error } = await supabase
        .from("projectsPreview")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return rejectWithValue({
          message: `Error getting projects list: ${error.message}`,
          status: error.code,
        });
      }

      if (!projects || projects.length === 0) {
        return {
          projects: [],
          message: "Don't have any projects yet",
        };
      }

      return {
        projects: projects,
        message: `${projects.length} projects found`,
      };
    } catch (error: unknown) {
      console.error("Error in fetchProjects:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error retrieving projects",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const fetchPreviewProjectById = createAsyncThunk(
  "projectsPreview/fetchProjectById",
  async (projectId: string, { rejectWithValue }) => {
    try {
      const { data: project, error } = await supabase
        .from("projectsPreview")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error getting project: ${error.message}`,
          status: error.code,
        });
      }

      if (!project) {
        return rejectWithValue({
          message: `Project with id ${projectId} not found`,
          status: 404,
        });
      }

      return {
        project,
        message: "Project found successfully",
      };
    } catch (error: unknown) {
      console.error("Error in fetchProjectById:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error retrieving project",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const fetchPreviewProjectsByUserId = createAsyncThunk(
  "projectsPreview/fetchProjectsByUserId",
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data: projects, error } = await supabase
        .from("projectsPreview")
        .select("*")
        .eq("user", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return rejectWithValue({
          message: `Error getting user's projects: ${error.message}`,
          status: error.code,
        });
      }

      if (!projects || projects.length === 0) {
        return {
          projects: [],
          message: `No projects found for user ${userId}`,
        };
      }

      return {
        projects,
        message: `${projects.length} projects found for user ${userId}`,
      };
    } catch (error: unknown) {
      console.error("Error in fetchProjectsByUserId:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error retrieving user's projects",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const updateProjectPublishing = createAsyncThunk(
  "projectsPreview/updateProjectPublishing",
  async (data: UpdateProjectPublishingProps, { rejectWithValue }) => {
    try {
      const { projectId, publishDate, checkSocialNetworks } = data;

      const updateData: {
        publishDate?: string | null;
        checkSocialNetworks?: SocialNetworksCheck;
      } = {};

      if (publishDate !== undefined) {
        updateData.publishDate = publishDate === "" ? null : publishDate;
      }

      if (checkSocialNetworks !== undefined) {
        updateData.checkSocialNetworks = checkSocialNetworks;
      }

      const { data: updatedProject, error } = await supabase
        .from("projectsPreview")
        .update(updateData)
        .eq("id", projectId)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error updating project publishing info: ${error.message}`,
          status: error.code,
        });
      }

      if (publishDate) {
        const today = new Date().toISOString().split("T")[0];
        const pubDate = new Date(publishDate).toISOString().split("T")[0];

        if (today === pubDate) {
          const webhookUrl = `${
            import.meta.env.VITE_SUPABASE_FUNCTION_N8N_LINKEDLN_URL
          }?id=${projectId}`;

          try {
            const webhookResponse = await fetch(webhookUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });

            if (!webhookResponse.ok) {
              console.error(
                "Error calling LinkedIn webhook:",
                await webhookResponse.text()
              );
            }
          } catch (webhookError) {
            console.error("Failed to call LinkedIn workflow:", webhookError);
          }
        }
      }

      return {
        project: updatedProject,
        message: "Project publishing info updated successfully",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error updating project publishing info",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const updatePreviewProject = createAsyncThunk(
  "projectsPreview/updateProject",
  async (data: UpdatePreviewProjectProps, { rejectWithValue }) => {
    try {
      const { projectId, description_rich, image_data } = data;

      const updateData: {
        description_rich?: string;
        image_data?: Array<ProjectImageData>;
      } = {};

      if (description_rich !== undefined) {
        updateData.description_rich = description_rich;
      }

      if (image_data !== undefined) {
        updateData.image_data = image_data;
      }

      const { data: updatedProject, error } = await supabase
        .from("projectsPreview")
        .update(updateData)
        .eq("id", projectId)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error updating project: ${error.message}`,
          status: error.code,
        });
      }

      return {
        project: updatedProject,
        message: "Project updated successfully",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error updating project",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const deletePreviewProject = createAsyncThunk(
  "projectsPreview/deleteProject",
  async (projectId: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from("projectsPreview")
        .delete()
        .eq("id", projectId);

      if (error) {
        return rejectWithValue({
          message: `Error eliminando el proyecto: ${error.message}`,
          status: error.code,
        });
      }

      return {
        projectId,
        message: "Proyecto eliminado correctamente",
      };
    } catch (error: unknown) {
      console.error("Error en deletePreviewProject:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error al eliminar el proyecto",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const resetProjectToPreview = createAsyncThunk(
  "projectsPreview/resetProjectToPreview",
  async (projectId: string, { rejectWithValue }) => {
    try {
      const updateData = {
        state: "preview",
        publishDate: null,
        checkSocialNetworks: null,
        instagramResult: null,
        linkedlnResult: null,
      };

      const { data: updatedProject, error } = await supabase
        .from("projectsPreview")
        .update(updateData)
        .eq("id", projectId)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error resetting project to preview: ${error.message}`,
          status: error.code,
        });
      }

      return {
        project: updatedProject,
        message: "Project reset to preview successfully",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error resetting project to preview",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);
