import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/helpers/supabase";
import type { WikiSearchResult, WikiSection, WikiSectionNavigation } from "@/features/documentation/types/wiki";

type RpcError = { message: string };

export const fetchWikiNavigation = createAsyncThunk<WikiSectionNavigation[], void, { rejectValue: RpcError }>("wiki/navigation", async (_, { rejectWithValue }) => {
  const { data, error } = await supabase.rpc("wiki_public_navigation");
  if (error) return rejectWithValue({ message: error.message });
  return (data ?? []) as WikiSectionNavigation[];
});

export const fetchWikiSection = createAsyncThunk<WikiSection | null, string, { rejectValue: RpcError }>("wiki/section", async (sectionId, { rejectWithValue }) => {
  const { data, error } = await supabase.rpc("wiki_public_section", { p_section_id: sectionId });
  if (error) return rejectWithValue({ message: error.message });
  return data as WikiSection | null;
});

export const searchWiki = createAsyncThunk<WikiSearchResult[], string, { rejectValue: RpcError }>("wiki/search", async (query, { rejectWithValue }) => {
  const { data, error } = await supabase.rpc("wiki_public_search", { p_query: query.slice(0, 200) });
  if (error) return rejectWithValue({ message: error.message });
  return (data ?? []) as WikiSearchResult[];
});
