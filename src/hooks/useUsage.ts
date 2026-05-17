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

// usage_aggregates row (본인 user_id 만 RLS 로 SELECT 허용).
interface MyAggregateRow {
  date: string; // YYYY-MM-DD
  source: string;
  total_input: number;
  total_output: number;
  total_tokens: number;
  total_cost_usd: number;
}

function rangeStartDate(range: Range): string | null {
  if (range === "all") return null;
  const days =
    range === "1d" ? 0 : range === "7d" ? 7 : range === "30d" ? 30 : 365;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/// 본인 user_id 의 모든 디바이스 합산본 (usage_aggregates) 을 Point[] 로 합성.
/// usage_aggregates PK 가 (user_id, date, source) 라 디바이스 무관 자동 합산.
/// cache 분리/시간단위/메시지수는 aggregates 에 없으므로 cache_read 에 잔여
/// (total_tokens - input - output) 를 넣어 토큰 합계만 정합. 실패 시 null →
/// 로컬 invoke fallback.
async function fetchMyAggregatedPoints(
  range: Range,
  source?: string,
): Promise<Point[] | null> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return null;
    let q = supabase
      .from("usage_aggregates")
      .select("date,source,total_input,total_output,total_tokens,total_cost_usd")
      .eq("user_id", uid);
    const start = rangeStartDate(range);
    if (start) q = q.gte("date", start);
    if (source) q = q.eq("source", source);
    const { data, error } = await q;
    if (error || !data) return null;
    const rows = data as MyAggregateRow[];
    return rows.map((r) => {
      const localMidnight = new Date(r.date + "T00:00:00").getTime();
      const cacheRemainder = Math.max(
        0,
        r.total_tokens - r.total_input - r.total_output,
      );
      return {
        ts: localMidnight,
        input_tokens: r.total_input,
        output_tokens: r.total_output,
        cache_read: cacheRemainder,
        cache_write: 0,
        cost_usd: r.total_cost_usd,
      };
    });
  } catch {
    return null;
  }
}

export function useTimeseries(range: Range, source?: string) {
  return useQuery({
    queryKey: ["timeseries", range, source],
    queryFn: async () => {
      if (IS_MOCK) return delay(buildMockTimeseries(range, source));
      // 로그인 시 Supabase 합산본 우선 (다중 디바이스), 실패/비로그인 시 로컬.
      const agg = await fetchMyAggregatedPoints(range, source);
      if (agg && agg.length > 0) return agg;
      return tauriInvoke<Point[]>("get_timeseries", {
        range,
        source: source ?? null,
      });
    },
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

// Supabase RPC `get_top_plugins` 결과 row 형태
interface CompanyPluginRow {
  plugin_id: string;
  total_count: number;
}

export function useCompanyTopPlugins(rangeDays = 30) {
  return useQuery({
    queryKey: ["company_top_plugins", rangeDays],
    queryFn: async (): Promise<PluginUsage[]> => {
      const { data, error } = await supabase.rpc("get_top_plugins", {
        range_days: rangeDays,
      });
      if (error) {
        console.warn("[company_top_plugins] RPC error:", error.message);
        return [];
      }
      const rows = (data ?? []) as CompanyPluginRow[];
      return rows.map((r) => ({ plugin_id: r.plugin_id, count: Number(r.total_count) }));
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}

// Supabase RPC `get_top_users(range_days, max_rows)` 결과 row 형태
interface CompanyLeaderboardRow {
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  total_cost: number;
  total_tokens: number;
}

export interface CompanyLeaderboardEntry {
  rank: number;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  total_cost: number;
  total_tokens: number;
}

export type LeaderboardRange = "today" | "week" | "month";

// RPC get_top_users 의 WHERE 절: `date >= current_date - (range_days || ' days')::interval`.
// 단순히 rolling N 일이 아니라 대시보드 카드와 같은 calendar 의미로 매핑한다.
//   today      → 0 (today 만)
//   this-week  → 오늘 요일까지 (오늘이 월요일이면 0, 화 1, 금 4, 일 6)
//                = 이번 주 월요일부터의 일수. friday cap 은 미래 일자 없으니 자동 만족.
//   this-month → 오늘 - 이번 달 1일까지의 일수 (5/11 이면 10)
function rangeToDays(range: LeaderboardRange, today: Date = new Date()): number {
  if (range === "today") return 0;
  if (range === "week") return (today.getDay() + 6) % 7; // Mon=0..Sun=6
  return today.getDate() - 1; // month-to-date
}

export function useCompanyLeaderboard(range: LeaderboardRange = "week") {
  const days = rangeToDays(range);
  return useQuery<CompanyLeaderboardEntry[], Error>({
    // days 를 key 에 포함 → 자정 지나 의미 바뀌면 (예: 주중 → 다음 주 월요일) 자동 새 fetch.
    queryKey: ["company_leaderboard", range, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_users", {
        range_days: days,
        max_rows: 50,
      });
      if (error) {
        // RPC 미존재(미적용 마이그레이션)/RLS 문제 등을 페이지에서 보여주기 위해 throw.
        throw new Error(error.message);
      }
      const rows = (data ?? []) as CompanyLeaderboardRow[];
      return rows.map((r, i) => ({
        rank: i + 1,
        user_id: r.user_id ?? null,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        total_cost: Number(r.total_cost),
        total_tokens: Number(r.total_tokens),
      }));
    },
    // 익명 토글 등 프로필 변경이 빠르게 반영돼야 하므로 staleTime은 짧게.
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 0,
  });
}

// 리더보드 USER 행 클릭 상세 — 특정 user 의 MCP / 플러그인 TOP.
// security-definer RPC (get_user_mcp / get_user_plugins) — 다른 사람 데이터는
// RLS 로 막혀 있어 RPC 우회. 모델별 토큰은 usage_aggregates 에 model 차원이 없어 제외.

export function useUserMcp(userId: string | null, rangeDays = 30) {
  return useQuery<McpUsage[], Error>({
    queryKey: ["user_mcp", userId, rangeDays],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_mcp", {
        p_user: userId,
        range_days: rangeDays,
      });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as {
        mcp_server: string;
        total_count: number;
      }[];
      return rows.map((r) => ({
        mcp_server: r.mcp_server,
        count: Number(r.total_count),
      }));
    },
    staleTime: 60_000,
    retry: 0,
  });
}

export function useUserPlugins(userId: string | null, rangeDays = 30) {
  return useQuery<PluginUsage[], Error>({
    queryKey: ["user_plugins", userId, rangeDays],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_plugins", {
        p_user: userId,
        range_days: rangeDays,
      });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as {
        plugin_id: string;
        total_count: number;
      }[];
      return rows.map((r) => ({
        plugin_id: r.plugin_id,
        count: Number(r.total_count),
      }));
    },
    staleTime: 60_000,
    retry: 0,
  });
}
