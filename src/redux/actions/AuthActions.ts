import { createAsyncThunk } from "@reduxjs/toolkit";
import { ChangePasswordProps, LoginProps } from "../../types";
import { supabase } from "../../helpers/supabase";

interface AppError {
  message: string;
}

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }: LoginProps, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return rejectWithValue(error.message);
      }

      return {
        user: data.user,
        session: data.session,
      };
    } catch (error: unknown) {
      const appError: AppError = {
        message:
          error instanceof Error ? error.message : "Error al iniciar sesión",
      };
      return rejectWithValue(appError.message);
    }
  }
);

export const checkAuthState = createAsyncThunk(
  "auth/checkState",
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return rejectWithValue(error.message);
      }

      if (!data.session) {
        return rejectWithValue("No hay sesión activa");
      }

      return {
        user: data.session.user,
        session: data.session,
      };
    } catch (error: unknown) {
      const appError: AppError = {
        message:
          error instanceof Error
            ? error.message
            : "Error al verificar la sesión",
      };
      return rejectWithValue(appError.message);
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return rejectWithValue(error.message);
      }

      return null;
    } catch (error: unknown) {
      const appError: AppError = {
        message:
          error instanceof Error ? error.message : "Error al cerrar sesión",
      };
      return rejectWithValue(appError.message);
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (email: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });

      if (error) {
        return rejectWithValue(error.message);
      }

      return { success: true };
    } catch (error: unknown) {
      const appError: AppError = {
        message:
          error instanceof Error
            ? error.message
            : "Error when sending the reset password email",
      };
      return rejectWithValue(appError.message);
    }
  }
);

export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async ({ newPassword }: ChangePasswordProps, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return rejectWithValue(error.message);
      }

      return { success: true, message: "Contraseña actualizada correctamente" };
    } catch (error: unknown) {
      const appError: AppError = {
        message:
          error instanceof Error
            ? error.message
            : "Error al cambiar la contraseña",
      };
      return rejectWithValue(appError.message);
    }
  }
);
