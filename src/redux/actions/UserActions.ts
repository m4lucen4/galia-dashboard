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
        return rejectWithValue({
          message: `Error getting users list: ${error.message}`,
          status: error.code,
        });
      }

      if (!users || users.length === 0) {
        return {
          users: [],
          message: "Do not match any users",
        };
      }

      return {
        users: users,
        message: `Found ${users.length} users`,
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error retrieving users",
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
        return rejectWithValue({
          message: `Error getting user data: ${error.message}`,
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
      // 1. Save the current admin session
      const sessionResult = await supabase.auth.getSession();
      const currentSession = sessionResult.data.session;

      if (!currentSession) {
        return rejectWithValue({
          message: "Admin user is not authenticated",
          status: 401,
        });
      }

      const adminAccessToken = currentSession.access_token;
      const adminRefreshToken = currentSession.refresh_token;

      // 2. Create user in the authentication system
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

      // 3. Restore the admin session
      await supabase.auth.setSession({
        access_token: adminAccessToken,
        refresh_token: adminRefreshToken,
      });

      // 4. Create user in the database
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

      // 5. Recover the user data from the database
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

      // 6. Send a welcome email to the user
      try {
        const emailResponse = await fetch("/api/create-user-template", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userRecord.email,
            password: userData.password,
            firstName: userRecord.first_name,
            lastName: userRecord.last_name,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}));
          console.error("Failed to send welcome email:", {
            status: emailResponse.status,
            statusText: emailResponse.statusText,
            error: errorData,
          });
        }
      } catch (emailError) {
        console.error("Network error sending welcome email:", emailError);
      }

      // 7. Return the created user data
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
      if (userData.language !== undefined)
        updateData.language = userData.language;

      const { error: dbError } = await supabase
        .from("userData")
        .update(updateData)
        .eq("uid", userData.uid);

      if (dbError) {
        return rejectWithValue({
          message: `Error updating data in database: ${dbError.message}`,
          status: dbError.code,
        });
      }

      const { data: updatedUser, error: fetchError } = await supabase
        .from("userData")
        .select("*")
        .eq("uid", userData.uid)
        .single();

      if (fetchError) {
        return rejectWithValue({
          message: `Error retrieving updated data: ${fetchError.message}`,
          status: fetchError.code,
        });
      }

      return {
        user: updatedUser,
        message: "User updated successfully",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error updating the user",
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

      if (userData.password && userData.password.trim() !== "") {
        const { error: authError } = await supabase.auth.updateUser({
          password: userData.password,
        });

        if (authError) {
          console.error("Error updating password:", authError);
          authUpdateSuccess = false;
        }
      }

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

      const { error: dbError } = await supabase
        .from("userData")
        .update(updateData)
        .eq("uid", userData.uid);

      if (dbError) {
        return rejectWithValue({
          message: `Error updating data in database: ${dbError.message}`,
          status: dbError.code,
        });
      }

      const { data: updatedUser, error: fetchError } = await supabase
        .from("userData")
        .select("*")
        .eq("uid", userData.uid)
        .single();

      if (fetchError) {
        return rejectWithValue({
          message: `Error retrieving updated data: ${fetchError.message}`,
          status: fetchError.code,
        });
      }

      return {
        user: updatedUser,
        message: authUpdateSuccess
          ? "User updated successfully"
          : "User updated with errors in authentication",
      };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error
            ? error.message
            : "Error when updating the user",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  }
);
