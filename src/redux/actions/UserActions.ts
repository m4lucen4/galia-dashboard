import { createAsyncThunk } from "@reduxjs/toolkit";
import { UserDataProps, SupabaseError } from "../../types";
import { supabase } from "../../helpers/supabase";

export type CreateUserProps = Omit<
  UserDataProps,
  "id" | "created_at" | "updated_at" | "uid"
> & {
  password: string;
};

export type UpdateUserProps = {
  id: string;
  uid: string;
} & Partial<Omit<UserDataProps, "id" | "created_at" | "updated_at">> & {
    password?: string;
  };

export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const { data: users, error } = await supabase
        .from("userData")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al recuperar usuarios:", error);
        return rejectWithValue({
          message: `Error al obtener la lista de usuarios: ${error.message}`,
          status: error.code,
        });
      }

      if (!users || users.length === 0) {
        return {
          users: [],
          message: "No se encontraron usuarios",
        };
      }

      return {
        users: users,
        message: `Se encontraron ${users.length} usuarios`,
      };
    } catch (error: unknown) {
      console.error("Error en fetchUsers:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error al recuperar los usuarios",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const fetchUserByUid = createAsyncThunk(
  "users/fetchUserByUid",
  async (uid: string, { rejectWithValue }) => {
    try {
      const { data: user, error } = await supabase
        .from("userData")
        .select("*")
        .eq("uid", uid)
        .single();

      if (error) {
        console.error("Error al recuperar usuario por UID:", error);
        return rejectWithValue({
          message: `Error al obtener los datos del usuario: ${error.message}`,
          status: error.code,
        });
      }

      if (!user) {
        return {
          user: null,
          message: "Requested user not found",
        };
      }

      return {
        user,
        message: "User found successfully",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Recovery error while fetching user",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const addUser = createAsyncThunk(
  "users/addUser",
  async (userData: CreateUserProps, { rejectWithValue }) => {
    try {
      // 1. Create user in Supabase Authentication
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) {
        return rejectWithValue({
          message: authError.message,
          status: authError.status,
        });
      }

      if (!authData.user) {
        return rejectWithValue({
          message: "Could not create user in the authentication system",
          status: 400,
        });
      }

      // 2. Create user in the userData table
      const { error: dbError } = await supabase.from("userData").insert({
        uid: authData.user.id,
        active: userData.active,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        phone: userData.phone,
        company: userData.company,
        vat: userData.vat,
        role: userData.role,
      });

      if (dbError) {
        return rejectWithValue({
          message: `Error creating user in database: ${dbError.message}`,
          status: dbError.code,
        });
      }

      // 3. Get the complete record for verification and state update
      const { data: userRecord, error: fetchError } = await supabase
        .from("userData")
        .select("*")
        .eq("uid", authData.user.id)
        .single();

      if (fetchError) {
        return {
          user: {
            ...userData,
            uid: authData.user.id,
            password: undefined,
          },
          message:
            "User created successfully, but not all data could be retrieved",
        };
      }

      // Return the complete record to update Redux state
      return {
        user: userRecord,
        message: "User created successfully",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message: error instanceof Error ? error.message : "Error creating user",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const updateUser = createAsyncThunk(
  "users/updateUser",
  async (userData: UpdateUserProps, { rejectWithValue }) => {
    try {
      // 1. Create an object with only the provided fields to update in userData
      const updateData: Partial<
        Omit<UserDataProps, "id" | "created_at" | "uid">
      > = {
        updated_at: new Date().toISOString(),
      };

      if (userData.first_name !== undefined)
        updateData.first_name = userData.first_name;
      if (userData.last_name !== undefined)
        updateData.last_name = userData.last_name;
      if (userData.active !== undefined) updateData.active = userData.active;
      if (userData.phone !== undefined) updateData.phone = userData.phone;
      if (userData.company !== undefined) updateData.company = userData.company;
      if (userData.vat !== undefined) updateData.vat = userData.vat;
      if (userData.role !== undefined) updateData.role = userData.role;

      // 2. Update data in userData table
      const { error: dbError } = await supabase
        .from("userData")
        .update(updateData)
        .eq("uid", userData.uid);

      if (dbError) {
        return rejectWithValue({
          message: `Error actualizando datos en la base de datos: ${dbError.message}`,
          status: dbError.code,
        });
      }

      // 3. Obtener el registro actualizado
      const { data: updatedUser, error: fetchError } = await supabase
        .from("userData")
        .select("*")
        .eq("uid", userData.uid)
        .single();

      if (fetchError) {
        return rejectWithValue({
          message: `Error al recuperar los datos actualizados: ${fetchError.message}`,
          status: fetchError.code,
        });
      }

      return {
        user: updatedUser,
        message: "Usuario actualizado correctamente en la base de datos",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error al actualizar el usuario",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);

export const updateProfile = createAsyncThunk(
  "users/updateUser",
  async (userData: UpdateUserProps, { rejectWithValue }) => {
    try {
      let authUpdateSuccess = true;

      // 1. Si se proporciona una nueva contraseña, actualizarla en Authentication
      if (userData.password && userData.password.trim() !== "") {
        const { error: authError } = await supabase.auth.updateUser({
          password: userData.password,
        });

        if (authError) {
          console.error("Error al actualizar la contraseña:", authError);
          authUpdateSuccess = false;
          // No rechazamos aquí porque aún podemos actualizar otros datos
        }
      }

      // 3. Crear un objeto con solo los campos proporcionados para actualizar en userData
      const updateData: Partial<
        Omit<UserDataProps, "id" | "created_at" | "uid">
      > = {
        updated_at: new Date().toISOString(),
      };

      if (userData.first_name !== undefined)
        updateData.first_name = userData.first_name;
      if (userData.last_name !== undefined)
        updateData.last_name = userData.last_name;
      if (userData.active !== undefined) updateData.active = userData.active;
      if (userData.phone !== undefined) updateData.phone = userData.phone;
      if (userData.company !== undefined) updateData.company = userData.company;
      if (userData.vat !== undefined) updateData.vat = userData.vat;
      if (userData.role !== undefined) updateData.role = userData.role;

      // 4. Actualizar datos en la tabla userData
      const { error: dbError } = await supabase
        .from("userData")
        .update(updateData)
        .eq("uid", userData.uid);

      if (dbError) {
        return rejectWithValue({
          message: `Error actualizando datos en la base de datos: ${dbError.message}`,
          status: dbError.code,
        });
      }

      // 5. Obtener el registro actualizado
      const { data: updatedUser, error: fetchError } = await supabase
        .from("userData")
        .select("*")
        .eq("uid", userData.uid)
        .single();

      if (fetchError) {
        return rejectWithValue({
          message: `Error al recuperar los datos actualizados: ${fetchError.message}`,
          status: fetchError.code,
        });
      }

      return {
        user: updatedUser,
        message: authUpdateSuccess
          ? "Usuario actualizado correctamente"
          : "Usuario actualizado con errores en la autenticación",
      };
    } catch (error: unknown) {
      console.error("Error en updateUser:", error);
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error al actualizar el usuario",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);
