import { useQuery } from "@tanstack/react-query";
import type { Summary, Point, McpUsage, PluginUsage, DayCount, Range } from "@/types/models";
import {
  buildMockSummary,
  buildMockTimeseries,
  buildMockTopMcp,
  buildMockTopPlugins,
  buildMockHeatmap,
  buildMockCompanyTopMcp,
} from "@/mocks/usageMock";
import { supabase } from "@/lib/supabase";

const IS_MOCK = !("__TAURI_INTERNALS__" in window);

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

function delay<T>(val: T): Promise<T> {
  return new Promise((r) => setTimeout(() => r(val), 150));
}

export function useSummary(range: Range) {
  return useQuery({
    queryKey: ["summary", range],
    queryFn: () =>
      IS_MOCK
        ? delay(buildMockSummary(range))
        : tauriInvoke<Summary>("get_summary", { range }),
    staleTime: 30_000,
  });
}

export function useTimeseries(range: Range, source?: string) {
  return useQuery({
    queryKey: ["timeseries", range, source],
    queryFn: () =>
      IS_MOCK
        ? delay(buildMockTimeseries(range, source))
        : tauriInvoke<Point[]>("get_timeseries", { range, source: source ?? null }),
    staleTime: 30_000,
  });
}

export function useTopMcp(range: Range) {
  return useQuery({
    queryKey: ["top_mcp", range],
    queryFn: () =>
      IS_MOCK
        ? delay(buildMockTopMcp(range))
        : tauriInvoke<McpUsage[]>("get_top_mcp", { range }),
    staleTime: 30_000,
  });
}

export function useTopPlugins(range: Range) {
  return useQuery({
    queryKey: ["top_plugins", range],
    queryFn: () =>
      IS_MOCK
        ? delay(buildMockTopPlugins(range))
        : tauriInvoke<PluginUsage[]>("get_top_plugins", { range }),
    staleTime: 30_000,
  });
}

export function useHeatmap(days?: number) {
  return useQuery({
    queryKey: ["heatmap", days],
    queryFn: () =>
      IS_MOCK
        ? delay(buildMockHeatmap(days))
        : tauriInvoke<DayCount[]>("get_heatmap", { days: days ?? null }),
    staleTime: 60_000,
  });
}

export interface OAuthUsageWindow {
  utilization: number;
  resets_at: string;
}

export interface OAuthUsage {
  five_hour: OAuthUsageWindow | null;
  seven_day: OAuthUsageWindow | null;
  seven_day_sonnet: OAuthUsageWindow | null;
  seven_day_opus: OAuthUsageWindow | null;
  fetched_at: string;
  is_stale: boolean;
}

export interface OAuthUsageWithError {
  data: OAuthUsage | null;
  error: string | null;
}

export function useOAuthUsage() {
  return useQuery<OAuthUsageWithError>({
    queryKey: ["oauthUsage"],
    queryFn: async () => {
      if (IS_MOCK) return { data: null, error: null };
      try {
        const data = await tauriInvoke<OAuthUsage>("get_oauth_usage");
        return { data, error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // eslint-disable-next-line no-console
        console.warn("[oauth_usage] fetch failed:", msg);
        return { data: null, error: msg };
      }
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
}

export async function refreshOAuthUsage(): Promise<OAuthUsageWithError> {
  if (IS_MOCK) return { data: null, error: null };
  try {
    const data = await tauriInvoke<OAuthUsage>("refresh_oauth_usage");
    return { data, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { data: null, error: msg };
  }
}

// Supabase RPC `get_top_mcp_servers` 결과 row 형태
interface CompanyMcpRow {
  mcp_server: string;
  total_count: number;
}

// 사내 MCP TOP 10 — Supabase RPC 사용. 비로그인/오류/빈 결과는 mock으로 대체해
// MVP 시연 단계의 빈 화면을 방지한다. share_consent=true 유저가 1명이라도 있고
// aggregator가 한 번 돌면 실제 데이터로 자동 swap.
export function useCompanyTopMcp(rangeDays = 30) {
  return useQuery({
    queryKey: ["company_top_mcp", rangeDays],
    queryFn: async (): Promise<McpUsage[]> => {
      const { data, error } = await supabase.rpc("get_top_mcp_servers", {
        range_days: rangeDays,
      });
      if (error) {
        console.warn("[company_top_mcp] RPC error, falling back to mock:", error.message);
        return buildMockCompanyTopMcp();
      }
      const rows = (data ?? []) as CompanyMcpRow[];
      if (rows.length === 0) {
        return buildMockCompanyTopMcp();
      }
      return rows.map((r) => ({ mcp_server: r.mcp_server, count: Number(r.total_count) }));
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
