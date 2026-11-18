import { createAsyncThunk } from "@reduxjs/toolkit";
import { UserDataProps, SupabaseError } from "../../types";
import { supabase } from "../../helpers/supabase";
import { USER_DATA_COLUMNS } from "../../helpers/userDataColumns";

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
    avatarFile?: File;
  };

export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const { data: users, error } = await supabase
        .from("userData")
        .select(USER_DATA_COLUMNS)
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
  },
);

export const fetchUserByUid = createAsyncThunk(
  "users/fetchUserByUid",
  async (uid: string, { rejectWithValue }) => {
    try {
      const { data: user, error } = await supabase
        .from("userData")
        .select(USER_DATA_COLUMNS)
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
  },
);

export const addUser = createAsyncThunk(
  "users/addUser",
  async (userData: CreateUserProps, { rejectWithValue }) => {
    try {
      // 1. The admin session authorizes the server-side creation (service_role).
      //    Public sign-ups are disabled, so the browser never calls auth.signUp.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return rejectWithValue({
          message: "Admin user is not authenticated",
          status: 401,
        });
      }
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      };

      // 2. Create the auth user and its userData row on the server
      const createResponse = await fetch("/api/admin-create-user", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(userData),
      });
      const createResult = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok || !createResult.user) {
        return rejectWithValue({
          message: createResult.error || "Error creating user",
          status: createResponse.status,
        });
      }
      const userRecord = createResult.user;

      // 3. Send a welcome email to the user
      try {
        const emailResponse = await fetch("/api/create-user-template", {
          method: "POST",
          headers: authHeaders,
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

      // 4. Call n8n webhook with user id

      const webhookUrl = import.meta.env.VITE_N8N_CREATE_PROJECT_WEBHOOK;
      if (webhookUrl && userRecord.id) {
        fetch(`${webhookUrl}?id=${userRecord.id}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }).catch((webhookError) => {
          console.error("Error calling n8n webhook:", webhookError);
        });
      }

      // 5. Return the created user data
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
  },
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

      if (userData.avatar_url !== undefined)
        updateData.avatar_url = userData.avatar_url;
      if (userData.first_name !== undefined)
        updateData.first_name = userData.first_name;
      if (userData.last_name !== undefined)
        updateData.last_name = userData.last_name;
      if (userData.active !== undefined) updateData.active = userData.active;
      if (userData.phone !== undefined) updateData.phone = userData.phone;
      if (userData.company !== undefined) updateData.company = userData.company;
      if (userData.vat !== undefined) updateData.vat = userData.vat;
      if (userData.description !== undefined)
        updateData.description = userData.description;
      if (userData.role !== undefined) updateData.role = userData.role;
      if (userData.language !== undefined)
        updateData.language = userData.language;
      if (userData.address !== undefined) updateData.address = userData.address;
      if (userData.postal_code !== undefined)
        updateData.postal_code = userData.postal_code;
      if (userData.city !== undefined) updateData.city = userData.city;
      if (userData.province !== undefined)
        updateData.province = userData.province;
      if (userData.province_id !== undefined)
        updateData.province_id = userData.province_id;
      if (userData.country !== undefined) updateData.country = userData.country;
      if (userData.job_position !== undefined)
        updateData.job_position = userData.job_position;
      if (userData.web !== undefined) updateData.web = userData.web;
      if (userData.tags !== undefined) updateData.tags = userData.tags;
      if (userData.odoo_id !== undefined) updateData.odoo_id = userData.odoo_id;
      if (userData.folder_nas !== undefined)
        updateData.folder_nas = userData.folder_nas;
      if (userData.has_web !== undefined) updateData.has_web = userData.has_web;

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
        .select(USER_DATA_COLUMNS)
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
  },
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

      let uploadedAvatarUrl: string | undefined;
      if (userData.avatarFile) {
        try {
          const { data: authUser } = await supabase.auth.getUser();
          if (!authUser?.user) {
            return rejectWithValue({
              message: "Not authenticated",
              status: 401,
            });
          }
          const fileExt = userData.avatarFile.name.split(".").pop() || "jpg";
          const filePath = `${userData.uid}/avatar.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("profile-avatar")
            .upload(filePath, userData.avatarFile, {
              upsert: true,
              contentType: userData.avatarFile.type || `image/${fileExt}`,
            });

          if (uploadError) {
            console.error("Error uploading avatar:", uploadError);
          } else {
            const { data: publicUrlData } = supabase.storage
              .from("profile-avatar")
              .getPublicUrl(filePath);
            uploadedAvatarUrl = publicUrlData.publicUrl;
          }
        } catch (storageError) {
          console.error("Unexpected error uploading avatar:", storageError);
        }
      }

      const updateData: Partial<
        Omit<UserDataProps, "id" | "created_at" | "uid">
      > = {
        updated_at: new Date().toISOString(),
      };

      if (uploadedAvatarUrl) {
        updateData.avatar_url = uploadedAvatarUrl;
      } else if (userData.avatar_url !== undefined) {
        updateData.avatar_url = userData.avatar_url;
      }
      if (userData.first_name !== undefined)
        updateData.first_name = userData.first_name;
      if (userData.last_name !== undefined)
        updateData.last_name = userData.last_name;
      if (userData.active !== undefined) updateData.active = userData.active;
      if (userData.phone !== undefined) updateData.phone = userData.phone;
      if (userData.company !== undefined) updateData.company = userData.company;
      if (userData.vat !== undefined) updateData.vat = userData.vat;
      if (userData.description !== undefined)
        updateData.description = userData.description;
      if (userData.role !== undefined) updateData.role = userData.role;
      if (userData.address !== undefined) updateData.address = userData.address;
      if (userData.postal_code !== undefined)
        updateData.postal_code = userData.postal_code;
      if (userData.city !== undefined) updateData.city = userData.city;
      if (userData.province !== undefined)
        updateData.province = userData.province;
      if (userData.province_id !== undefined)
        updateData.province_id = userData.province_id;
      if (userData.country !== undefined) updateData.country = userData.country;
      if (userData.job_position !== undefined)
        updateData.job_position = userData.job_position;
      if (userData.web !== undefined) updateData.web = userData.web;
      if (userData.tags !== undefined) updateData.tags = userData.tags;

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
        .select(USER_DATA_COLUMNS)
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
  },
);
