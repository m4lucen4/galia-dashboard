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
          requiredAI: projectData.requiredAI,
          prompt: projectData.prompt,
          user: projectData.user,
          weblink: projectData.weblink,
          image_data: projectData.image_data || [],
          publications: projectData.publications,
          googleMaps: projectData.googleMaps,
          category: projectData.category,
          year: projectData.year,
          showMap: projectData.showMap,
          projectCollaborators: projectData.projectCollaborators,
        })
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error while creating project: ${error.message}`,
          status: error.code,
        });
      }

      // Call n8n webhook to create project in Odoo
      // if (newProject.id) {
      //   const webhookUrl = `${
      //     import.meta.env.VITE_N8N_CREATE_PROJECT_WEBHOOK
      //   }?id=${newProject.id}`;

      //   fetch(webhookUrl, {
      //     method: "GET",
      //     headers: {
      //       Accept: "application/json",
      //     },
      //   }).catch((error) => {
      //     console.error("Error calling n8n webhook:", error);
      //     // Do not block project creation if webhook fails
      //   });
      // }

      // Start with existing image_data from gallery selection
      const imageData: ProjectImageData[] = [...(projectData.image_data || [])];

      if (
        projectData.images &&
        projectData.images.length > 0 &&
        newProject.id
      ) {
        const imagesToUpload = projectData.images.slice(0, 10);

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
  },
);

export const updateProject = createAsyncThunk(
  "projects/updateProject",
  async (
    projectData: CreateProjectProps & { id: string },
    { rejectWithValue },
  ) => {
    try {
      const imageData = projectData.image_data || [];

      if (projectData.images && projectData.images.length > 0) {
        const imagesToUpload = projectData.images.slice(
          0,
          10 - imageData.length,
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
          requiredAI: projectData.requiredAI,
          prompt: projectData.prompt,
          weblink: projectData.weblink,
          image_data: imageData,
          publications: projectData.publications,
          googleMaps: projectData.googleMaps,
          category: projectData.category,
          year: projectData.year,
          showMap: projectData.showMap,
          projectCollaborators: projectData.projectCollaborators,
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

      // Call n8n webhook to update project in Odoo
      // if (updatedProject.id) {
      //   const webhookUrl = `${
      //     import.meta.env.VITE_N8N_CREATE_PROJECT_WEBHOOK
      //   }?id=${updatedProject.id}`;

      //   fetch(webhookUrl, {
      //     method: "GET",
      //     headers: {
      //       Accept: "application/json",
      //     },
      //   }).catch((error) => {
      //     console.error("Error calling n8n webhook:", error);
      //     // Do not block project update if webhook fails
      //   });
      // }

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
  },
);

export const fetchProjects = createAsyncThunk(
  "projects/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const { data: projects, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          userData:userData(
            id,
            created_at,
            updated_at,
            uid,
            active,
            avatar_url,
            first_name,
            last_name,
            email,
            phone,
            company,
            description,
            vat,
            role,
            language
          )
        `,
        )
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
  },
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
  },
);

export const fetchProjectsByUserId = createAsyncThunk(
  "projects/fetchProjectsByUserId",
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .or(`user.eq.${userId},assigned.eq.${userId}`)
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
        message: `${projects.length} projects found for user ${userId} (created and assigned)`,
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
  },
);

export const updateProjectPreview = createAsyncThunk(
  "projects/updateProjectPreview",
  async (projectId: string, { rejectWithValue }) => {
    try {
      const webhookUrl = `${
        import.meta.env.VITE_SUPABASE_FUNCTION_N8N_CREATE_PUBLICATIONS
      }?id=${projectId}`;

      const webhookResponse = await fetch(webhookUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!webhookResponse.ok) {
        return rejectWithValue({
          message: "Error calling webhook",
          status: webhookResponse.status,
        });
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
  },
);

export const updateProjectDraft = createAsyncThunk(
  "projects/updateProjectDraft",
  async (projectId: string, { rejectWithValue }) => {
    try {
      const { data: updatedProject, error } = await supabase
        .from("projects")
        .update({
          updated_at: new Date().toISOString(),
          state: "draft",
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
        message: "Project state updated to draft",
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
  },
);

export const deleteProject = createAsyncThunk(
  "projects/deleteProject",
  async (projectId: string, { rejectWithValue }) => {
    try {
      const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("image_data")
        .eq("id", projectId)
        .single();

      if (fetchError) {
        return rejectWithValue({
          message: `Error fetching project for deletion: ${fetchError.message}`,
          status: fetchError.code,
        });
      }

      if (project?.image_data && Array.isArray(project.image_data)) {
        for (const imageInfo of project.image_data) {
          if (imageInfo.url) {
            const urlParts = imageInfo.url.split("/");
            const fileName = urlParts.slice(-2).join("/");

            const { error: deleteImageError } = await supabase.storage
              .from("projects-images")
              .remove([fileName]);

            if (deleteImageError) {
              console.error("Error deleting image:", deleteImageError);
            }
          }
        }
      }

      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (deleteError) {
        return rejectWithValue({
          message: `Error deleting project: ${deleteError.message}`,
          status: deleteError.code,
        });
      }

      return {
        projectId,
        message: "Project deleted successfully",
      };
    } catch (error: unknown) {
      console.error("Error in deleteProject:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error deleting project",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  },
);

export const assignProject = createAsyncThunk(
  "projects/assignProject",
  async (
    {
      projectId,
      assignedUserId,
    }: { projectId: string; assignedUserId: string },
    { rejectWithValue },
  ) => {
    try {
      const { data: updatedProject, error } = await supabase
        .from("projects")
        .update({ user: assignedUserId })
        .eq("id", projectId)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error assigning project: ${error.message}`,
          status: error.code,
        });
      }

      return {
        project: updatedProject,
      };
    } catch (error: unknown) {
      console.error("Error in assignProject:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error assigning project",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  },
);
