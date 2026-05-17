import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/// 인증 후 redirect 위치.
///
/// - Tauri (dev / prod 모두): VITE_AUTH_SUCCESS_URL 의 https success 페이지 → deep-link 로 forward.
///   Tauri dev binary 는 macOS Launch Services 에 deep-link scheme 이 등록되지 않아
///   dev 인스턴스로 콜백이 안 올 수 있음 — 이 경우엔 한 번 `pnpm tauri build` 해서
///   `.app` 을 설치하거나, 브라우저 dev (`pnpm dev`) 로 테스트.
/// - 브라우저 dev (`pnpm dev` 만, Tauri 없음): 같은 origin /login 으로 — Supabase JS 가
///   `detectSessionInUrl` 로 fragment 자동 처리. http://localhost:1420/** 가 Supabase
///   Redirect URLs 화이트리스트에 있어야 한다.
function authRedirectUrl(): string {
  if (IS_TAURI) {
    return (
      import.meta.env.VITE_AUTH_SUCCESS_URL ?? "madup-token-monitor://auth/callback"
    );
  }
  return `${window.location.origin}/login`;
}

export async function signInWithSlack() {
  const redirect = authRedirectUrl();
  console.info("[auth] startSlackLogin redirectTo =", redirect, "IS_TAURI =", IS_TAURI);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "slack_oidc",
    options: {
      redirectTo: redirect,
      scopes: "openid email profile",
      // Tauri: 외부 브라우저로 직접 openUrl → skip auto-redirect.
      // 브라우저 dev: 같은 탭에서 자연스럽게 redirect.
      skipBrowserRedirect: IS_TAURI,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("No OAuth URL returned from Supabase");
  console.info(
    "[auth] OAuth URL params:",
    new URL(data.url).searchParams.get("redirect_to") ?? "(none)",
  );
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
