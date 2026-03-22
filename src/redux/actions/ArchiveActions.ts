import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../helpers/supabase";

export interface ArchivePhoto {
  id: number;
  filename: string;
  description: string | null;
  rating: number | null;
  nas_base_path: string;
  project_id: number;
  created_at: string;
  project_title: string;
  project_category: string | null;
  project_year: string | null;
  author_id: string;
  author_first_name: string;
  author_last_name: string;
  iluminacion: string[];
  tipo_plano: string[];
  atmosfera_mood: string[];
  materiales_visibles: string[];
  elementos_arquitectonicos: string[];
}

export interface ArchiveFilters {
  category: string;
  year: string;
  rating: string;
  authorId: string;
  iluminacion: string[];
  tipo_plano: string[];
  atmosfera_mood: string[];
  materiales_visibles: string[];
  elementos_arquitectonicos: string[];
}

export interface ArchiveAuthor {
  id: string;
  name: string;
}

export interface TagCategories {
  iluminacion: string[];
  tipo_plano: string[];
  atmosfera_mood: string[];
  materiales_visibles: string[];
  elementos_arquitectonicos: string[];
}

export const PAGE_SIZE = 16;

function buildQuery(filters: ArchiveFilters, from: number, to: number) {
  let query = supabase
    .from("project_photos")
    .select(
      `
      id, filename, description, rating, nas_base_path, project_id, created_at,
      iluminacion, tipo_plano, atmosfera_mood, materiales_visibles, elementos_arquitectonicos,
      projects!inner(
        title, category, year, user,
        userData(first_name, last_name)
      )
    `,
    )
    .not("nas_base_path", "is", null)
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.category) {
    query = query.eq("projects.category", filters.category);
  }
  if (filters.year) {
    query = query.eq("projects.year", filters.year);
  }
  if (filters.authorId) {
    query = query.eq("projects.user", filters.authorId);
  }
  if (filters.rating === "heroica") {
    query = query.eq("rating", 10);
  } else if (filters.rating === "principal") {
    query = query.eq("rating", 7);
  }
  if (filters.iluminacion.length > 0) {
    query = query.overlaps("iluminacion", filters.iluminacion);
  }
  if (filters.tipo_plano.length > 0) {
    query = query.overlaps("tipo_plano", filters.tipo_plano);
  }
  if (filters.atmosfera_mood.length > 0) {
    query = query.overlaps("atmosfera_mood", filters.atmosfera_mood);
  }
  if (filters.materiales_visibles.length > 0) {
    query = query.overlaps("materiales_visibles", filters.materiales_visibles);
  }
  if (filters.elementos_arquitectonicos.length > 0) {
    query = query.overlaps("elementos_arquitectonicos", filters.elementos_arquitectonicos);
  }

  return query;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ArchivePhoto {
  return {
    id: row.id,
    filename: row.filename,
    description: row.description ?? null,
    rating: row.rating ?? null,
    nas_base_path: row.nas_base_path,
    project_id: row.project_id,
    created_at: row.created_at,
    project_title: row.projects?.title ?? "",
    project_category: row.projects?.category ?? null,
    project_year: row.projects?.year ?? null,
    author_id: row.projects?.user ?? "",
    author_first_name: row.projects?.userData?.first_name ?? "",
    author_last_name: row.projects?.userData?.last_name ?? "",
    iluminacion: row.iluminacion ?? [],
    tipo_plano: row.tipo_plano ?? [],
    atmosfera_mood: row.atmosfera_mood ?? [],
    materiales_visibles: row.materiales_visibles ?? [],
    elementos_arquitectonicos: row.elementos_arquitectonicos ?? [],
  };
}

export const fetchArchivePhotos = createAsyncThunk(
  "archive/fetchPhotos",
  async (
    { filters, page }: { filters: ArchiveFilters; page: number },
    { rejectWithValue },
  ) => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(filters, from, to);
    if (error) return rejectWithValue({ message: error.message });
    const photos = (data ?? []).map(mapRow);
    return { photos, hasMore: photos.length === PAGE_SIZE, page };
  },
);

export const fetchArchiveTagCategories = createAsyncThunk(
  "archive/fetchTagCategories",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("project_photos")
      .select(
        "iluminacion, tipo_plano, atmosfera_mood, materiales_visibles, elementos_arquitectonicos",
      )
      .not("nas_base_path", "is", null)
      .limit(2000);
    if (error) return rejectWithValue({ message: error.message });

    const unique = (arr: string[][]) =>
      [...new Set(arr.flat().filter(Boolean))].sort();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []) as any[];
    return {
      iluminacion: unique(rows.map((r) => r.iluminacion ?? [])),
      tipo_plano: unique(rows.map((r) => r.tipo_plano ?? [])),
      atmosfera_mood: unique(rows.map((r) => r.atmosfera_mood ?? [])),
      materiales_visibles: unique(rows.map((r) => r.materiales_visibles ?? [])),
      elementos_arquitectonicos: unique(
        rows.map((r) => r.elementos_arquitectonicos ?? []),
      ),
    } as TagCategories;
  },
);

export const fetchArchiveAuthors = createAsyncThunk(
  "archive/fetchAuthors",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("project_photos")
      .select(
        `
        projects!inner(
          user,
          userData(first_name, last_name)
        )
      `,
      )
      .not("nas_base_path", "is", null)
      .limit(2000);
    if (error) return rejectWithValue({ message: error.message });
    const seen = new Set<string>();
    const authors: ArchiveAuthor[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      const uid: string = row.projects?.user;
      if (uid && !seen.has(uid)) {
        seen.add(uid);
        const fn = row.projects?.userData?.first_name ?? "";
        const ln = row.projects?.userData?.last_name ?? "";
        authors.push({ id: uid, name: `${fn} ${ln}`.trim() });
      }
    }
    return authors.sort((a, b) => a.name.localeCompare(b.name));
  },
);
