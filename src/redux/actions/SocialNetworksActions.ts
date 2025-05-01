import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";

const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
const LINKEDIN_REDIRECT_URI =
  import.meta.env.VITE_LINKEDIN_REDIRECT_URI ||
  `${window.location.origin}/auth/linkedin/callback`;
const LINKEDIN_SCOPE = "r_liteprofile w_member_social";

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

      if (error) throw new Error(error.message);

      const { access_token, refresh_token, expires_in, person_id, user_name } =
        data;

      // Get the current user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        return rejectWithValue("User not authenticated");
      }

      // Create the LinkedIn data object
      const linkedln_data = {
        linkedin_person_id: person_id,
        access_token,
        refresh_token,
        token_expires_at: new Date(
          Date.now() + expires_in * 1000
        ).toISOString(),
        is_connected: true,
        permissions_granted: ["w_member_social"],
        user_name,
      };

      // Update the user_linkedin_connections table
      const { error: updateError } = await supabase
        .from("userData")
        .update({
          linkedln_data,
        })
        .eq("uid", userId);

      if (updateError) throw new Error(updateError.message);

      return {
        isConnected: true,
        personId: person_id,
        userName: user_name,
        expiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error processing LinkedIn callback:", error);
      return rejectWithValue("Failed to process LinkedIn authorization");
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

      // 4. Verifying the token with LinkedIn API
      try {
        const linkedInResponse = await fetch("https://api.linkedin.com/v2/me", {
          headers: {
            Authorization: `Bearer ${data.linkedln_data.access_token}`,
          },
        });

        if (!linkedInResponse.ok) {
          console.log(
            "LinkedIn token validation failed:",
            await linkedInResponse.text()
          );

          await supabase
            .from("userData")
            .update({
              linkedin_data: {
                ...data.linkedln_data,
                is_connected: false,
              },
            })
            .eq("id", authData.user.id);

          return { isConnected: false };
        }

        return {
          isConnected: true,
          personId: data.linkedln_data.linkedin_person_id,
          userName: data.linkedln_data.user_name,
          expiresAt: data.linkedln_data.token_expires_at,
        };
      } catch (apiError) {
        console.error("Error validating LinkedIn token:", apiError);

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
