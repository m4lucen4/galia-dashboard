import { createSlice } from "@reduxjs/toolkit";
import { checkAuthState, login, logout } from "../actions/AuthActions";
import {
  archiveWikiArticle, createWikiArticle, createWikiSection, createWikiSubsection,
  deleteWikiSection, deleteWikiSubsection, fetchWikiAdminStructure, fetchWikiHistory,
  fetchWikiMedia, finalizeWikiMediaDeletion, markWikiMediaReady, moveWikiArticle,
  publishWikiArticle, reorderWiki, restoreArchivedWikiArticle, restoreWikiRevision,
  reserveWikiMediaDeletion, saveWikiDraft, unpublishWikiArticle, updateWikiSection,
  updateWikiSubsection, type WikiAdminSection, type WikiMedia, type WikiRevision,
} from "../actions/WikiAdminActions";
import type { IRequest } from "@/types";

const idle: IRequest = { inProgress: false, messages: "", ok: false };
type State = {
  structure: WikiAdminSection[]; history: WikiRevision[]; historyArticleId: string | null;
  selectedArticleId: string | null; structureRequest: IRequest; structureActionRequest: IRequest;
  editorRequest: IRequest; media: WikiMedia[]; mediaRequest: IRequest;
  structureRequestId: string | null; historyRequestId: string | null; mediaRequestId: string | null;
};
const initialState: State = {
  structure: [], history: [], historyArticleId: null, selectedArticleId: null,
  structureRequest: idle, structureActionRequest: idle, editorRequest: idle, media: [], mediaRequest: idle,
  structureRequestId: null, historyRequestId: null, mediaRequestId: null,
};
const message = (action: { payload?: unknown }) => (
  (action.payload as { message?: string } | undefined)?.message ?? "Ha ocurrido un error."
);
const structureActions = [createWikiSection, updateWikiSection, deleteWikiSection, createWikiSubsection, updateWikiSubsection, deleteWikiSubsection, createWikiArticle, moveWikiArticle, reorderWiki, archiveWikiArticle, restoreArchivedWikiArticle];
const editorActions = [saveWikiDraft, publishWikiArticle, unpublishWikiArticle, restoreWikiRevision];

const slice = createSlice({
  name: "wikiAdmin", initialState,
  reducers: {
    selectWikiAdminArticle: (state, action: { payload: string | null }) => {
      state.selectedArticleId = action.payload;
      state.history = [];
      state.historyArticleId = null;
      state.historyRequestId = null;
    },
    resetWikiAdmin: () => initialState,
  },
  extraReducers: (builder) => builder
    .addCase(fetchWikiAdminStructure.pending, (state, action) => {
      state.structureRequestId = action.meta.requestId;
      state.structureRequest = { inProgress: true, messages: "", ok: false };
    })
    .addCase(fetchWikiAdminStructure.fulfilled, (state, action) => {
      if (state.structureRequestId !== action.meta.requestId) return;
      state.structure = action.payload;
      state.structureRequest = { inProgress: false, messages: "", ok: true };
    })
    .addCase(fetchWikiAdminStructure.rejected, (state, action) => {
      if (state.structureRequestId !== action.meta.requestId) return;
      state.structureRequest = { inProgress: false, messages: message(action), ok: false };
    })
    .addCase(fetchWikiHistory.pending, (state, action) => {
      state.history = [];
      state.historyArticleId = action.meta.arg;
      state.historyRequestId = action.meta.requestId;
    })
    .addCase(fetchWikiHistory.fulfilled, (state, action) => {
      if (state.historyRequestId !== action.meta.requestId || state.selectedArticleId !== action.meta.arg) return;
      state.history = action.payload;
    })
    .addCase(fetchWikiHistory.rejected, (state, action) => {
      if (state.historyRequestId !== action.meta.requestId || state.selectedArticleId !== action.meta.arg) return;
      state.history = [];
      state.editorRequest = { inProgress: false, messages: message(action), ok: false };
    })
    .addCase(fetchWikiMedia.pending, (state, action) => { state.mediaRequestId = action.meta.requestId; state.mediaRequest = { inProgress: true, messages: "", ok: false }; })
    .addCase(fetchWikiMedia.fulfilled, (state, action) => { if (state.mediaRequestId === action.meta.requestId) { state.media = action.payload; state.mediaRequest = { inProgress: false, messages: "", ok: true }; } })
    .addCase(fetchWikiMedia.rejected, (state, action) => { if (state.mediaRequestId === action.meta.requestId) state.mediaRequest = { inProgress: false, messages: message(action), ok: false }; })
    .addMatcher((action) => [login.pending, checkAuthState.pending, logout.pending].some((thunk) => thunk.match(action)), () => initialState)
    .addMatcher((action) => editorActions.some((thunk) => thunk.pending.match(action)), (state) => { state.editorRequest = { inProgress: true, messages: "", ok: false }; })
    .addMatcher((action) => editorActions.some((thunk) => thunk.fulfilled.match(action)), (state) => { state.editorRequest = { inProgress: false, messages: "Operación completada", ok: true }; })
    .addMatcher((action) => editorActions.some((thunk) => thunk.rejected.match(action)), (state, action) => { state.editorRequest = { inProgress: false, messages: message(action as { payload?: unknown }), ok: false }; })
    .addMatcher((action) => structureActions.some((thunk) => thunk.pending.match(action)), (state) => { state.structureActionRequest = { inProgress: true, messages: "", ok: false }; })
    .addMatcher((action) => structureActions.some((thunk) => thunk.fulfilled.match(action)), (state) => { state.structureActionRequest = { inProgress: false, messages: "Estructura actualizada", ok: true }; })
    .addMatcher((action) => structureActions.some((thunk) => thunk.rejected.match(action)), (state, action) => { state.structureActionRequest = { inProgress: false, messages: message(action as { payload?: unknown }), ok: false }; })
    .addMatcher((action) => [markWikiMediaReady, reserveWikiMediaDeletion, finalizeWikiMediaDeletion].some((thunk) => thunk.pending.match(action)), (state) => { state.mediaRequest = { inProgress: true, messages: "", ok: false }; })
    .addMatcher((action) => [markWikiMediaReady, reserveWikiMediaDeletion, finalizeWikiMediaDeletion].some((thunk) => thunk.rejected.match(action)), (state, action) => { state.mediaRequest = { inProgress: false, messages: message(action as { payload?: unknown }), ok: false }; })
    .addMatcher((action) => [markWikiMediaReady, reserveWikiMediaDeletion, finalizeWikiMediaDeletion].some((thunk) => thunk.fulfilled.match(action)), (state) => { state.mediaRequest = { inProgress: false, messages: "Biblioteca actualizada", ok: true }; }),
});
export const { selectWikiAdminArticle, resetWikiAdmin } = slice.actions;
export default slice.reducer;
