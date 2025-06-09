import { createAsyncThunk } from "@reduxjs/toolkit";
import { PromptsProps, SupabaseError } from "../../types";
import { supabase } from "../../helpers/supabase";

export type CreatePromptProps = Omit<
  PromptsProps,
  "id" | "created_at" | "updated_at"
>;

export const addPrompt = createAsyncThunk(
  "prompts/addPrompt",
  async (promptData: CreatePromptProps, { rejectWithValue }) => {
    try {
      const { data: newPrompt, error } = await supabase
        .from("prompts")
        .insert({
          title: promptData.title,
          description: promptData.description,
        })
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error while creating prompt: ${error.message}`,
          status: error.code,
        });
      }

      return {
        prompt: newPrompt,
        message: "Prompt created successfully",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error while creating prompt",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const updatePrompt = createAsyncThunk(
  "prompts/updatePrompt",
  async (
    promptData: CreatePromptProps & { id: string },
    { rejectWithValue }
  ) => {
    try {
      const { data: updatedPrompt, error } = await supabase
        .from("prompts")
        .update({
          updated_at: new Date().toISOString(),
          title: promptData.title,
          description: promptData.description,
        })
        .eq("id", promptData.id)
        .select()
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error while updating prompt: ${error.message}`,
          status: error.code,
        });
      }

      return {
        prompt: updatedPrompt,
        message: "Prompt updated successfully",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error while updating prompt",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const fetchPrompts = createAsyncThunk(
  "prompts/fetchPrompts",
  async (_, { rejectWithValue }) => {
    try {
      const { data: prompts, error } = await supabase
        .from("prompts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return rejectWithValue({
          message: `Error getting prompts list: ${error.message}`,
          status: error.code,
        });
      }

      if (!prompts || prompts.length === 0) {
        return {
          prompts: [],
          message: "Don't have any prompts yet",
        };
      }

      return {
        prompts: prompts,
        message: `${prompts.length} prompts found`,
      };
    } catch (error: unknown) {
      console.error("Error in fetchPrompts:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error retrieving prompts",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const fetchPromptById = createAsyncThunk(
  "prompts/fetchPromptById",
  async (promptId: string, { rejectWithValue }) => {
    try {
      const { data: prompt, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("id", promptId)
        .single();

      if (error) {
        return rejectWithValue({
          message: `Error getting prompt: ${error.message}`,
          status: error.code,
        });
      }

      if (!prompt) {
        return rejectWithValue({
          message: `Prompt with id ${promptId} not found`,
          status: 404,
        });
      }

      return {
        prompt,
        message: "Prompt found successfully",
      };
    } catch (error: unknown) {
      console.error("Error in fetchPromptById:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error retrieving prompt",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const deletePrompt = createAsyncThunk(
  "prompts/deletePrompt",
  async (promptId: string, { rejectWithValue }) => {
    try {
      const { error: deleteError } = await supabase
        .from("prompts")
        .delete()
        .eq("id", promptId);

      if (deleteError) {
        return rejectWithValue({
          message: `Error deleting prompt: ${deleteError.message}`,
          status: deleteError.code,
        });
      }

      return {
        promptId,
        message: "Prompt deleted successfully",
      };
    } catch (error: unknown) {
      console.error("Error in deletePrompt:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error deleting prompt",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);
