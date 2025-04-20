import { createSlice } from "@reduxjs/toolkit";
import {
  fetchUsers,
  fetchUserByUid,
  addUser,
  updateUser,
} from "../actions/UserActions";

import { UserDataProps, IRequest, SupabaseError } from "../../types";

interface UserState {
  userData: UserDataProps | null;
  users: UserDataProps[];
  userAddRequest: IRequest;
  userUpdateRequest: IRequest;
  userFetchRequest: IRequest;
  userFetchByUidRequest: IRequest;
}

const initialState: UserState = {
  userData: null,
  userAddRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  userUpdateRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  userFetchRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  userFetchByUidRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  users: [],
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.userAddRequest = initialState.userAddRequest;
      state.userFetchRequest = initialState.userFetchRequest;
      state.userFetchByUidRequest = initialState.userFetchByUidRequest;
      state.userUpdateRequest = initialState.userUpdateRequest;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addUser.pending, (state) => {
        state.userAddRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(addUser.fulfilled, (state, action) => {
        state.userData = action.payload.user;
        state.userAddRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(addUser.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.userAddRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.userFetchRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload.users;
        state.userFetchRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.userFetchRequest = {
          inProgress: false,
          messages: action.payload as string,
          ok: false,
        };
      });
    builder
      .addCase(fetchUserByUid.pending, (state) => {
        state.userFetchByUidRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(fetchUserByUid.fulfilled, (state, action) => {
        state.userData = action.payload.user;
        state.userFetchByUidRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(fetchUserByUid.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.userFetchByUidRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
    builder
      .addCase(updateUser.pending, (state) => {
        state.userUpdateRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.users = action.payload.user;
        state.userUpdateRequest = {
          inProgress: false,
          messages: "",
          ok: true,
        };
      })
      .addCase(updateUser.rejected, (state, action) => {
        const errorPayload = action.payload as SupabaseError | string;
        const errorMessage =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.message || "Error desconocido";

        state.userUpdateRequest = {
          inProgress: false,
          messages: errorMessage,
          ok: false,
        };
      });
  },
});

export const { clearErrors } = userSlice.actions;

export default userSlice.reducer;
