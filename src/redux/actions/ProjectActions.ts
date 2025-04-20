import { createAsyncThunk } from "@reduxjs/toolkit";
import { ProjectDataProps, SupabaseError } from "../../types";
import { supabase } from "../../helpers/supabase";

export type CreateProjectProps = Omit<
  ProjectDataProps,
  "id" | "created_at" | "updated_at"
>;

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
        })
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error while creating project: ${error.message}`,
          status: error.code,
        });
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
