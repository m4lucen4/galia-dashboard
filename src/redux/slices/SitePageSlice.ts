import { createSlice } from "@reduxjs/toolkit";
import {
  fetchSitePages,
  initDefaultPages,
  updateSitePage,
  reorderSitePages,
  createSitePage,
  deleteSitePage,
} from "../actions/SitePageActions";
import { SitePageDataProps, IRequest, SupabaseError } from "../../types";

interface SitePageState {
  pages: SitePageDataProps[];
  fetchRequest: IRequest;
  saveRequest: IRequest;
  createRequest: IRequest;
  deleteRequest: IRequest;
}

const defaultRequest: IRequest = {
  inProgress: false,
  messages: "",
  ok: false,
};

const initialState: SitePageState = {
  pages: [],
  fetchRequest: { ...defaultRequest },
  saveRequest: { ...defaultRequest },
  createRequest: { ...defaultRequest },
  deleteRequest: { ...defaultRequest },
};

function getErrorMessage(payload: unknown): string {
  const errorPayload = payload as SupabaseError | string;
  return typeof errorPayload === "string"
    ? errorPayload
    : errorPayload?.message || "Error desconocido";
}

const sitePageSlice = createSlice({
  name: "sitePage",
  initialState,
  reducers: {
    clearPageErrors: (state) => {
      state.fetchRequest = { ...defaultRequest };
      state.saveRequest = { ...defaultRequest };
      state.createRequest = { ...defaultRequest };
      state.deleteRequest = { ...defaultRequest };
    },
    clearPages: (state) => {
      state.pages = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch pages
    builder
      .addCase(fetchSitePages.pending, (state) => {
        state.fetchRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(fetchSitePages.fulfilled, (state, action) => {
        state.pages = action.payload.pages;
        state.fetchRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(fetchSitePages.rejected, (state, action) => {
        state.fetchRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Init default pages
    builder
      .addCase(initDefaultPages.pending, (state) => {
        state.fetchRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(initDefaultPages.fulfilled, (state, action) => {
        state.pages = action.payload.pages;
        state.fetchRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(initDefaultPages.rejected, (state, action) => {
        state.fetchRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Update page
    builder
      .addCase(updateSitePage.pending, (state) => {
        state.saveRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(updateSitePage.fulfilled, (state, action) => {
        const updated = action.payload.page;
        state.pages = state.pages.map((p) =>
          p.id === updated.id ? updated : p,
        );
        state.saveRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(updateSitePage.rejected, (state, action) => {
        state.saveRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Reorder pages
    builder.addCase(reorderSitePages.fulfilled, (state, action) => {
      for (const update of action.payload.pages) {
        const page = state.pages.find((p) => p.id === update.id);
        if (page) page.position = update.position;
      }
      state.pages.sort((a, b) => a.position - b.position);
    });

    // Create page
    builder
      .addCase(createSitePage.pending, (state) => {
        state.createRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(createSitePage.fulfilled, (state, action) => {
        state.pages.push(action.payload.page);
        state.createRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(createSitePage.rejected, (state, action) => {
        state.createRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Delete page
    builder
      .addCase(deleteSitePage.pending, (state) => {
        state.deleteRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(deleteSitePage.fulfilled, (state, action) => {
        state.pages = state.pages.filter((p) => p.id !== action.payload.pageId);
        state.deleteRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(deleteSitePage.rejected, (state, action) => {
        state.deleteRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });
  },
});

export const { clearPageErrors, clearPages } = sitePageSlice.actions;
export default sitePageSlice.reducer;
