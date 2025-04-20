import { createSlice } from "@reduxjs/toolkit";
import {
  addProject,
  fetchProjects,
  fetchProjectById,
} from "../actions/ProjectActions";
import { ProjectDataProps, IRequest, SupabaseError } from "../../types";

interface ProjectState {
  project: ProjectDataProps | null;
  projects: ProjectDataProps[];
  projectAddRequest: IRequest;
  projectsFetchRequest: IRequest;
  projectFetchByIdRequest: IRequest;
}

const initialState: ProjectState = {
  project: null,
  projects: [],
  projectAddRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  projectsFetchRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  projectFetchByIdRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
};

const projectSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearProjectErrors: (state) => {
      state.projectAddRequest = initialState.projectAddRequest;
      state.projectsFetchRequest = initialState.projectsFetchRequest;
      state.projectFetchByIdRequest = initialState.projectFetchByIdRequest;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addProject.pending, (state) => {
        state.projectAddRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(addProject.fulfilled, (state, action) => {
        state.project = action.payload.project;
        state.projectAddRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(addProject.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.projectAddRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.projectsFetchRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.projects = action.payload.projects;
        state.projectsFetchRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.projectsFetchRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(fetchProjectById.pending, (state) => {
        state.projectFetchByIdRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.project = action.payload.project;
        state.projectFetchByIdRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.projectFetchByIdRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
  },
});

export const { clearProjectErrors } = projectSlice.actions;

export default projectSlice.reducer;
