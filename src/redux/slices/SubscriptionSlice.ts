import { createSlice } from "@reduxjs/toolkit";
import { fetchSubscription, cancelSubscription } from "../actions/SubscriptionActions";
import { SubscriptionDataProps, IRequest, SupabaseError } from "../../types";

interface SubscriptionState {
  subscription: SubscriptionDataProps | null;
  fetchSubscriptionRequest: IRequest;
  cancelSubscriptionRequest: IRequest;
}

const initialState: SubscriptionState = {
  subscription: null,
  fetchSubscriptionRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  cancelSubscriptionRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
};

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {
    clearSubscriptionErrors: (state) => {
      state.fetchSubscriptionRequest = initialState.fetchSubscriptionRequest;
      state.cancelSubscriptionRequest = initialState.cancelSubscriptionRequest;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.fetchSubscriptionRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.subscription = action.payload;
        state.fetchSubscriptionRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.fetchSubscriptionRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });

    builder
      .addCase(cancelSubscription.pending, (state) => {
        state.cancelSubscriptionRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(cancelSubscription.fulfilled, (state) => {
        state.cancelSubscriptionRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.cancelSubscriptionRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
  },
});

export const { clearSubscriptionErrors } = subscriptionSlice.actions;

export default subscriptionSlice.reducer;
