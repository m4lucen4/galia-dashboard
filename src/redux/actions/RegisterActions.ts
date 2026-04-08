import { createAsyncThunk } from "@reduxjs/toolkit";
import { RegisterFormData, SupabaseError } from "../../types";
import { supabase } from "../../helpers/supabase";

export const registerUser = createAsyncThunk(
  "register/registerUser",
  async (formData: RegisterFormData, { rejectWithValue }) => {
    try {
      // 1. Check if a user with this email already exists (inactive, payment pending)
      const { data: existingUser } = await supabase
        .from("userData")
        .select("uid, active")
        .eq("email", formData.email)
        .maybeSingle();

      let uid: string;

      if (existingUser && !existingUser.active) {
        // User already registered but never paid — reuse the existing uid
        uid = existingUser.uid;
      } else if (existingUser && existingUser.active) {
        return rejectWithValue("email_already_exists");
      } else {
        // 2. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) {
          return rejectWithValue(authError.message);
        }

        if (!authData.user) {
          return rejectWithValue("Could not create user account");
        }

        uid = authData.user.id;

        // 3. Insert user record in userData table with active: false
        const role = formData.plan_type === "student" ? "student" : "customer";

        const { error: dbError } = await supabase.from("userData").insert({
          uid,
          active: false,
          avatar_url: "",
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          company: "",
          vat: "",
          description: "",
          role,
          has_web: false,
        });

        if (dbError) {
          return rejectWithValue(`Error creating user profile: ${dbError.message}`);
        }
      }

      // 4. Upload student card if applicable
      let studentCardUrl: string | null = null;

      if (formData.plan_type === "student" && formData.student_card) {
        const file = formData.student_card;
        const ext = file.name.split(".").pop();
        const filePath = `${uid}/card.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("student-cards")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          return rejectWithValue(`Error uploading student card: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("student-cards")
          .getPublicUrl(filePath);

        studentCardUrl = urlData.publicUrl;
      }

      // 5. Create Stripe Checkout Session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          plan_type: formData.plan_type,
          billing_period: formData.billing_period,
          student_card_url: studentCardUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Error creating payment session");
      }

      const { url } = await response.json();

      // 6. Redirect to Stripe Checkout
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
