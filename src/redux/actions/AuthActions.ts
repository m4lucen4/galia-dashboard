import { createAsyncThunk } from "@reduxjs/toolkit";
import { ChangePasswordProps, LoginProps } from "../../types";
import { supabase } from "../../helpers/supabase";
import i18n from "../../i18n";

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

      if (!data.user) {
        return rejectWithValue("Dont match any user");
      }

      const { data: userData, error: userError } = await supabase
        .from("userData")
        .select("*")
        .eq("uid", data.user.id)
        .single();

      if (userError) {
        console.error("Error retrieving additional user data:", userError);

        return {
          user: data.user,
          session: data.session,
          userData: null,
        };
      }

      if (userData?.active === false) {
        await supabase.auth.signOut();
        return rejectWithValue("inactive_user");
      }

      if (userData?.language) {
        i18n.changeLanguage(userData.language);
      }
      return {
        user: data.user,
        session: data.session,
        userData: userData,
      };
    } catch (error: unknown) {
      const appError: AppError = {
        message: error instanceof Error ? error.message : "Error signing in",
      };
      return rejectWithValue(appError.message);
    }
  },
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

      const { data: userData, error: userError } = await supabase
        .from("userData")
        .select("*")
        .eq("uid", data.session.user.id)
        .single();

      if (userError) {
        console.error("Error al obtener datos adicionales:", userError);
        return {
          user: data.session.user,
          session: data.session,
          userData: null,
        };
      }

      if (userData?.language) {
        i18n.changeLanguage(userData.language);
      }

      return {
        user: data.session.user,
        session: data.session,
        userData: userData,
      };
    } catch (error: unknown) {
      const appError: AppError = {
        message:
          error instanceof Error
            ? error.message
            : "Error verificando estado de sesión",
      };
      return rejectWithValue(appError.message);
    }
  },
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
        message: error instanceof Error ? error.message : "Error close session",
      };
      return rejectWithValue(appError.message);
    }
  },
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
  },
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
  },
);
