import { createAsyncThunk } from "@reduxjs/toolkit";

const NAS_URL = import.meta.env.VITE_NAS_PROXY_URL;
const NAS_KEY = import.meta.env.VITE_NAS_PROXY_API_KEY;

export type NasFile = {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modified: string;
};

export const nasFetchFiles = createAsyncThunk(
  "nas/fetchFiles",
  async (folderPath: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${NAS_URL}/files?path=${encodeURIComponent(folderPath)}`,
        { headers: { "x-api-key": NAS_KEY } },
      );
      if (!response.ok) {
        return rejectWithValue({
          message: `Error obteniendo archivos: ${response.status}`,
        });
      }
      const data = await response.json();
      return data.files as NasFile[];
    } catch (error) {
      return rejectWithValue({
        message:
          error instanceof Error ? error.message : "Error obteniendo archivos",
      });
    }
  },
);

export const nasRenameFolder = createAsyncThunk(
  "nas/renameFolder",
  async (
    { from, to }: { from: string; to: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(`${NAS_URL}/rename`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": NAS_KEY,
        },
        body: JSON.stringify({ from, to }),
      });
      if (!response.ok) {
        return rejectWithValue({
          message: `Error renombrando carpeta: ${response.status}`,
        });
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue({
        message:
          error instanceof Error ? error.message : "Error renombrando carpeta",
      });
    }
  },
);

export const nasRestructure = createAsyncThunk(
  "nas/restructure",
  async (
    {
      folder,
      projectId,
      odooId,
    }: { folder: string; projectId: string; odooId: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(`${NAS_URL}/restructure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": NAS_KEY,
        },
        body: JSON.stringify({ folder, projectId, odooId }),
      });
      if (!response.ok) {
        return rejectWithValue({
          message: `Error reestructurando carpeta: ${response.status}`,
        });
      }
      const data = await response.json();
      return data as { success: boolean; fileMapping: Record<string, string> };
    } catch (error) {
      return rejectWithValue({
        message:
          error instanceof Error
            ? error.message
            : "Error reestructurando carpeta",
      });
    }
  },
);

export const nasDeleteFile = createAsyncThunk(
  "nas/deleteFile",
  async (
    { folderPath, filename }: { folderPath: string; filename: string },
    { rejectWithValue },
  ) => {
    try {
      const filePath = `${folderPath}/${filename}`;
      const response = await fetch(
        `${NAS_URL}/file?path=${encodeURIComponent(filePath)}`,
        {
          method: "DELETE",
          headers: { "x-api-key": NAS_KEY },
        },
      );
      if (!response.ok) {
        return rejectWithValue({
          message: `Error eliminando archivo: ${response.status}`,
        });
      }
      return filename;
    } catch (error) {
      return rejectWithValue({
        message:
          error instanceof Error ? error.message : "Error eliminando archivo",
      });
    }
  },
);

export const nasDeleteFolder = createAsyncThunk(
  "nas/deleteFolder",
  async (folderPath: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${NAS_URL}/folder?path=${encodeURIComponent(folderPath)}`,
        {
          method: "DELETE",
          headers: { "x-api-key": NAS_KEY },
        },
      );
      if (!response.ok) {
        return rejectWithValue({
          message: `Error eliminando carpeta: ${response.status}`,
        });
      }
      return folderPath;
    } catch (error) {
      return rejectWithValue({
        message:
          error instanceof Error ? error.message : "Error eliminando carpeta",
      });
    }
  },
);

export const nasDeletePhoto = createAsyncThunk(
  "nas/deletePhoto",
  async (
    {
      folder,
      filename,
      projectId,
    }: { folder: string; filename: string; projectId: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(
        `${NAS_URL}/photo?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(filename)}&projectId=${encodeURIComponent(projectId)}`,
        {
          method: "DELETE",
          headers: { "x-api-key": NAS_KEY },
        },
      );
      if (!response.ok) {
        return rejectWithValue({
          message: `Error eliminando foto: ${response.status}`,
        });
      }
      return filename;
    } catch (error) {
      return rejectWithValue({
        message:
          error instanceof Error ? error.message : "Error eliminando foto",
      });
    }
  },
);
