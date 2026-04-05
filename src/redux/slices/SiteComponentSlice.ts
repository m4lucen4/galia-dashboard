import { createSlice } from "@reduxjs/toolkit";
import {
  fetchSiteComponents,
  addSiteComponent,
  updateSiteComponent,
  deleteSiteComponent,
  reorderSiteComponents,
  uploadSlideImage,
  upsertCTAComponent,
} from "../actions/SiteComponentActions";
import { SiteComponentDataProps, IRequest, SupabaseError } from "../../types";

interface SiteComponentState {
  components: SiteComponentDataProps[];
  fetchRequest: IRequest;
  saveRequest: IRequest;
  deleteRequest: IRequest;
  uploadRequest: IRequest;
}

const defaultRequest: IRequest = {
  inProgress: false,
  messages: "",
  ok: false,
};

const initialState: SiteComponentState = {
  components: [],
  fetchRequest: { ...defaultRequest },
  saveRequest: { ...defaultRequest },
  deleteRequest: { ...defaultRequest },
  uploadRequest: { ...defaultRequest },
};

function getErrorMessage(payload: unknown): string {
  const errorPayload = payload as SupabaseError | string;
  return typeof errorPayload === "string"
    ? errorPayload
    : errorPayload?.message || "Error desconocido";
}

const siteComponentSlice = createSlice({
  name: "siteComponent",
  initialState,
  reducers: {
    clearComponentErrors: (state) => {
      state.fetchRequest = { ...defaultRequest };
      state.saveRequest = { ...defaultRequest };
      state.deleteRequest = { ...defaultRequest };
      state.uploadRequest = { ...defaultRequest };
    },
    clearComponents: (state) => {
      state.components = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch components
    builder
      .addCase(fetchSiteComponents.pending, (state) => {
        state.fetchRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(fetchSiteComponents.fulfilled, (state, action) => {
        state.components = action.payload.components;
        state.fetchRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(fetchSiteComponents.rejected, (state, action) => {
        state.fetchRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Add component
    builder
      .addCase(addSiteComponent.pending, (state) => {
        state.saveRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(addSiteComponent.fulfilled, (state, action) => {
        state.components.push(action.payload.component);
        state.components.sort((a, b) => a.position - b.position);
        state.saveRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(addSiteComponent.rejected, (state, action) => {
        state.saveRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Update component
    builder
      .addCase(updateSiteComponent.pending, (state) => {
        state.saveRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(updateSiteComponent.fulfilled, (state, action) => {
        const updated = action.payload.component;
        state.components = state.components.map((c) =>
          c.id === updated.id ? updated : c,
        );
        state.saveRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(updateSiteComponent.rejected, (state, action) => {
        state.saveRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Delete component
    builder
      .addCase(deleteSiteComponent.pending, (state) => {
        state.deleteRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(deleteSiteComponent.fulfilled, (state, action) => {
        state.components = state.components.filter(
          (c) => c.id !== action.payload.componentId,
        );
        state.deleteRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(deleteSiteComponent.rejected, (state, action) => {
        state.deleteRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Reorder components
    builder
      .addCase(reorderSiteComponents.fulfilled, (state, action) => {
        for (const update of action.payload.components) {
          const comp = state.components.find((c) => c.id === update.id);
          if (comp) comp.position = update.position;
        }
        state.components.sort((a, b) => a.position - b.position);
      });

    // Upload slide image
    builder
      .addCase(uploadSlideImage.pending, (state) => {
        state.uploadRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(uploadSlideImage.fulfilled, (state) => {
        state.uploadRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(uploadSlideImage.rejected, (state, action) => {
        state.uploadRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });

    // Upsert CTA component (handles new insert when component doesn't exist yet)
    builder
      .addCase(upsertCTAComponent.pending, (state) => {
        state.saveRequest = { inProgress: true, messages: "", ok: false };
      })
      .addCase(upsertCTAComponent.fulfilled, (state, action) => {
        if ("component" in action.payload && action.payload.component) {
          state.components.push(action.payload.component);
          state.components.sort((a, b) => a.position - b.position);
        }
        state.saveRequest = { inProgress: false, messages: "", ok: true };
      })
      .addCase(upsertCTAComponent.rejected, (state, action) => {
        state.saveRequest = {
          inProgress: false,
          messages: getErrorMessage(action.payload),
          ok: false,
        };
      });
  },
});

export const { clearComponentErrors, clearComponents } =
  siteComponentSlice.actions;
export default siteComponentSlice.reducer;
