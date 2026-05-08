// Stub — will be replaced by W4's real supabase.ts once task #4 completes.
// W4 must export: supabase (SupabaseClient), getCurrentUser(), signInWithSlack()
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
