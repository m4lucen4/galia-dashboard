import { createAsyncThunk } from "@reduxjs/toolkit";

const NAS_URL = import.meta.env.VITE_NAS_PROXY_URL;
const NAS_KEY = import.meta.env.VITE_NAS_PROXY_API_KEY;

export type NasFile = {
  name: string;
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
