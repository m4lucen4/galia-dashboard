import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/helpers/supabase";
import type { WikiSearchResult, WikiSection, WikiSectionNavigation } from "@/features/documentation/types/wiki";

type RpcError = { message: string };

export const fetchArticlesNavigation = createAsyncThunk<WikiSectionNavigation[], void, { rejectValue: RpcError }>("articles/navigation", async (_, { rejectWithValue }) => {
  const { data, error } = await supabase.rpc("articles_public_navigation");
  if (error) return rejectWithValue({ message: error.message });
  return (data ?? []) as WikiSectionNavigation[];
});

export const fetchArticlesSection = createAsyncThunk<WikiSection | null, string, { rejectValue: RpcError }>("articles/section", async (sectionId, { rejectWithValue }) => {
  const { data, error } = await supabase.rpc("articles_public_section", { p_section_id: sectionId });
  if (error) return rejectWithValue({ message: error.message });
  return data as WikiSection | null;
});

export const searchArticles = createAsyncThunk<WikiSearchResult[], string, { rejectValue: RpcError }>("articles/search", async (query, { rejectWithValue }) => {
  const { data, error } = await supabase.rpc("articles_public_search", { p_query: query.slice(0, 200) });
  if (error) return rejectWithValue({ message: error.message });
  return (data ?? []) as WikiSearchResult[];
});
