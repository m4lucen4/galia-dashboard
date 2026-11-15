import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The session is persisted with supabase-js' default storage (localStorage).
// A cookie-based storage is not safe here: the serialized session can exceed
// the ~4 KB cookie limit and get silently dropped, so requests fall back to
// the anon key and RLS hides the user's own rows.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
