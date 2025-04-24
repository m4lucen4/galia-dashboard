import { createAsyncThunk } from "@reduxjs/toolkit";
import { ProjectDataProps, SupabaseError, ProjectImageData } from "../../types";
import { supabase } from "../../helpers/supabase";

export type CreateProjectProps = Omit<
  ProjectDataProps,
  "id" | "created_at" | "updated_at"
> & {
  images?: File[];
};

export const addProject = createAsyncThunk(
  "projects/addProject",
  async (projectData: CreateProjectProps, { rejectWithValue }) => {
    try {
      const { data: newProject, error } = await supabase
        .from("projects")
        .insert({
          title: projectData.title,
          state: projectData.state,
          description: projectData.description,
          keywords: projectData.keywords,
          user: projectData.user,
          weblink: projectData.weblink,
          image_data: [],
          publications: projectData.publications,
          googleMaps: projectData.googleMaps,
          promoter: projectData.promoter,
          collaborators: projectData.collaborators,
        })
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error while creating project: ${error.message}`,
          status: error.code,
        });
      }

      const imageData: ProjectImageData[] = [];

      if (
        projectData.images &&
        projectData.images.length > 0 &&
        newProject.id
      ) {
        const imagesToUpload = projectData.images.slice(0, 15);

        for (const [index, image] of imagesToUpload.entries()) {
          const fileExt = image.name.split(".").pop();
          const fileName = `${newProject.id}/${index}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("projects-images")
            .upload(fileName, image);

          if (uploadError) {
            console.error("Error uploading image:", uploadError);
            continue;
          }

          const { data: publicUrlData } = supabase.storage
            .from("projects-images")
            .getPublicUrl(fileName);

          if (publicUrlData) {
            imageData.push({
              url: publicUrlData.publicUrl,
              status: "pending",
              processingResult: {
                timestamps: {
                  queued: new Date().toISOString(),
                },
              },
            });
          }
        }

        if (imageData.length > 0) {
          const { error: updateError } = await supabase
            .from("projects")
            .update({ image_data: imageData })
            .eq("id", newProject.id);

          if (updateError) {
            console.error("Error updating project with images:", updateError);
          } else {
            newProject.image_data = imageData;
          }
        }
      }

      return {
        project: newProject,
        message: "Project created successfully",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error while creating project",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const updateProject = createAsyncThunk(
  "projects/updateProject",
  async (
    projectData: CreateProjectProps & { id: string },
    { rejectWithValue }
  ) => {
    try {
      const imageData = projectData.image_data || [];

      if (projectData.images && projectData.images.length > 0) {
        const imagesToUpload = projectData.images.slice(
          0,
          15 - imageData.length
        );

        for (const [index, image] of imagesToUpload.entries()) {
          const fileExt = image.name.split(".").pop();
          const fileName = `${
            projectData.id
          }/${Date.now()}_${index}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("projects-images")
            .upload(fileName, image);

          if (uploadError) {
            console.error("Error uploading image:", uploadError);
            continue;
          }

          const { data: publicUrlData } = supabase.storage
            .from("projects-images")
            .getPublicUrl(fileName);

          if (publicUrlData) {
            imageData.push({
              url: publicUrlData.publicUrl,
              status: "pending",
              processingResult: {
                timestamps: {
                  queued: new Date().toISOString(),
                },
              },
            });
          }
        }
      }

      const { data: updatedProject, error } = await supabase
        .from("projects")
        .update({
          updated_at: new Date().toISOString(),
          title: projectData.title,
          state: projectData.state,
          description: projectData.description,
          keywords: projectData.keywords,
          weblink: projectData.weblink,
          image_data: imageData,
          publications: projectData.publications,
          googleMaps: projectData.googleMaps,
          promoter: projectData.promoter,
          collaborators: projectData.collaborators,
        })
        .eq("id", projectData.id)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error while updating project: ${error.message}`,
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
          error instanceof Error
            ? error.message
            : "Error while updating project",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const fetchProjects = createAsyncThunk(
  "projects/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const { data: projects, error } = await supabase
        .from("projects")
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

export const fetchProjectById = createAsyncThunk(
  "projects/fetchProjectById",
  async (projectId: string, { rejectWithValue }) => {
    try {
      const { data: project, error } = await supabase
        .from("projects")
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

export const fetchProjectsByUserId = createAsyncThunk(
  "projects/fetchProjectsByUserId",
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data: projects, error } = await supabase
        .from("projects")
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

export const fetchProjectsWithGoogleMaps = createAsyncThunk(
  "projects/fetchProjectsWithGoogleMaps",
  async (_, { rejectWithValue }) => {
    try {
      const { data: projects, error } = await supabase
        .from("projects")
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

      const projectsWithGoogleMaps = projects.filter(
        (project) =>
          project.googleMaps && Object.keys(project.googleMaps).length > 0
      );

      return {
        projects: projectsWithGoogleMaps,
        message: `${projectsWithGoogleMaps.length} projects with Google Maps data found`,
      };
    } catch (error: unknown) {
      console.error("Error in fetchProjectsWithGoogleMaps:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error retrieving projects with Google Maps data",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const updateProjectState = createAsyncThunk(
  "projects/updateProjectState",
  async (projectId: string, { rejectWithValue }) => {
    try {
      const webhookUrl = `${
        import.meta.env.VITE_N8N_POST_SUPABASE_URL
      }?id=${projectId}`;

      const webhookResponse = await fetch(webhookUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!webhookResponse.ok) {
        throw new Error(`Error calling webhook: ${webhookResponse.statusText}`);
      }
      const { data: updatedProject, error } = await supabase
        .from("projects")
        .update({
          updated_at: new Date().toISOString(),
          state: "preview",
        })
        .eq("id", projectId)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error updating project state: ${error.message}`,
          status: error.code,
        });
      }

      return {
        project: updatedProject,
        message: "Project state updated to preview",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error updating project state",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);
