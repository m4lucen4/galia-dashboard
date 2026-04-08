import { createSlice } from "@reduxjs/toolkit";
import { registerUser } from "../actions/RegisterActions";
import { IRequest } from "../../types";

interface RegisterState {
  registerRequest: IRequest;
}

const initialState: RegisterState = {
  registerRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
};

const registerSlice = createSlice({
  name: "register",
  initialState,
  reducers: {
    clearRegisterErrors: (state) => {
      state.registerRequest = initialState.registerRequest;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.registerRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.registerRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(registerUser.rejected, (state, action) => {
        const errorPayload = action.payload as string;
        state.registerRequest = {
          inProgress: false,
          messages: errorPayload || "Registration error",
          ok: false,
        };
      });
  },
});

export const { clearRegisterErrors } = registerSlice.actions;

export default registerSlice.reducer;
