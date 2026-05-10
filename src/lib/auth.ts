import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { supabase, signInWithSlack } from "./supabase";

export type AuthState = "loading" | "authenticated" | "unauthenticated";

export async function startSlackLogin(): Promise<void> {
  const { url } = await signInWithSlack();
  if (!url) throw new Error("OAuth URL is missing");
  await openUrl(url);
}

// Tauri deep-link callback 처리
// Supabase는 흐름에 따라 두 가지 형태로 토큰을 보냄:
//   ① PKCE code flow: ?code=...           → exchangeCodeForSession
//   ② OIDC implicit flow: #access_token=...&refresh_token=... → setSession
export async function handleAuthCallback(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);

    // ② Hash fragment 방식 우선 (Slack OIDC가 이쪽으로 옴)
    const fragment = urlObj.hash.startsWith("#") ? urlObj.hash.slice(1) : "";
    if (fragment) {
      const params = new URLSearchParams(fragment);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        return !error;
      }
    }

    // ① Query code 방식 (PKCE)
    const code = urlObj.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return !error;
    }

    return false;
  } catch {
    return false;
  }
}

export async function getAuthState(): Promise<AuthState> {
  const { data } = await supabase.auth.getSession();
  return data.session ? "authenticated" : "unauthenticated";
}

export interface SyncResult {
  usage_rows: number;
  mcp_rows: number;
  plugin_rows: number;
  user_id: string;
  sample_first_row: string | null;
}

/// 즉시 집계 동기화 (share_consent=true 유저만 호출). access_token + user_id를 명시적으로 넘긴다.
export async function syncAggregatesNow(): Promise<SyncResult | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!supabaseUrl || !publishableKey) return null;

  return invoke<SyncResult>("sync_aggregates_now", {
    supabaseUrl,
    publishableKey,
    accessToken: session.access_token,
    userId: session.user.id,
  });
}
