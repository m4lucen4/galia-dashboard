import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import i18n from "../../i18n";
import {
  checkLinkedInConnection,
  processLinkedInCallback,
  disconnectLinkedIn,
  fetchLinkedInPages,
  checkInstagramConnection,
  disconnectInstagram,
  processInstagramCallback,
  fetchInstagramPages,
  isConnectionActive,
  toInstagramPages,
  toLinkedInPages,
} from "../actions/SocialNetworksActions";

import {
  InstagramData,
  IRequest,
  LinkedInData,
  LinkedInPage,
  SocialConnection,
} from "../../types";

interface SocialNetworksState {
  linkedin: LinkedInData;
  checkLinkedInRequest: IRequest;
  processLinkedInCallbackRequest: IRequest;
  disconnectLinkedInRequest: IRequest;
  fetchLinkedInPagesRequest: IRequest;
  selectedPublishTarget?: LinkedInPage;
  instagram: InstagramData;
  checkInstagramRequest: IRequest;
  processInstagramCallbackRequest: IRequest;
  disconnectInstagramInRequest: IRequest;
  fetchInstagramPagesRequest: IRequest;
}

const idleRequest = (): IRequest => ({
  inProgress: false,
  messages: "",
  ok: false,
});

const pendingRequest = (): IRequest => ({
  inProgress: true,
  messages: "",
  ok: false,
});

const failedRequest = (payload: unknown): IRequest => ({
  inProgress: false,
  messages:
    typeof payload === "string"
      ? payload
      : i18n.t("socialConnections.errors.unknown"),
  ok: false,
});

const doneRequest = (messages = ""): IRequest => ({
  inProgress: false,
  messages,
  ok: true,
});

const disconnectedLinkedIn = (): LinkedInData => ({
  isConnected: false,
  status: "disconnected",
});

const disconnectedInstagram = (): InstagramData => ({
  isConnected: false,
  status: "disconnected",
});

// Health fields come from the connection even when it is not usable (expired/revoked/error),
// so the UI can explain why and offer to reconnect.
const linkedInFromConnection = (
  connection: SocialConnection | null
): LinkedInData => {
  if (!connection || connection.status === "disconnected") {
    return disconnectedLinkedIn();
  }
  return {
    isConnected: isConnectionActive(connection),
    status: connection.status,
    statusReason: connection.statusReason,
    personId: connection.accountId ?? undefined,
    userName: connection.accountName ?? undefined,
    expiresAt: connection.expiresAt ?? undefined,
    adminPages: toLinkedInPages(connection),
  };
};

const instagramFromConnection = (
  connection: SocialConnection | null
): InstagramData => {
  if (!connection || connection.status === "disconnected") {
    return disconnectedInstagram();
  }
  return {
    isConnected: isConnectionActive(connection),
    status: connection.status,
    statusReason: connection.statusReason,
    userId: connection.accountId ?? undefined,
    userName: connection.accountName ?? undefined,
    expiresAt: connection.expiresAt ?? undefined,
    businessPages: toInstagramPages(connection),
  };
};

const initialState: SocialNetworksState = {
  linkedin: { isConnected: false },
  checkLinkedInRequest: idleRequest(),
  processLinkedInCallbackRequest: idleRequest(),
  disconnectLinkedInRequest: idleRequest(),
  fetchLinkedInPagesRequest: idleRequest(),
  selectedPublishTarget: undefined,
  instagram: { isConnected: false },
  checkInstagramRequest: idleRequest(),
  processInstagramCallbackRequest: idleRequest(),
  disconnectInstagramInRequest: idleRequest(),
  fetchInstagramPagesRequest: idleRequest(),
};

const socialNetworksSlice = createSlice({
  name: "socialNetworks",
  initialState,
  reducers: {
    setSelectedPublishTarget: (state, action: PayloadAction<LinkedInPage>) => {
      state.selectedPublishTarget = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkLinkedInConnection.pending, (state) => {
        state.checkLinkedInRequest = pendingRequest();
      })
      .addCase(checkLinkedInConnection.fulfilled, (state, action) => {
        const pagesFetchedAt = state.linkedin.pagesFetchedAt;
        state.linkedin = {
          ...linkedInFromConnection(action.payload),
          pagesFetchedAt,
        };
        state.checkLinkedInRequest = doneRequest();
      })
      .addCase(checkLinkedInConnection.rejected, (state, action) => {
        state.checkLinkedInRequest = failedRequest(action.payload);
      });
    builder
      .addCase(processLinkedInCallback.pending, (state) => {
        state.processLinkedInCallbackRequest = pendingRequest();
      })
      .addCase(processLinkedInCallback.fulfilled, (state, action) => {
        state.linkedin = linkedInFromConnection(action.payload);
        state.processLinkedInCallbackRequest = doneRequest(
          i18n.t("socialConnections.messages.linkedinConnected")
        );
      })
      .addCase(processLinkedInCallback.rejected, (state, action) => {
        state.processLinkedInCallbackRequest = failedRequest(action.payload);
      });
    builder
      .addCase(disconnectLinkedIn.pending, (state) => {
        state.disconnectLinkedInRequest = pendingRequest();
      })
      .addCase(disconnectLinkedIn.fulfilled, (state) => {
        state.linkedin = disconnectedLinkedIn();
        state.disconnectLinkedInRequest = doneRequest(
          i18n.t("socialConnections.messages.linkedinDisconnected")
        );
      })
      .addCase(disconnectLinkedIn.rejected, (state, action) => {
        state.disconnectLinkedInRequest = failedRequest(action.payload);
      });
    builder
      .addCase(fetchLinkedInPages.pending, (state) => {
        state.fetchLinkedInPagesRequest = pendingRequest();
      })
      .addCase(fetchLinkedInPages.fulfilled, (state, action) => {
        const fetchedAt = new Date().toISOString();
        state.linkedin = {
          ...linkedInFromConnection(action.payload),
          pagesFetchedAt: fetchedAt,
        };

        const pages = state.linkedin.adminPages ?? [];
        if (!state.selectedPublishTarget && pages.length > 0) {
          state.selectedPublishTarget = pages.find(
            (page: LinkedInPage) => page.type === "PERSON"
          );
        }

        state.fetchLinkedInPagesRequest = doneRequest(
          i18n.t("socialConnections.messages.pagesRefreshed")
        );
      })
      .addCase(fetchLinkedInPages.rejected, (state, action) => {
        state.fetchLinkedInPagesRequest = failedRequest(action.payload);
      });
    builder
      .addCase(checkInstagramConnection.pending, (state) => {
        state.checkInstagramRequest = pendingRequest();
      })
      .addCase(checkInstagramConnection.fulfilled, (state, action) => {
        const pagesFetchedAt = state.instagram.pagesFetchedAt;
        state.instagram = {
          ...instagramFromConnection(action.payload),
          pagesFetchedAt,
        };
        state.checkInstagramRequest = doneRequest();
      })
      .addCase(checkInstagramConnection.rejected, (state, action) => {
        state.checkInstagramRequest = failedRequest(action.payload);
      });
    builder
      .addCase(disconnectInstagram.pending, (state) => {
        state.disconnectInstagramInRequest = pendingRequest();
      })
      .addCase(disconnectInstagram.fulfilled, (state) => {
        state.instagram = disconnectedInstagram();
        state.disconnectInstagramInRequest = doneRequest(
          i18n.t("socialConnections.messages.instagramDisconnected")
        );
      })
      .addCase(disconnectInstagram.rejected, (state, action) => {
        state.disconnectInstagramInRequest = failedRequest(action.payload);
      });
    builder
      .addCase(processInstagramCallback.pending, (state) => {
        state.processInstagramCallbackRequest = pendingRequest();
      })
      .addCase(processInstagramCallback.fulfilled, (state, action) => {
        state.instagram = instagramFromConnection(action.payload);
        state.processInstagramCallbackRequest = doneRequest(
          i18n.t("socialConnections.messages.instagramConnected")
        );
      })
      .addCase(processInstagramCallback.rejected, (state, action) => {
        state.processInstagramCallbackRequest = failedRequest(action.payload);
      });
    builder
      .addCase(fetchInstagramPages.pending, (state) => {
        state.fetchInstagramPagesRequest = pendingRequest();
      })
      .addCase(fetchInstagramPages.fulfilled, (state, action) => {
        state.instagram = {
          ...instagramFromConnection(action.payload),
          pagesFetchedAt: new Date().toISOString(),
        };
        state.fetchInstagramPagesRequest = doneRequest(
          i18n.t("socialConnections.messages.pagesRefreshed")
        );
      })
      .addCase(fetchInstagramPages.rejected, (state, action) => {
        state.fetchInstagramPagesRequest = failedRequest(action.payload);
      });
  },
});

export const { setSelectedPublishTarget } = socialNetworksSlice.actions;
export default socialNetworksSlice.reducer;
