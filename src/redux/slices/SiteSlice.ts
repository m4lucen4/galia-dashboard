import { createSlice } from "@reduxjs/toolkit";
import {
  fetchSite,
  createSite,
  updateSite,
  publishSite,
  uploadSiteImage,
} from "../actions/SiteActions";
import { SiteDataProps, IRequest, SupabaseError } from "../../types";

interface SiteState {
  site: SiteDataProps | null;
  fetchRequest: IRequest;
  saveRequest: IRequest;
  publishRequest: IRequest;
  uploadRequest: IRequest;
}

const defaultRequest: IRequest = {
  inProgress: false,
  messages: "",
  ok: false,
};

const initialState: SiteState = {
  site: null,
  fetchRequest: { ...defaultRequest },
  saveRequest: { ...defaultRequest },
  publishRequest: { ...defaultRequest },
  uploadRequest: { ...defaultRequest },
};

function getErrorMessage(payload: unknown): string {
  const errorPayload = payload as SupabaseError | string;
  return typeof errorPayload === "string"
    ? errorPayload
    : errorPayload?.message || "Error desconocido";
}

const siteSlice = createSlice({
  name: "site",
  initialState,
  reducers: {
    clearSiteErrors: (state) => {
      state.fetchRequest = { ...defaultRequest };
      state.saveRequest = { ...defaultRequest };
      state.publishRequest = { ...defaultRequest };
      state.uploadRequest = { ...defaultRequest };
    },
    clearSite: (state) => {
      state.site = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch site
    builder
      .addCase(fetchSite.pending, (state) => {
        state.fetchRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(fetchSite.fulfilled, (state, action) => {
        state.site = action.payload.site;
        state.fetchRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(fetchSite.rejected, (state, action) => {
        state.fetchRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Create site
    builder
      .addCase(createSite.pending, (state) => {
        state.saveRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(createSite.fulfilled, (state, action) => {
        state.site = action.payload.site;
        state.saveRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(createSite.rejected, (state, action) => {
        state.saveRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Update site
    builder
      .addCase(updateSite.pending, (state) => {
        state.saveRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(updateSite.fulfilled, (state, action) => {
        state.site = action.payload.site;
        state.saveRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(updateSite.rejected, (state, action) => {
        state.saveRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Publish/unpublish site
    builder
      .addCase(publishSite.pending, (state) => {
        state.publishRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(publishSite.fulfilled, (state, action) => {
        state.site = action.payload.site;
        state.publishRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(publishSite.rejected, (state, action) => {
        state.publishRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Upload image
    builder
      .addCase(uploadSiteImage.pending, (state) => {
        state.uploadRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(uploadSiteImage.fulfilled, (state) => {
        state.uploadRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(uploadSiteImage.rejected, (state, action) => {
        state.uploadRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });
  },
});

export const { clearSiteErrors, clearSite } = siteSlice.actions;
export default siteSlice.reducer;
