import { createSlice } from "@reduxjs/toolkit";
import type {
  ArchivePhoto,
  ArchiveFilters,
  ArchiveAuthor,
} from "../actions/ArchiveActions";
import {
  fetchArchivePhotos,
  fetchArchiveTags,
  fetchArchiveAuthors,
} from "../actions/ArchiveActions";

interface ArchiveState {
  photos: ArchivePhoto[];
  hasMore: boolean;
  page: number;
  loading: boolean;
  error: string | null;
  allTags: string[];
  tagsLoading: boolean;
  allAuthors: ArchiveAuthor[];
  authorsLoading: boolean;
  filters: ArchiveFilters;
}

const initialFilters: ArchiveFilters = {
  tags: [],
  category: "",
  year: "",
  rating: "",
  authorId: "",
};

const initialState: ArchiveState = {
  photos: [],
  hasMore: true,
  page: 0,
  loading: false,
  error: null,
  allTags: [],
  tagsLoading: false,
  allAuthors: [],
  authorsLoading: false,
  filters: initialFilters,
};

const archiveSlice = createSlice({
  name: "archive",
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = action.payload;
      state.photos = [];
      state.page = 0;
      state.hasMore = true;
    },
    resetFilters(state) {
      state.filters = initialFilters;
      state.photos = [];
      state.page = 0;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchArchivePhotos
      .addCase(fetchArchivePhotos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchArchivePhotos.fulfilled, (state, action) => {
        state.loading = false;
        state.photos = action.payload.photos;
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(fetchArchivePhotos.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as { message: string })?.message ?? "Error";
      })
      // fetchArchiveTags
      .addCase(fetchArchiveTags.pending, (state) => {
        state.tagsLoading = true;
      })
      .addCase(fetchArchiveTags.fulfilled, (state, action) => {
        state.tagsLoading = false;
        state.allTags = action.payload;
      })
      .addCase(fetchArchiveTags.rejected, (state) => {
        state.tagsLoading = false;
      })
      // fetchArchiveAuthors
      .addCase(fetchArchiveAuthors.pending, (state) => {
        state.authorsLoading = true;
      })
      .addCase(fetchArchiveAuthors.fulfilled, (state, action) => {
        state.authorsLoading = false;
        state.allAuthors = action.payload;
      })
      .addCase(fetchArchiveAuthors.rejected, (state) => {
        state.authorsLoading = false;
      });
  },
});

export const { setFilters, resetFilters } = archiveSlice.actions;
export default archiveSlice.reducer;
