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

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/get-subscription", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || "Error getting subscription");
      return data as import("../../types").SubscriptionDataProps | null;
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
    payload: { plan_type: SubscriptionPlanType; billing_period: BillingPeriod; myweb: boolean },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as RootState;
      const userData = state.auth.user;

      if (!userData) {
        return rejectWithValue("No user data available");
      }

      const { plan_type, billing_period, myweb } = payload;
      const uid = userData.uid;

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          uid,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone || "",
          plan_type,
          billing_period,
          myweb,
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

export const updateMyWeb = createAsyncThunk(
  "subscription/updateMyWeb",
  async (payload: { stripe_subscription_id: string; enabled: boolean }, { rejectWithValue }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/update-myweb", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || "No se ha podido cambiar myWeb");
      return data as { success: boolean; pending_payment?: boolean; payment_url?: string | null; removal_at?: string };
    } catch {
      return rejectWithValue("No se ha podido cambiar myWeb. Actualiza la suscripción antes de volver a intentarlo.");
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
