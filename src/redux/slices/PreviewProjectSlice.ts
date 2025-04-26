import { createSlice } from "@reduxjs/toolkit";
import { PreviewProjectDataProps, IRequest, SupabaseError } from "../../types";
import {
  fetchPreviewProjectById,
  fetchPreviewProjects,
  fetchPreviewProjectsByUserId,
  updateProjectPublishing,
  deletePreviewProject,
} from "../actions/PreviewProjectActions";

interface ProjectState {
  project: PreviewProjectDataProps | null;
  projects: PreviewProjectDataProps[];
  previewProjectsFetchRequest: IRequest;
  previewProjectFetchByIdRequest: IRequest;
  previewProjectFetchByUserIdRequest: IRequest;
  previewProjectUpdatePublishingRequest: IRequest;
  previewProjectDeleteRequest: IRequest;
}

const initialState: ProjectState = {
  project: null,
  projects: [],
  previewProjectsFetchRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  previewProjectFetchByIdRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  previewProjectFetchByUserIdRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  previewProjectUpdatePublishingRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  previewProjectDeleteRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
};

const previewProjectSlice = createSlice({
  name: "previewProject",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPreviewProjects.pending, (state) => {
        state.previewProjectsFetchRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchPreviewProjects.fulfilled, (state, action) => {
        state.projects = action.payload.projects;
        state.previewProjectsFetchRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchPreviewProjects.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.previewProjectsFetchRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(fetchPreviewProjectById.pending, (state) => {
        state.previewProjectFetchByIdRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchPreviewProjectById.fulfilled, (state, action) => {
        state.project = action.payload.project;
        state.previewProjectFetchByIdRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchPreviewProjectById.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.previewProjectFetchByIdRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(fetchPreviewProjectsByUserId.pending, (state) => {
        state.previewProjectFetchByUserIdRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchPreviewProjectsByUserId.fulfilled, (state, action) => {
        state.projects = action.payload.projects;
        state.previewProjectFetchByUserIdRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchPreviewProjectsByUserId.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.previewProjectFetchByUserIdRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(updateProjectPublishing.pending, (state) => {
        state.previewProjectUpdatePublishingRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(updateProjectPublishing.fulfilled, (state, action) => {
        const { projectId, publishDate, checkSocialNetworks } =
          action.payload.project;
        const projectIndex = state.projects.findIndex(
          (project) => project.id === projectId
        );
        if (projectIndex !== -1) {
          state.projects[projectIndex].publishDate = publishDate;
          state.projects[projectIndex].checkSocialNetworks =
            checkSocialNetworks;
        }
        state.previewProjectUpdatePublishingRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(updateProjectPublishing.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.previewProjectUpdatePublishingRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(deletePreviewProject.pending, (state) => {
        state.previewProjectDeleteRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(deletePreviewProject.fulfilled, (state, action) => {
        const { projectId } = action.payload;
        state.projects = state.projects.filter(
          (project) => project.id !== projectId
        );
        state.previewProjectDeleteRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(deletePreviewProject.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.previewProjectDeleteRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
  },
});

export default previewProjectSlice.reducer;
