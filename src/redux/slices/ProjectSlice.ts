import { createSlice } from "@reduxjs/toolkit";
import {
  addProject,
  fetchProjects,
  fetchProjectById,
  updateProject,
  fetchProjectsByUserId,
  fetchProjectsWithGoogleMaps,
  updateProjectPreview,
  updateProjectDraft,
} from "../actions/ProjectActions";
import { ProjectDataProps, IRequest, SupabaseError } from "../../types";

interface ProjectState {
  project: ProjectDataProps | null;
  projects: ProjectDataProps[];
  projectAddRequest: IRequest;
  projectUpdateRequest: IRequest;
  projectsFetchRequest: IRequest;
  projectFetchByIdRequest: IRequest;
  projectFetchByUserIdRequest: IRequest;
  projectFetchWithGoogleMapsRequest: IRequest;
  updateProjectStateRequest: IRequest;
}

const initialState: ProjectState = {
  project: null,
  projects: [],
  projectAddRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  projectUpdateRequest: {
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
  projectFetchByUserIdRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  projectFetchWithGoogleMapsRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  updateProjectStateRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    clearProjectErrors: (state) => {
      state.projectAddRequest = initialState.projectAddRequest;
      state.projectsFetchRequest = initialState.projectsFetchRequest;
      state.projectFetchByIdRequest = initialState.projectFetchByIdRequest;
    },
    clearSelectedProject: (state) => {
      state.project = null;
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
    builder
      .addCase(updateProject.pending, (state) => {
        state.projectUpdateRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.project = action.payload.project;
        state.projectUpdateRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(updateProject.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.projectUpdateRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(fetchProjectsByUserId.pending, (state) => {
        state.projectFetchByUserIdRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchProjectsByUserId.fulfilled, (state, action) => {
        state.projects = action.payload.projects;
        state.projectFetchByUserIdRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchProjectsByUserId.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.projectFetchByUserIdRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(updateProjectPreview.pending, (state) => {
        state.updateProjectStateRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(updateProjectPreview.fulfilled, (state, action) => {
        const updatedProject = action.payload.project;
        state.projects = state.projects.map((project) =>
          project.id === updatedProject.id ? updatedProject : project
        );
        state.updateProjectStateRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(updateProjectPreview.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.updateProjectStateRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(updateProjectDraft.pending, (state) => {
        state.updateProjectStateRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(updateProjectDraft.fulfilled, (state, action) => {
        const updatedProject = action.payload.project;
        state.projects = state.projects.map((project) =>
          project.id === updatedProject.id ? updatedProject : project
        );
        state.updateProjectStateRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(updateProjectDraft.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.updateProjectStateRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(fetchProjectsWithGoogleMaps.pending, (state) => {
        state.projectFetchWithGoogleMapsRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchProjectsWithGoogleMaps.fulfilled, (state, action) => {
        state.projects = action.payload.projects;
        state.projectFetchWithGoogleMapsRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchProjectsWithGoogleMaps.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.projectFetchWithGoogleMapsRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
  },
});

export const { clearProjectErrors, clearSelectedProject } =
  projectSlice.actions;

export default projectSlice.reducer;
