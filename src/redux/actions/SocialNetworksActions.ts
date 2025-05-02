import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";

const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
const LINKEDIN_REDIRECT_URI =
  import.meta.env.VITE_LINKEDIN_REDIRECT_URI ||
  `${window.location.origin}/auth/linkedin/callback`;
const LINKEDIN_SCOPE = "openid profile w_member_social email";

export const initiateLinkedInAuth = createAsyncThunk(
  "socialNetworks/initiateLinkedInAuth",
  async (_, { rejectWithValue }) => {
    try {
      // Generate a random state string to prevent CSRF attacks
      const state = Math.random().toString(36).substring(2, 15);

      // Save the state in localStorage
      localStorage.setItem("linkedln_auth_state", state);

      // Build the LinkedIn authorization URL
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        LINKEDIN_REDIRECT_URI
      )}&state=${state}&scope=${encodeURIComponent(LINKEDIN_SCOPE)}`;

      // Redirect the user to LinkedIn for authorization
      window.location.href = authUrl;

      return true;
    } catch (error) {
      console.error("Error initiating LinkedIn auth:", error);
      return rejectWithValue("Failed to initiate LinkedIn authorization");
    }
  }
);

export const processLinkedInCallback = createAsyncThunk(
  "socialNetworks/processLinkedInCallback",
  async (
    { code, state }: { code: string; state: string },
    { rejectWithValue }
  ) => {
    try {
      // Verify the state parameter to prevent CSRF attacks
      const savedState = localStorage.getItem("linkedln_auth_state");
      if (state !== savedState) {
        return rejectWithValue("State mismatch. Possible CSRF attack.");
      }

      // Clean up the state from localStorage
      localStorage.removeItem("linkedln_auth_state");

      // Call the serverless function to exchange the code for an access token
      const { data, error } = await supabase.functions.invoke(
        "linkedin-exchange-code",
        {
          body: { code, redirect_uri: LINKEDIN_REDIRECT_URI },
        }
      );

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Error calling edge function");
      }

      if (!data) {
        throw new Error("No data received from edge function");
      }

      // Extract the access token and other data from the response
      const {
        access_token,
        refresh_token,
        expires_in = 3600,
        person_id,
        user_name = "LinkedIn User",
        id_token,
      } = data;

      if (!access_token) {
        throw new Error("No access token received");
      }

      if (!person_id) {
        console.warn("No LinkedIn person ID received, using fallback value");
      }

      // Get the current user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        return rejectWithValue("User not authenticated");
      }

      // Create the LinkedIn data object
      const linkedln_data = {
        linkedin_person_id: person_id || "unknown",
        access_token,
        refresh_token,
        id_token,
        token_expires_at: new Date(
          Date.now() + expires_in * 1000
        ).toISOString(),
        is_connected: true,
        permissions_granted: ["openid", "profile", "w_member_social", "email"],
        user_name,
        connected_at: new Date().toISOString(),
      };

      // Update the user_linkedin_connections table
      const { error: updateError } = await supabase
        .from("userData")
        .update({
          linkedln_data,
        })
        .eq("uid", userId);

      if (updateError) {
        console.error("Error updating user data:", updateError);
        throw new Error(updateError.message || "Failed to update user data");
      }

      return {
        isConnected: true,
        personId: person_id || "unknown",
        userName: user_name,
        expiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error processing LinkedIn callback:", error);
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to process LinkedIn authorization"
      );
    }
  }
);

export const disconnectLinkedIn = createAsyncThunk(
  "socialNetworks/disconnectLinkedIn",
  async (_, { rejectWithValue }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        return rejectWithValue("User not authenticated");
      }

      // Get the current LinkedIn data
      const { data: user, error: fetchError } = await supabase
        .from("userData")
        .select("linkedln_data")
        .eq("uid", userId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      // Modificamos solo el campo is_connected
      const updatedLinkedInData = user.linkedln_data
        ? { ...user.linkedln_data, is_connected: false }
        : null;

      // Update the user_linkedin_connections table
      const { error } = await supabase
        .from("userData")
        .update({
          linkedln_data: updatedLinkedInData,
        })
        .eq("uid", userId);

      if (error) throw new Error(error.message);

      return true;
    } catch (error) {
      console.error("Error disconnecting LinkedIn:", error);
      return rejectWithValue("Failed to disconnect LinkedIn");
    }
  }
);

export const checkLinkedInConnection = createAsyncThunk(
  "socialNetworks/checkLinkedInConnection",
  async (_, { rejectWithValue }) => {
    try {
      // 1. Getting the current user
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return { isConnected: false };

      const { data, error } = await supabase
        .from("userData")
        .select("linkedln_data")
        .eq("uid", authData.user.id)
        .single();

      if (error) throw new Error(error.message);

      // 2. Verifying if the user has LinkedIn data
      if (!data || !data.linkedln_data || !data.linkedln_data.is_connected) {
        return { isConnected: false };
      }

      // 3. Verifying if the token is expired
      const tokenExpired =
        new Date(data.linkedln_data.token_expires_at) < new Date();

      if (tokenExpired) {
        return { isConnected: false };
      }

      // 4. Verifying the token with LinkedIn API through Edge Function
      try {
        const { data: verifyData, error: verifyError } =
          await supabase.functions.invoke("linkedin-verify-token", {
            body: { access_token: data.linkedln_data.access_token },
          });

        if (verifyError) {
          console.error("Error calling verify token function:", verifyError);
          return {
            isConnected: true,
            personId: data.linkedln_data.linkedin_person_id,
            userName: data.linkedln_data.user_name,
            expiresAt: data.linkedln_data.token_expires_at,
            warning: "Connection could not be verified due to server issues",
          };
        }

        if (!verifyData.isValid) {
          // Token not valid, update database
          await supabase
            .from("userData")
            .update({
              linkedln_data: {
                ...data.linkedln_data,
                is_connected: false,
              },
            })
            .eq("uid", authData.user.id);

          return { isConnected: false };
        }

        return {
          isConnected: true,
          personId: data.linkedln_data.linkedin_person_id,
          userName: data.linkedln_data.user_name,
          expiresAt: data.linkedln_data.token_expires_at,
        };
      } catch (apiError) {
        console.error("Error verifying LinkedIn token:", apiError);

        return {
          isConnected: true,
          personId: data.linkedln_data.linkedin_person_id,
          userName: data.linkedln_data.user_name,
          expiresAt: data.linkedln_data.token_expires_at,
          warning: "Connection could not be verified due to network issues",
        };
      }
    } catch (error) {
      console.error("Error checking LinkedIn connection:", error);
      return rejectWithValue("Failed to check LinkedIn connection status");
    }
  }
);
