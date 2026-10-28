import { createSlice } from "@reduxjs/toolkit";
import { checkAuthState, login, logout } from "../actions/AuthActions";
import { archiveWikiArticle, createWikiArticle, createWikiSection, createWikiSubsection, deleteWikiSection, deleteWikiSubsection, moveWikiArticle, publishWikiArticle, reorderWiki, restoreArchivedWikiArticle, unpublishWikiArticle, updateWikiSection, updateWikiSubsection } from "../actions/WikiAdminActions";
import { fetchArticlesNavigation, fetchArticlesSection, searchArticles } from "../actions/ArticlesActions";
import type { WikiRequest, WikiSearchResult, WikiSection, WikiSectionNavigation } from "@/features/documentation/types/wiki";

type ArticlesState = { navigation: WikiSectionNavigation[]; section: WikiSection | null; sectionId: string | null; results: WikiSearchResult[]; query: string; navigationRequest: WikiRequest; sectionRequest: WikiRequest; searchRequest: WikiRequest; navigationRequestId: string | null; sectionRequestId: string | null; searchRequestId: string | null };
const idle: WikiRequest = { inProgress: false, messages: "", ok: false };
const initialState: ArticlesState = { navigation: [], section: null, sectionId: null, results: [], query: "", navigationRequest: idle, sectionRequest: idle, searchRequest: idle, navigationRequestId: null, sectionRequestId: null, searchRequestId: null };
const message = (action: { payload?: unknown }) => (action.payload as { message?: string } | undefined)?.message ?? "No se han podido cargar los artículos.";
const clearPublicCache = (state: ArticlesState) => { state.navigation = []; state.section = null; state.sectionId = null; state.results = []; state.query = ""; state.navigationRequest = idle; state.sectionRequest = idle; state.searchRequest = idle; state.navigationRequestId = null; state.sectionRequestId = null; state.searchRequestId = null; };

const articlesSlice = createSlice({
  name: "articles", initialState,
  reducers: {
    clearArticlesSearch: (state) => { state.query = ""; state.results = []; state.searchRequest = idle; state.searchRequestId = null; },
    invalidateArticlesPublicCache: clearPublicCache,
  },
  extraReducers: (builder) => builder
    .addCase(fetchArticlesNavigation.pending, (state, action) => { state.navigationRequestId = action.meta.requestId; state.navigationRequest = { inProgress: true, messages: "", ok: false }; })
    .addCase(fetchArticlesNavigation.fulfilled, (state, action) => { if (state.navigationRequestId === action.meta.requestId) { state.navigation = action.payload; state.navigationRequest = { inProgress: false, messages: "", ok: true }; } })
    .addCase(fetchArticlesNavigation.rejected, (state, action) => { if (state.navigationRequestId === action.meta.requestId) state.navigationRequest = { inProgress: false, messages: message(action), ok: false }; })
    .addCase(fetchArticlesSection.pending, (state, action) => { state.sectionId = action.meta.arg; state.sectionRequestId = action.meta.requestId; state.section = null; state.sectionRequest = { inProgress: true, messages: "", ok: false }; })
    .addCase(fetchArticlesSection.fulfilled, (state, action) => { if (state.sectionRequestId === action.meta.requestId && state.sectionId === action.meta.arg) { state.section = action.payload; state.sectionRequest = { inProgress: false, messages: "", ok: true }; } })
    .addCase(fetchArticlesSection.rejected, (state, action) => { if (state.sectionRequestId === action.meta.requestId && state.sectionId === action.meta.arg) state.sectionRequest = { inProgress: false, messages: message(action), ok: false }; })
    .addCase(searchArticles.pending, (state, action) => { state.query = action.meta.arg; state.searchRequestId = action.meta.requestId; state.searchRequest = { inProgress: true, messages: "", ok: false }; })
    .addCase(searchArticles.fulfilled, (state, action) => { if (state.searchRequestId === action.meta.requestId && state.query === action.meta.arg) { state.results = action.payload; state.searchRequest = { inProgress: false, messages: "", ok: true }; } })
    .addCase(searchArticles.rejected, (state, action) => { if (state.searchRequestId === action.meta.requestId && state.query === action.meta.arg) state.searchRequest = { inProgress: false, messages: message(action), ok: false }; })
    .addMatcher((action) => [login.pending, checkAuthState.pending, logout.pending].some((thunk) => thunk.match(action)), () => initialState)
    .addMatcher((action) => [publishWikiArticle, unpublishWikiArticle, archiveWikiArticle, createWikiArticle, createWikiSection, createWikiSubsection, deleteWikiSection, deleteWikiSubsection, moveWikiArticle, reorderWiki, restoreArchivedWikiArticle, updateWikiSection, updateWikiSubsection].some((thunk) => thunk.fulfilled.match(action)), clearPublicCache),
});
export const { clearArticlesSearch, invalidateArticlesPublicCache } = articlesSlice.actions;
export default articlesSlice.reducer;
