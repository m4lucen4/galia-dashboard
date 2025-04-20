import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: {
      getItem: (key) => {
        const value = document.cookie
          .split(";")
          .find((cookie) => cookie.trim().startsWith(`${key}=`));
        return value ? value.split("=")[1] : null;
      },
      setItem: (key, value) => {
        document.cookie = `${key}=${value}; path=/; max-age=2592000; SameSite=Strict`;
      },
      removeItem: (key) => {
        document.cookie = `${key}=; path=/; max-age=0`;
      },
    },
  },
});
