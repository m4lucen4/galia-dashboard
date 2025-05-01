import { createSlice } from "@reduxjs/toolkit";
import {
  checkLinkedInConnection,
  processLinkedInCallback,
  disconnectLinkedIn,
} from "../actions/SocialNetworksActions";

import { IRequest, LinkedInData } from "../../types";

interface SocialNetworksState {
  linkedin: LinkedInData;
  checkLinkedInRequest: IRequest;
  processLinkedInCallbackRequest: IRequest;
  disconnectLinkedInRequest: IRequest;
}

const initialState: SocialNetworksState = {
  linkedin: {
    isConnected: false,
    personId: undefined,
    userName: undefined,
    expiresAt: undefined,
    warning: undefined,
  },
  checkLinkedInRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  processLinkedInCallbackRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
  disconnectLinkedInRequest: {
    inProgress: false,
    messages: "",
    ok: false,
  },
};

const socialNetworksSlice = createSlice({
  name: "socialNetworks",
  initialState,
  reducers: {
    clearLinkedInWarning: (state) => {
      state.linkedin.warning = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkLinkedInConnection.pending, (state) => {
        state.checkLinkedInRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(checkLinkedInConnection.fulfilled, (state, action) => {
        if (action.payload) {
          state.linkedin = {
            isConnected: action.payload.isConnected,
            personId: action.payload.personId,
            userName: action.payload.userName,
            expiresAt: action.payload.expiresAt,
            warning: action.payload.warning,
          };
        }
        state.checkLinkedInRequest = {
          inProgress: false,
          messages: action.payload?.warning || "",
          ok: true,
        };
      })
      .addCase(checkLinkedInConnection.rejected, (state, action) => {
        state.checkLinkedInRequest = {
          inProgress: false,
          messages: action.payload as string,
          ok: false,
        };
      });
    builder
      .addCase(processLinkedInCallback.pending, (state) => {
        state.processLinkedInCallbackRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(processLinkedInCallback.fulfilled, (state, action) => {
        if (action.payload) {
          state.linkedin = {
            isConnected: action.payload.isConnected,
            personId: action.payload.personId,
            userName: action.payload.userName,
            expiresAt: action.payload.expiresAt,
            warning: undefined,
          };
        }
        state.processLinkedInCallbackRequest = {
          inProgress: false,
          messages: "LinkedIn connected successfully",
          ok: true,
        };
      })
      .addCase(processLinkedInCallback.rejected, (state, action) => {
        state.processLinkedInCallbackRequest = {
          inProgress: false,
          messages: action.payload as string,
          ok: false,
        };
      });
    builder
      .addCase(disconnectLinkedIn.pending, (state) => {
        state.disconnectLinkedInRequest = {
          inProgress: true,
          messages: "",
          ok: false,
        };
      })
      .addCase(disconnectLinkedIn.fulfilled, (state) => {
        state.linkedin = {
          isConnected: false,
          personId: undefined,
          userName: undefined,
          expiresAt: undefined,
          warning: undefined,
        };
        state.disconnectLinkedInRequest = {
          inProgress: false,
          messages: "LinkedIn disconnected successfully",
          ok: true,
        };
      })
      .addCase(disconnectLinkedIn.rejected, (state, action) => {
        state.disconnectLinkedInRequest = {
          inProgress: false,
          messages: action.payload as string,
          ok: false,
        };
      });
  },
});

export const { clearLinkedInWarning } = socialNetworksSlice.actions;
export default socialNetworksSlice.reducer;
