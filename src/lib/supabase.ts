import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// 인증 후 redirect 위치
// - VITE_AUTH_SUCCESS_URL이 있으면 그 https URL로 → success 페이지에서 deep-link로 forward (사용자 경험 ↑)
// - 없으면 deep-link 직접 redirect (브라우저 탭이 안 닫히는 known limitation)
const AUTH_REDIRECT_URL =
  import.meta.env.VITE_AUTH_SUCCESS_URL ?? "madup-token-monitor://auth/callback";

export async function signInWithSlack() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "slack_oidc",
    options: {
      redirectTo: AUTH_REDIRECT_URL,
      scopes: "openid email profile",
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("No OAuth URL returned from Supabase");
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export type Profile = {
  id: string;
  slack_user_id: string | null;
  slack_handle: string | null;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  share_consent: boolean;
  anonymized: boolean;
  created_at: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "share_consent" | "anonymized">>
) {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);
  if (error) throw error;
}
