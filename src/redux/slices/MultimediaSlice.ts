import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  fetchMediaItems,
  createFolder,
  uploadFiles,
  deleteItems,
  renameItem,
  moveItems,
} from "../actions/MultimediaActions";
import { FileItem, FolderItem, UploadProgress } from "../../types";

interface MultimediaState {
  currentPath: string;
  files: FileItem[];
  folders: FolderItem[];
  uploads: UploadProgress[];
  selectedItems: string[];
  loading: boolean;
  error: string | null;
  createFolderLoading: boolean;
  uploadLoading: boolean;
  deleteLoading: boolean;
  renameLoading: boolean;
  moveLoading: boolean;
}

const initialState: MultimediaState = {
  currentPath: "/",
  files: [],
  folders: [],
  uploads: [],
  selectedItems: [],
  loading: false,
  error: null,
  createFolderLoading: false,
  uploadLoading: false,
  deleteLoading: false,
  renameLoading: false,
  moveLoading: false,
};

const multimediaSlice = createSlice({
  name: "multimedia",
  initialState,
  reducers: {
    setCurrentPath: (state, action: PayloadAction<string>) => {
      state.currentPath = action.payload;
      state.selectedItems = [];
    },
    toggleSelectItem: (state, action: PayloadAction<string>) => {
      const index = state.selectedItems.indexOf(action.payload);
      if (index > -1) {
        state.selectedItems.splice(index, 1);
      } else {
        state.selectedItems.push(action.payload);
      }
    },
    selectAllItems: (state) => {
      state.selectedItems = [
        ...state.files.map((f) => f.path),
        ...state.folders.map((f) => f.path),
      ];
    },
    clearSelection: (state) => {
      state.selectedItems = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    addUploadProgress: (state, action: PayloadAction<UploadProgress>) => {
      state.uploads.push(action.payload);
    },
    updateUploadProgress: (
      state,
      action: PayloadAction<{ fileName: string; progress: number }>
    ) => {
      const upload = state.uploads.find(
        (u) => u.file.name === action.payload.fileName
      );
      if (upload) {
        upload.progress = action.payload.progress;
      }
    },
    clearUploads: (state) => {
      state.uploads = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMediaItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMediaItems.fulfilled, (state, action) => {
        state.loading = false;
        state.files = action.payload.files;
        state.folders = action.payload.folders;
      })
      .addCase(fetchMediaItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(createFolder.pending, (state) => {
        state.createFolderLoading = true;
        state.error = null;
      })
      .addCase(createFolder.fulfilled, (state, action) => {
        state.createFolderLoading = false;
        state.folders.push(action.payload.folder);
      })
      .addCase(createFolder.rejected, (state, action) => {
        state.createFolderLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(uploadFiles.pending, (state) => {
        state.uploadLoading = true;
        state.error = null;
      })
      .addCase(uploadFiles.fulfilled, (state, action) => {
        state.uploadLoading = false;
        state.files.push(...action.payload.files);
        state.uploads = [];
      })
      .addCase(uploadFiles.rejected, (state, action) => {
        state.uploadLoading = false;
        state.error = action.payload as string;
        state.uploads = [];
      });

    builder
      .addCase(deleteItems.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteItems.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.files = state.files.filter(
          (f) => !action.payload.deletedItems.includes(f.path)
        );
        state.folders = state.folders.filter(
          (f) => !action.payload.deletedItems.includes(f.path)
        );
        state.selectedItems = [];
      })
      .addCase(deleteItems.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(renameItem.pending, (state) => {
        state.renameLoading = true;
        state.error = null;
      })
      .addCase(renameItem.fulfilled, (state, action) => {
        state.renameLoading = false;

        const file = state.files.find((f) => f.path === action.payload.oldPath);
        if (file) {
          file.path = action.payload.newPath;
          file.name = action.payload.newName;
        }

        const folder = state.folders.find(
          (f) => f.path === action.payload.oldPath
        );
        if (folder) {
          folder.path = action.payload.newPath;
          folder.name = action.payload.newName;
        }
      })
      .addCase(renameItem.rejected, (state, action) => {
        state.renameLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(moveItems.pending, (state) => {
        state.moveLoading = true;
        state.error = null;
      })
      .addCase(moveItems.fulfilled, (state, action) => {
        state.moveLoading = false;

        action.payload.movedItems.forEach(({ oldPath, newPath }) => {
          const file = state.files.find((f) => f.path === oldPath);
          if (file) {
            file.path = newPath;
          }

          const folder = state.folders.find((f) => f.path === oldPath);
          if (folder) {
            folder.path = newPath;
          }
        });

        state.selectedItems = [];
      })
      .addCase(moveItems.rejected, (state, action) => {
        state.moveLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentPath,
  toggleSelectItem,
  selectAllItems,
  clearSelection,
  clearError,
  addUploadProgress,
  updateUploadProgress,
  clearUploads,
} = multimediaSlice.actions;

export default multimediaSlice.reducer;
