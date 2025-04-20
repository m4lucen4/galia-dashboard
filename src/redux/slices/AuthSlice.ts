import { createSlice } from "@reduxjs/toolkit";
import {
  checkAuthState,
  login,
  logout,
  resetPassword,
  changePassword,
} from "../actions/AuthActions";

import { UserProps, IRequest } from "../../types";

interface AuthState {
  authenticated: boolean;
  token: string | null;
  user: UserProps | null;
  loginRequest: IRequest;
  checkAuthRequest: IRequest;
  logoutRequest: IRequest;
  resetPasswordRequest: IRequest;
  changePasswordRequest: IRequest;
}

const initialState: AuthState = {
  authenticated: false,
  token: null,
  user: null,
  loginRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  checkAuthRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  logoutRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  resetPasswordRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  changePasswordRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearLoginErrors: (state) => {
      state.loginRequest = initialState.loginRequest;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loginRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(login.fulfilled, (state, action) => {
        if (action.payload.user) {
          state.user = {
            uid: action.payload.user.id,
            name: action.payload.user.user_metadata?.name || "",
            email: action.payload.user.email || "",
            created_at: action.payload.user.created_at || "",
            last_sign_in_at: action.payload.user.last_sign_in_at || "",
          };
        }
        state.token = action.payload.session?.access_token;
        state.authenticated = true;
        state.loginRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(login.rejected, (state, action) => {
        state.loginRequest = {
          inProgress: false,
          messages: action.payload as string,
          ok: false,
        };
      });
    builder
      .addCase(checkAuthState.pending, (state) => {
        state.checkAuthRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(checkAuthState.fulfilled, (state, action) => {
        if (action.payload?.user) {
          state.user = {
            uid: action.payload.user.id,
            name: action.payload.user.user_metadata?.name || "",
            email: action.payload.user.email || "",
            created_at: action.payload.user.created_at || "",
            last_sign_in_at: action.payload.user.last_sign_in_at || "",
          };
          state.token = action.payload.session?.access_token;
          state.authenticated = true;
        }
        state.checkAuthRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(checkAuthState.rejected, (state, action) => {
        state.authenticated = false;
        state.user = null;
        state.token = null;
        state.checkAuthRequest = {
          inProgress: false,
          messages: action.payload as string,
          ok: false,
        };
      });
    builder
      .addCase(logout.pending, (state) => {
        state.logoutRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(logout.fulfilled, (state) => {
        state.authenticated = false;
        state.user = null;
        state.token = null;
        state.logoutRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(logout.rejected, (state, action) => {
        state.logoutRequest = {
          inProgress: false,
          messages: action.payload as string,
          ok: false,
        };
      });
    builder
      .addCase(resetPassword.pending, (state) => {
        state.resetPasswordRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.resetPasswordRequest = {
          inProgress: false,
          messages: "Recovery email sent correctly",
          ok: true,
        };
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.resetPasswordRequest = {
          inProgress: false,
          messages: action.payload as string,
          ok: false,
        };
      });
    builder
      .addCase(changePassword.pending, (state) => {
        state.changePasswordRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.changePasswordRequest = {
          inProgress: false,
          messages: "Password changed correctly",
          ok: true,
        };
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.changePasswordRequest = {
          inProgress: false,
          messages: action.payload as string,
          ok: false,
        };
      });
  },
});

export const { clearLoginErrors } = authSlice.actions;

export default authSlice.reducer;
