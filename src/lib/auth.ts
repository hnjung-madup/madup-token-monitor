import { invoke } from "@tauri-apps/api/core";
import { supabase, signInWithSlack } from "./supabase";

export type AuthState = "loading" | "authenticated" | "unauthenticated";

export async function startSlackLogin(): Promise<void> {
  // deep-link 핸들러가 등록된 후 OAuth URL 오픈
  await signInWithSlack();
}

// Tauri deep-link callback에서 호출: madup-token-monitor://auth/callback?code=...
export async function handleAuthCallback(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get("code");
    if (!code) return false;

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  } catch {
    return false;
  }
}

export async function getAuthState(): Promise<AuthState> {
  const { data } = await supabase.auth.getSession();
  return data.session ? "authenticated" : "unauthenticated";
}

// Tauri command로 집계 즉시 동기화 요청
export async function syncAggregatesNow(): Promise<void> {
  await invoke("sync_aggregates_now");
}
