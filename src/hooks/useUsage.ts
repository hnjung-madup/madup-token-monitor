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

export function useOAuthUsage() {
  return useQuery({
    queryKey: ["oauthUsage"],
    queryFn: async () => {
      if (IS_MOCK) return null as OAuthUsage | null;
      try {
        return await tauriInvoke<OAuthUsage>("get_oauth_usage");
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
}

export function useCompanyTopMcp() {
  return useQuery({
    queryKey: ["company_top_mcp"],
    queryFn: () =>
      IS_MOCK
        ? delay(buildMockCompanyTopMcp())
        : tauriInvoke<McpUsage[]>("get_company_top_mcp"),
    staleTime: 300_000,
  });
}
