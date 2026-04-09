import { createAsyncThunk } from "@reduxjs/toolkit";
import { SubscriptionPlanType, BillingPeriod, SupabaseError } from "../../types";
import { supabase } from "../../helpers/supabase";
import { RootState } from "../store";

export const fetchSubscription = createAsyncThunk(
  "subscription/fetchSubscription",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const uid = state.auth.user?.uid;

      if (!uid) {
        return rejectWithValue("No authenticated user");
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return rejectWithValue({
          message: `Error getting subscription: ${error.message}`,
          status: error.code,
        });
      }

      return data;
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error retrieving subscription",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  },
);

export const startSubscription = createAsyncThunk(
  "subscription/startSubscription",
  async (
    payload: { plan_type: SubscriptionPlanType; billing_period: BillingPeriod; student_card?: File },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as RootState;
      const userData = state.user.userData;

      if (!userData) {
        return rejectWithValue("No user data available");
      }

      const { plan_type, billing_period, student_card } = payload;
      const uid = userData.uid;

      // Upload student card if applicable
      let studentCardUrl: string | null = null;
      if (plan_type === "student" && student_card) {
        const ext = student_card.name.split(".").pop();
        const filePath = `${uid}/card.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("student-cards")
          .upload(filePath, student_card, { upsert: true });

        if (uploadError) {
          return rejectWithValue(`Error uploading student card: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("student-cards")
          .getPublicUrl(filePath);

        studentCardUrl = urlData.publicUrl;
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone ?? "",
          plan_type,
          billing_period,
          student_card_url: studentCardUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Error creating payment session");
      }

      const { url } = await response.json();
      window.location.href = url;

      return { success: true };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message: error instanceof Error ? error.message : "Error starting subscription",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  },
);

export const reactivateSubscription = createAsyncThunk(
  "subscription/reactivateSubscription",
  async (stripeSubscriptionId: string, { rejectWithValue }) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch("/api/reactivate-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stripe_subscription_id: stripeSubscriptionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Error reactivating subscription");
      }

      return await response.json();
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message: error instanceof Error ? error.message : "Error reactivating subscription",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  },
);

export const cancelSubscription = createAsyncThunk(
  "subscription/cancelSubscription",
  async (stripeSubscriptionId: string, { rejectWithValue }) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stripe_subscription_id: stripeSubscriptionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Error cancelling subscription");
      }

      return await response.json();
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message:
          error instanceof Error ? error.message : "Error cancelling subscription",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  },
);
