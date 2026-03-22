import { createSlice } from "@reduxjs/toolkit";
import type {
  ArchivePhoto,
  ArchiveFilters,
  ArchiveAuthor,
  TagCategories,
} from "../actions/ArchiveActions";
import {
  fetchArchivePhotos,
  fetchArchiveTagCategories,
  fetchArchiveAuthors,
} from "../actions/ArchiveActions";

interface ArchiveState {
  photos: ArchivePhoto[];
  hasMore: boolean;
  page: number;
  loading: boolean;
  error: string | null;
  tagCategories: TagCategories;
  tagCategoriesLoading: boolean;
  allAuthors: ArchiveAuthor[];
  authorsLoading: boolean;
  filters: ArchiveFilters;
}

const initialFilters: ArchiveFilters = {
  category: "",
  year: "",
  rating: "",
  authorId: "",
  iluminacion: [],
  tipo_plano: [],
  atmosfera_mood: [],
  materiales_visibles: [],
  elementos_arquitectonicos: [],
};

const emptyTagCategories: TagCategories = {
  iluminacion: [],
  tipo_plano: [],
  atmosfera_mood: [],
  materiales_visibles: [],
  elementos_arquitectonicos: [],
};

const initialState: ArchiveState = {
  photos: [],
  hasMore: true,
  page: 0,
  loading: false,
  error: null,
  tagCategories: emptyTagCategories,
  tagCategoriesLoading: false,
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
      .addCase(fetchArchiveTagCategories.pending, (state) => {
        state.tagCategoriesLoading = true;
      })
      .addCase(fetchArchiveTagCategories.fulfilled, (state, action) => {
        state.tagCategoriesLoading = false;
        state.tagCategories = action.payload;
      })
      .addCase(fetchArchiveTagCategories.rejected, (state) => {
        state.tagCategoriesLoading = false;
      })
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
