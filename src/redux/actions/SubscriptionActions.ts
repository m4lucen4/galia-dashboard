import { createAsyncThunk } from "@reduxjs/toolkit";
import { SupabaseError } from "../../types";
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
