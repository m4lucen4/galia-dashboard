import { createSlice } from "@reduxjs/toolkit";
import {
  addPrompt,
  updatePrompt,
  fetchPrompts,
  fetchPromptById,
  deletePrompt,
} from "../actions/AdminActions";

import { PromptsProps, IRequest, SupabaseError } from "../../types";

interface UserState {
  prompt: PromptsProps | null;
  prompts: PromptsProps[];
  addPromptRequest: IRequest;
  updatePromptRequest: IRequest;
  fetchPromptsRequest: IRequest;
  fetchPromptByIdRequest: IRequest;
  deletePromptRequest: IRequest;
}

const initialState: UserState = {
  prompt: null,
  prompts: [],
  addPromptRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  updatePromptRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  fetchPromptsRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  fetchPromptByIdRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  deletePromptRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
};

const adminSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(addPrompt.pending, (state) => {
        state.addPromptRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(addPrompt.fulfilled, (state, action) => {
        state.prompt = action.payload.prompt;
        state.addPromptRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(addPrompt.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.addPromptRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(updatePrompt.pending, (state) => {
        state.updatePromptRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(updatePrompt.fulfilled, (state, action) => {
        state.prompt = action.payload.prompt;
        state.updatePromptRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(updatePrompt.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.updatePromptRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(fetchPrompts.pending, (state) => {
        state.fetchPromptsRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchPrompts.fulfilled, (state, action) => {
        state.prompts = action.payload.prompts;
        state.fetchPromptsRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchPrompts.rejected, (state, action) => {
        state.fetchPromptsRequest = {
          inProgress: false,
          messages: action.payload as string,
          ok: false,
        };
      });
    builder
      .addCase(fetchPromptById.pending, (state) => {
        state.fetchPromptByIdRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchPromptById.fulfilled, (state, action) => {
        state.prompt = action.payload.prompt;
        state.fetchPromptByIdRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchPromptById.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.fetchPromptByIdRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(deletePrompt.pending, (state) => {
        state.deletePromptRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(deletePrompt.fulfilled, (state, action) => {
        state.prompts = state.prompts.filter(
          (prompt) => prompt.id !== action.payload.promptId
        );
        state.deletePromptRequest = {
          inProgress: false,
          messages: action.payload.message,
          ok: true,
        };
      })
      .addCase(deletePrompt.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.deletePromptRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
  },
});

export default adminSlice.reducer;
