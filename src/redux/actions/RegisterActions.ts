import { createAsyncThunk } from "@reduxjs/toolkit";
import { RegisterFormData, SupabaseError } from "../../types";

// Register-after-payment: the browser no longer creates the account. The API stores
// a pending registration (password kept only as a bcrypt hash) and returns the Stripe
// Checkout URL; the account is created by the Stripe webhook once the payment succeeds.
export const registerUser = createAsyncThunk(
  "register/registerUser",
  async (formData: RegisterFormData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          password: formData.password,
          plan_type: formData.plan_type,
          billing_period: formData.billing_period,
          myweb: formData.myweb,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(errorData.error || "Error creating payment session");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;

      return { success: true };
    } catch (error: unknown) {
      const appError: SupabaseError = {
        message: error instanceof Error ? error.message : "Registration error",
        status: 500,
      };
      return rejectWithValue(appError);
    }
  },
);
