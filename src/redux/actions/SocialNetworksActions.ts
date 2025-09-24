import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";

const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
const LINKEDIN_REDIRECT_URI =
  import.meta.env.VITE_LINKEDIN_REDIRECT_URI ||
  `${window.location.origin}/auth/linkedin/callback`;
const LINKEDIN_SCOPE =
  "openid profile w_member_social email r_organization_admin rw_organization_admin r_organization_social w_organization_social r_basicprofile";

const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID;
const INSTAGRAM_REDIRECT_URI =
  import.meta.env.VITE_INSTAGRAM_REDIRECT_URI ||
  `${window.location.origin}/auth/instagram/callback`;

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
        permissions_granted: [
          "openid",
          "profile",
          "w_member_social",
          "email",
          "r_organization_admin",
          "w_organization_social",
          "r_basicprofile",
          "rw_organization_admin",
          "r_organization_social",
        ],
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

export const fetchLinkedInPages = createAsyncThunk(
  "socialNetworks/fetchLinkedInPages",
  async ({ isConnected }: { isConnected: boolean }, { rejectWithValue }) => {
    try {
      if (!isConnected) {
        return rejectWithValue("User not connected to LinkedIn");
      }

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return rejectWithValue("User not authenticated");

      const { data, error } = await supabase
        .from("userData")
        .select("linkedln_data")
        .eq("uid", authData.user.id)
        .single();

      if (error) throw new Error(error.message);
      if (!data || !data.linkedln_data) {
        return rejectWithValue("LinkedIn data not found");
      }

      const { data: pagesData, error: pagesError } =
        await supabase.functions.invoke("linkedin-fetch-admin-pages", {
          body: { access_token: data.linkedln_data.access_token },
        });

      if (pagesError) {
        throw new Error(pagesError.message);
      }

      const updatedLinkedInData = {
        ...data.linkedln_data,
        admin_pages: pagesData.pages,
        pages_fetched_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("userData")
        .update({
          linkedln_data: updatedLinkedInData,
        })
        .eq("uid", authData.user.id);

      if (updateError) throw new Error(updateError.message);

      return {
        adminPages: pagesData.pages,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching LinkedIn admin pages:", error);
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch LinkedIn admin pages"
      );
    }
  }
);

export const initiateInstagramAuth = createAsyncThunk(
  "socialNetworks/initiateInstagramAuth",
  async (_, { rejectWithValue }) => {
    try {
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("instagram_auth_state", state);

      const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
        INSTAGRAM_REDIRECT_URI
      )}&state=${state}&response_type=code&scope=instagram_business_basic,instagram_content_publish,pages_show_list,business_management`;

      window.location.href = authUrl;
      return true;
    } catch (error) {
      console.error("Error initiating Instagram auth:", error);
      return rejectWithValue("Failed to initiate Instagram authorization");
    }
  }
);

export const processInstagramCallback = createAsyncThunk(
  "socialNetworks/processInstagramCallback",
  async (
    { code, state }: { code: string; state: string },
    { rejectWithValue }
  ) => {
    try {
      // Verify state parameter
      const savedState = localStorage.getItem("instagram_auth_state");
      if (state !== savedState) {
        return rejectWithValue("State mismatch. Possible CSRF attack.");
      }

      // Clean up state
      localStorage.removeItem("instagram_auth_state");

      // Exchange code for access token via Edge Function
      const { data, error } = await supabase.functions.invoke(
        "instagram-exchange-code",
        {
          body: { code, redirect_uri: INSTAGRAM_REDIRECT_URI },
        }
      );

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Error calling edge function");
      }

      if (!data) {
        throw new Error("No data received from edge function");
      }

      const { access_token, expires_in = 3600 } = data;

      if (!access_token) {
        throw new Error("No access token received");
      }

      // Verify token and get user information using the verify token function
      const { data: verifyData, error: verifyError } =
        await supabase.functions.invoke("instagram-verify-token", {
          body: { access_token },
        });

      if (verifyError || !verifyData || !verifyData.isValid) {
        throw new Error("Failed to verify token or get user information");
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        return rejectWithValue("User not authenticated");
      }

      // Extract user information from verify response
      const { tokenData, userData: instagramUserData } = verifyData;

      // Create Instagram data object with complete information
      const instagram_data = {
        instagram_user_id: instagramUserData.id,
        access_token,
        token_expires_at: tokenData.expires_at
          ? new Date(tokenData.expires_at * 1000).toISOString()
          : new Date(Date.now() + expires_in * 1000).toISOString(),
        data_access_expires_at: new Date(
          tokenData.data_access_expires_at * 1000
        ).toISOString(),
        is_connected: true,
        username: instagramUserData.name,
        user_id: instagramUserData.id,
        app_id: tokenData.app_id,
        connected_at: new Date().toISOString(),
        permissions_granted: tokenData.scopes,
        granular_scopes: tokenData.granular_scopes,
        token_type: tokenData.type,
        application: tokenData.application,
        issued_at: new Date(tokenData.issued_at * 1000).toISOString(),
      };

      // Update user data
      const { error: updateError } = await supabase
        .from("userData")
        .update({
          instagram_data,
        })
        .eq("uid", userId);

      if (updateError) {
        console.error("Error updating user data:", updateError);
        throw new Error(updateError.message || "Failed to update user data");
      }

      return {
        isConnected: true,
        userId: instagramUserData.id,
        username: instagramUserData.name,
        expiresAt: new Date(tokenData.expires_at * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error processing Instagram callback:", error);
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to process Instagram authorization"
      );
    }
  }
);

export const disconnectInstagram = createAsyncThunk(
  "socialNetworks/disconnectInstagram",
  async (_, { rejectWithValue }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        return rejectWithValue("User not authenticated");
      }

      // Get current Instagram data
      const { data: user, error: fetchError } = await supabase
        .from("userData")
        .select("instagram_data")
        .eq("uid", userId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      // Update is_connected to false
      const updatedInstagramData = user.instagram_data
        ? { ...user.instagram_data, is_connected: false }
        : null;

      // Update database
      const { error } = await supabase
        .from("userData")
        .update({
          instagram_data: updatedInstagramData,
        })
        .eq("uid", userId);

      if (error) throw new Error(error.message);

      return true;
    } catch (error) {
      console.error("Error disconnecting Instagram:", error);
      return rejectWithValue("Failed to disconnect Instagram");
    }
  }
);

export const checkInstagramConnection = createAsyncThunk(
  "socialNetworks/checkInstagramConnection",
  async (_, { rejectWithValue }) => {
    try {
      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return { isConnected: false };

      const { data, error } = await supabase
        .from("userData")
        .select("instagram_data")
        .eq("uid", authData.user.id)
        .single();

      if (error) throw new Error(error.message);

      // Check if user has Instagram data
      if (!data || !data.instagram_data || !data.instagram_data.is_connected) {
        return { isConnected: false };
      }

      // Check if token is expired
      const tokenExpired =
        new Date(data.instagram_data.token_expires_at) < new Date();

      if (tokenExpired) {
        return { isConnected: false };
      }

      // Verify token with Instagram API through Edge Function
      try {
        const { data: verifyData, error: verifyError } =
          await supabase.functions.invoke("instagram-verify-token", {
            body: { access_token: data.instagram_data.access_token },
          });

        if (verifyError) {
          console.error("Error calling verify token function:", verifyError);
          return {
            isConnected: true,
            userId: data.instagram_data.instagram_user_id,
            username: data.instagram_data.username,
            expiresAt: data.instagram_data.token_expires_at,
            warning: "Connection could not be verified due to server issues",
          };
        }

        if (!verifyData.isValid) {
          // Token not valid, update database
          await supabase
            .from("userData")
            .update({
              instagram_data: {
                ...data.instagram_data,
                is_connected: false,
              },
            })
            .eq("uid", authData.user.id);

          return { isConnected: false };
        }

        return {
          isConnected: true,
          userId: data.instagram_data.instagram_user_id,
          username: data.instagram_data.username,
          expiresAt: data.instagram_data.token_expires_at,
        };
      } catch (apiError) {
        console.error("Error verifying Instagram token:", apiError);

        return {
          isConnected: true,
          userId: data.instagram_data.instagram_user_id,
          username: data.instagram_data.username,
          expiresAt: data.instagram_data.token_expires_at,
          warning: "Connection could not be verified due to network issues",
        };
      }
    } catch (error) {
      console.error("Error checking Instagram connection:", error);
      return rejectWithValue("Failed to check Instagram connection status");
    }
  }
);

export const fetchInstagramPages = createAsyncThunk(
  "socialNetworks/fetchInstagramPages",
  async ({ isConnected }: { isConnected: boolean }, { rejectWithValue }) => {
    try {
      if (!isConnected) {
        return rejectWithValue("User not connected to Instagram");
      }

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return rejectWithValue("User not authenticated");

      const { data, error } = await supabase
        .from("userData")
        .select("instagram_data")
        .eq("uid", authData.user.id)
        .single();

      if (error) throw new Error(error.message);
      if (!data || !data.instagram_data) {
        return rejectWithValue("Instagram data not found");
      }

      const { data: pagesData, error: pagesError } =
        await supabase.functions.invoke("instagram-fetch-admin-pages", {
          body: { access_token: data.instagram_data.access_token },
        });

      if (pagesError) {
        throw new Error(pagesError.message);
      }

      const updatedInstagramData = {
        ...data.instagram_data,
        business_pages: pagesData.pages,
        pages_fetched_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("userData")
        .update({
          instagram_data: updatedInstagramData,
        })
        .eq("uid", authData.user.id);

      if (updateError) throw new Error(updateError.message);

      return {
        businessPages: pagesData.pages,
        totalPages: pagesData.total_pages,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching Instagram business pages:", error);
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch Instagram business pages"
      );
    }
  }
);
