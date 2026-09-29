import { createClient } from "@supabase/supabase-js";

// Set these in Lovable → Project Settings → Environment Variables
// (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) or in a local .env file.
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey)
  : null;
