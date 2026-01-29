import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";
import { FileItem, FolderItem, UploadProgress } from "../../types";

const BUCKET_NAME = "user-media";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const fetchMediaItems = createAsyncThunk(
  "multimedia/fetchMediaItems",
  async (
    { userId, path }: { userId: string; path: string },
    { rejectWithValue }
  ) => {
    try {
      const folderPath = `${userId}${path}`;

      const { data: files, error: filesError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folderPath);

      if (filesError) {
        throw filesError;
      }

      if (!files) {
        return { files: [], folders: [] };
      }

      const fileItems: FileItem[] = [];
      const folderItems: FolderItem[] = [];

      for (const item of files) {
        // Skip .keep files (technical files used to maintain empty folders)
        if (item.name === ".keep") {
          continue;
        }

        const itemPath = path === "/" ? `/${item.name}` : `${path}/${item.name}`;

        if (item.id === null) {
          folderItems.push({
            id: item.name,
            name: item.name,
            type: "folder",
            path: itemPath,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
            user_id: userId,
            parent_path: path,
          });
        } else {
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(`${userId}${itemPath}`);

          fileItems.push({
            id: item.id,
            name: item.name,
            type: "file",
            path: itemPath,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
            size: item.metadata?.size || 0,
            mime_type: item.metadata?.mimetype || "application/octet-stream",
            url: urlData.publicUrl,
            user_id: userId,
          });
        }
      }

      return { files: fileItems, folders: folderItems };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Error fetching media items"
      );
    }
  }
);

export const createFolder = createAsyncThunk(
  "multimedia/createFolder",
  async (
    { userId, path, folderName }: { userId: string; path: string; folderName: string },
    { rejectWithValue }
  ) => {
    try {
      const folderPath = path === "/" ? `/${folderName}` : `${path}/${folderName}`;
      const fullPath = `${userId}${folderPath}/.keep`;

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fullPath, new Blob([""]), {
          contentType: "text/plain",
        });

      if (error) {
        throw error;
      }

      return {
        folder: {
          id: folderName,
          name: folderName,
          type: "folder" as const,
          path: folderPath,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: userId,
          parent_path: path,
        },
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Error creating folder"
      );
    }
  }
);

export const uploadFiles = createAsyncThunk(
  "multimedia/uploadFiles",
  async (
    {
      userId,
      path,
      files,
    }: {
      userId: string;
      path: string;
      files: File[];
      onProgress?: (progress: UploadProgress[]) => void;
    },
    { rejectWithValue }
  ) => {
    try {
      if (files.length > 25) {
        throw new Error("Maximum 25 files allowed");
      }

      const uploadPromises = files.map(async (file) => {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`${file.name} exceeds 5MB limit`);
        }

        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image`);
        }

        const filePath = path === "/" ? `/${file.name}` : `${path}/${file.name}`;
        const fullPath = `${userId}${filePath}`;

        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fullPath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (error) {
          throw error;
        }

        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fullPath);

        return {
          id: data.id || file.name,
          name: file.name,
          type: "file" as const,
          path: filePath,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          size: file.size,
          mime_type: file.type,
          url: urlData.publicUrl,
          user_id: userId,
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      return { files: uploadedFiles };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Error uploading files"
      );
    }
  }
);

export const deleteItems = createAsyncThunk(
  "multimedia/deleteItems",
  async (
    {
      userId,
      items,
    }: {
      userId: string;
      items: { path: string; type: "file" | "folder" }[];
    },
    { rejectWithValue }
  ) => {
    try {
      const filesToDelete: string[] = [];

      for (const item of items) {
        if (item.type === "folder") {
          const folderPath = `${userId}${item.path}`;
          const { data: folderContents } = await supabase.storage
            .from(BUCKET_NAME)
            .list(folderPath);

          if (folderContents) {
            const allFiles = await getAllFilesRecursive(folderPath, folderContents);
            filesToDelete.push(...allFiles);
          }
        } else {
          filesToDelete.push(`${userId}${item.path}`);
        }
      }

      if (filesToDelete.length > 0) {
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(filesToDelete);

        if (error) {
          throw error;
        }
      }

      return { deletedItems: items.map((item) => item.path) };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Error deleting items"
      );
    }
  }
);

async function getAllFilesRecursive(
  basePath: string,
  items: Array<{ name: string; id: string | null }>
): Promise<string[]> {
  const files: string[] = [];

  for (const item of items) {
    const itemPath = `${basePath}/${item.name}`;

    if (item.id === null) {
      const { data: subItems } = await supabase.storage
        .from(BUCKET_NAME)
        .list(itemPath);

      if (subItems) {
        const subFiles = await getAllFilesRecursive(itemPath, subItems);
        files.push(...subFiles);
      }
    } else {
      files.push(itemPath);
    }
  }

  return files;
}

export const renameItem = createAsyncThunk(
  "multimedia/renameItem",
  async (
    {
      userId,
      oldPath,
      newName,
    }: {
      userId: string;
      oldPath: string;
      newName: string;
      type: "file" | "folder";
    },
    { rejectWithValue }
  ) => {
    try {
      const pathParts = oldPath.split("/");
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join("/");

      const oldFullPath = `${userId}${oldPath}`;
      const newFullPath = `${userId}${newPath}`;

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .move(oldFullPath, newFullPath);

      if (error) {
        throw error;
      }

      return { oldPath, newPath, newName };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Error renaming item"
      );
    }
  }
);

export const moveItems = createAsyncThunk(
  "multimedia/moveItems",
  async (
    {
      userId,
      items,
      destinationPath,
    }: {
      userId: string;
      items: { path: string; name: string }[];
      destinationPath: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const movePromises = items.map(async (item) => {
        const newPath =
          destinationPath === "/"
            ? `/${item.name}`
            : `${destinationPath}/${item.name}`;

        const oldFullPath = `${userId}${item.path}`;
        const newFullPath = `${userId}${newPath}`;

        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .move(oldFullPath, newFullPath);

        if (error) {
          throw error;
        }

        return { oldPath: item.path, newPath };
      });

      const results = await Promise.all(movePromises);

      return { movedItems: results };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Error moving items"
      );
    }
  }
);
