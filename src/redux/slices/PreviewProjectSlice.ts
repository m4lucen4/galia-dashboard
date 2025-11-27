import { createSlice } from "@reduxjs/toolkit";
import { PreviewProjectDataProps, IRequest, SupabaseError } from "../../types";
import {
  fetchPreviewProjectById,
  fetchPreviewProjects,
  fetchPreviewProjectsByUserId,
  updateProjectPublishing,
  deletePreviewProject,
  updatePreviewProject,
  resetProjectToPreview,
  updateMainVersion,
} from "../actions/PreviewProjectActions";

interface ProjectState {
  project: PreviewProjectDataProps | null;
  projects: PreviewProjectDataProps[];
  previewProjectsFetchRequest: IRequest;
  previewProjectFetchByIdRequest: IRequest;
  previewProjectFetchByUserIdRequest: IRequest;
  previewProjectUpdatePublishingRequest: IRequest;
  previewProjectDeleteRequest: IRequest;
  previewProjectUpdateRequest: IRequest;
  previewProjectResetRequest: IRequest;
  previewProjectUpdateMainVersionRequest: IRequest;
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
  previewProjectUpdateRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  previewProjectResetRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  previewProjectUpdateMainVersionRequest: {
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
    builder
      .addCase(updatePreviewProject.pending, (state) => {
        state.previewProjectUpdateRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(updatePreviewProject.fulfilled, (state, action) => {
        const { id, description_rich, image_data, versions } =
          action.payload.project;
        const projectIndex = state.projects.findIndex(
          (project) => project.id === id
        );
        if (projectIndex !== -1) {
          state.projects[projectIndex].description_rich = description_rich;
          state.projects[projectIndex].image_data = image_data;
          if (versions !== undefined) {
            state.projects[projectIndex].versions = versions;
          }
        }
        if (state.project && state.project.id === id) {
          state.project.description_rich = description_rich;
          state.project.image_data = image_data;
          if (versions !== undefined) {
            state.project.versions = versions;
          }
        }
        state.previewProjectUpdateRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(updatePreviewProject.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.previewProjectUpdateRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(resetProjectToPreview.pending, (state) => {
        state.previewProjectResetRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(resetProjectToPreview.fulfilled, (state, action) => {
        const { id } = action.payload.project;
        const projectIndex = state.projects.findIndex(
          (project) => project.id === id
        );
        if (projectIndex !== -1) {
          state.projects[projectIndex].state = "preview";
          state.projects[projectIndex].publishDate = undefined;
          state.projects[projectIndex].checkSocialNetworks = undefined;
          state.projects[projectIndex].instagramResult = undefined;
          state.projects[projectIndex].linkedlnResult = undefined;
        }
        state.previewProjectResetRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(resetProjectToPreview.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.previewProjectResetRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(updateMainVersion.pending, (state) => {
        state.previewProjectUpdateMainVersionRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(updateMainVersion.fulfilled, (state, action) => {
        const { id, versions } = action.payload.project;
        const projectIndex = state.projects.findIndex(
          (project) => project.id === id
        );
        if (projectIndex !== -1) {
          state.projects[projectIndex].versions = versions;
        }
        if (state.project && state.project.id === id) {
          state.project.versions = versions;
        }
        state.previewProjectUpdateMainVersionRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(updateMainVersion.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.previewProjectUpdateMainVersionRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
  },
});

export default previewProjectSlice.reducer;
