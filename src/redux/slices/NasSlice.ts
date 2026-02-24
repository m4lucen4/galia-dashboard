import { createSlice } from "@reduxjs/toolkit";
import { nasFetchFiles, nasDeleteFile, NasFile } from "../actions/NasActions";

type NasState = {
  files: NasFile[];
  loading: boolean;
  error: string | null;
};

const initialState: NasState = {
  files: [],
  loading: false,
  error: null,
};

const nasSlice = createSlice({
  name: "nas",
  initialState,
  reducers: {
    clearNasError(state) {
      state.error = null;
    },
    clearNasFiles(state) {
      state.files = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(nasFetchFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(nasFetchFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.files = action.payload;
      })
      .addCase(nasFetchFiles.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as { message: string })?.message || "Error";
      })
      .addCase(nasDeleteFile.fulfilled, (state, action) => {
        state.files = state.files.filter((f) => f.name !== action.payload);
      });
  },
});

export const { clearNasError, clearNasFiles } = nasSlice.actions;
export default nasSlice.reducer;
