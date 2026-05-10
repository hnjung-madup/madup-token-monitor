import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSummary, useTimeseries, useHeatmap, useOAuthUsage, refreshOAuthUsage } from "@/hooks/useUsage";
import { useQueryClient } from "@tanstack/react-query";
import { DailyBarChart } from "@/components/charts/DailyBarChart";
import { MinimalBarList } from "@/components/MinimalBarList";
import { HeatMap } from "@/components/HeatMap";
import { SegmentedBar, quotaTextColor } from "@/components/SegmentedBar";
import { Select } from "@/components/ui/Select";
import {
  formatTokensCompact,
  formatUSD,
  formatKRW,
  formatPercent,
  formatRelativeTime,
} from "@/lib/format";
import type { Range, Point } from "@/types/models";

const RANGES: { value: Range; label: string }[] = [
  { value: "1d", label: "dashboard.period.today" },
  { value: "7d", label: "dashboard.period.week" },
  { value: "30d", label: "dashboard.period.month" },
];

// 일자 키는 local timezone 기준 — UTC로 묶으면 한국 사용자의 KST 9시 이전 작업이
// 전날 UTC로 빠져나가서 "오늘"이 비어 보인다.
function localDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// AI Token Monitor와 동일한 합산: input + output + cache_read + cache_write.
// cache까지 포함해야 Claude API가 청구하는 진짜 사용량 = "토큰 사용량" 의미와 맞다.
// (cache는 cards에 별도 라벨로도 표시되어 비교 가능)
function aggregateByDay(points: Point[]): { date: string; tokens: number; cost: number }[] {
  const map = new Map<string, { tokens: number; cost: number }>();
  for (const p of points) {
    const key = localDateKey(p.ts);
    const cur = map.get(key) ?? { tokens: 0, cost: 0 };
    cur.tokens += p.input_tokens + p.output_tokens + (p.cache_read ?? 0) + (p.cache_write ?? 0);
    cur.cost += p.cost_usd;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function pctDiff(a: number, b: number): number {
  if (b <= 0) return 0;
  return (a - b) / b;
}

const DAILY_CARD_LIMIT: Record<Range, number> = { "1d": 1, "7d": 7, "30d": 30 };

export function Dashboard() {
  const { t } = useTranslation();
  const [dailyRange, setDailyRange] = useState<Range>("7d");
  const [dailyMetric, setDailyMetric] = useState<"tokens" | "cost">("tokens");
  const [dailyView, setDailyView] = useState<"chart" | "list">("list");

  const { data: summary30 } = useSummary("30d");
  const { data: summary7 } = useSummary("7d");
  const { data: summary1 } = useSummary("1d");
  const { data: tsDaily } = useTimeseries(dailyRange);
  const { data: tsMonth } = useTimeseries("30d");
  const { data: heatmap } = useHeatmap(56);
  const { data: oauthResp } = useOAuthUsage();
  const oauthUsage = oauthResp?.data ?? null;
  const oauthError = oauthResp?.error ?? null;
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  async function handleRefreshQuota() {
    setRefreshing(true);
    try {
      const result = await refreshOAuthUsage();
      qc.setQueryData(["oauthUsage"], result);
    } finally {
      setRefreshing(false);
    }
  }

  const dailyAggregated = useMemo(() => aggregateByDay(tsDaily ?? []), [tsDaily]);

  // 캘린더 월(이번 달 1일~오늘) 합산 — 30d rolling이 아닌 정확한 "5월" 같은 의미.
  const monthToDate = useMemo(() => {
    if (!tsMonth) return { tokens: 0, cost: 0, cache: 0, days: 0 };
    const now = new Date();
    const monthStartTs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const filtered = tsMonth.filter((p) => p.ts >= monthStartTs);
    const dayKeys = new Set(filtered.map((p) => localDateKey(p.ts)));
    let tokens = 0;
    let cost = 0;
    let cache = 0;
    for (const p of filtered) {
      const cr = p.cache_read ?? 0;
      const cw = p.cache_write ?? 0;
      tokens += p.input_tokens + p.output_tokens + cr + cw;
      cost += p.cost_usd;
      cache += cr + cw;
    }
    return { tokens, cost, cache, days: dayKeys.size };
  }, [tsMonth]);

  if (!summary1 || !summary7 || !summary30) {
    return (
      <div className="flex items-center justify-center h-64 text-graphite text-sm">
        불러오는 중...
      </div>
    );
  }

  // AI Token Monitor와 동일한 합산: input + output + cache_read + cache_write.
  // cache는 Claude API가 실제 청구하는 토큰이므로 메인 숫자에 포함.
  // cache 비중은 별도 라벨로 분리 표시.
  const sumIO = (s: typeof summary1) =>
    s.total_input_tokens +
    s.total_output_tokens +
    s.total_cache_read +
    s.total_cache_write;
  const sumCache = (s: typeof summary1) => s.total_cache_read + s.total_cache_write;

  const todayTokens = sumIO(summary1);
  const todayCache = sumCache(summary1);
  const todayCost = summary1.total_cost_usd;
  const weekAvgDailyTokens = sumIO(summary7) / 7;
  const todayVsWeek = pctDiff(todayTokens, weekAvgDailyTokens);

  const todayMessages = summary1.message_count;
  const todaySessions = summary1.session_count;

  // OAuth Usage API에서 실제 한도 utilization과 reset 시각을 받음.
  // API 호출 실패 시(미로그인/네트워크) fallback으로 mock 표시.
  const fiveHour = oauthUsage?.five_hour ?? null;
  const sevenDay = oauthUsage?.seven_day ?? null;
  const hasRealQuota = fiveHour !== null || sevenDay !== null;

  const sessionUsage = fiveHour
    ? Math.min(1, fiveHour.utilization / 100)
    : Math.min(1, todayTokens / 250_000_000);
  const weeklyUsage = sevenDay
    ? Math.min(1, sevenDay.utilization / 100)
    : Math.min(1, sumIO(summary7) / 1_500_000_000);
  const sessionResetMs = fiveHour
    ? Math.max(0, new Date(fiveHour.resets_at).getTime() - Date.now())
    : 1 * 3600_000 + 3 * 60_000;
  const weeklyResetMs = sevenDay
    ? Math.max(0, new Date(sevenDay.resets_at).getTime() - Date.now())
    : 1 * 86_400_000 + 14 * 3600_000 + 53 * 60_000;

  const week = summary7;

  const dailyLimit = DAILY_CARD_LIMIT[dailyRange];
  const dailyRows = dailyAggregated.slice(-dailyLimit);

  function copyDailyToClipboard() {
    const lines = [
      ["Date", dailyMetric === "tokens" ? "Tokens" : "Cost (USD)"].join("\t"),
      ...dailyRows.map((d) =>
        [d.date, dailyMetric === "tokens" ? d.tokens : d.cost.toFixed(4)].join("\t"),
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="px-4 py-4 space-y-4 max-w-full">
      {/* TODAY CARD ============================================ */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-3">
        <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-graphite mb-2">
          오늘
        </p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[28px] font-bold text-primary leading-none tabular-nums">
            {formatTokensCompact(todayTokens)}
          </span>
          <span className="text-[12px] text-graphite">tokens</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-graphite">
            {formatTokensCompact(todayCache)} cached
          </span>
          {weekAvgDailyTokens > 0 && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                todayVsWeek >= 0
                  ? "bg-bloom-rose text-bloom-deep"
                  : "bg-primary-soft text-primary-deep"
              }`}
            >
              {todayVsWeek >= 0 ? "+" : ""}
              {(todayVsWeek * 100).toFixed(0)}% vs 7d 평균
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 pt-3 border-t border-hairline">
          <div>
            <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-graphite">
              비용
            </p>
            <p className="text-[16px] font-bold text-[#f5a524] mt-0.5 leading-none">
              {formatUSD(todayCost)}
            </p>
            <p className="text-[10px] text-graphite mt-0.5">{formatKRW(todayCost)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-graphite">
              요청
            </p>
            <p className="text-[16px] font-bold text-primary mt-0.5 leading-none">
              {todayMessages.toLocaleString("ko-KR")}
            </p>
            <p className="text-[10px] text-graphite mt-0.5">건</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-graphite">
              세션
            </p>
            <p className="text-[16px] font-bold text-primary mt-0.5 leading-none">
              {todaySessions}
            </p>
            <p className="text-[10px] text-graphite mt-0.5">개</p>
          </div>
        </div>
      </section>

      {/* USAGE QUOTA CARD ============================================ */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-3">
        <div className="flex items-center justify-between mb-3 gap-2">
          <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-graphite shrink-0">
            사용량 한도
          </p>
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-[10px] text-graphite truncate"
              title={oauthError ?? undefined}
            >
              {hasRealQuota
                ? `OAuth 실시간${oauthUsage?.is_stale ? " (캐시)" : ""}`
                : oauthError
                  ? `오류: ${oauthError.length > 30 ? oauthError.slice(0, 30) + "…" : oauthError}`
                  : "추정값"}
            </span>
            <button
              onClick={handleRefreshQuota}
              disabled={refreshing}
              className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-md border border-hairline bg-canvas text-charcoal hover:bg-cloud transition-colors disabled:opacity-60"
              title="OAuth 토큰 다시 시도"
            >
              {refreshing ? "갱신 중…" : "새로고침"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[12px] font-semibold text-ink">세션 (5h)</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-graphite">
                  Resets in {formatRelativeTime(sessionResetMs)}
                </span>
                <span
                  className={`text-[12px] font-bold tabular-nums ${quotaTextColor(sessionUsage)}`}
                >
                  {(sessionUsage * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <SegmentedBar value={sessionUsage} segments={12} color="quota" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[12px] font-semibold text-ink">주간 한도</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-graphite">
                  Resets in {formatRelativeTime(weeklyResetMs)}
                </span>
                <span
                  className={`text-[12px] font-bold tabular-nums ${quotaTextColor(weeklyUsage)}`}
                >
                  {(weeklyUsage * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <SegmentedBar value={weeklyUsage} segments={12} color="quota" />
          </div>
        </div>
      </section>

      {/* DAILY CARD ============================================ */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Select
              value={dailyRange}
              onChange={(v) => setDailyRange(v as Range)}
              options={RANGES.map((r) => ({ value: r.value, label: t(r.label) }))}
              ariaLabel="기간 선택"
            />
          </div>
          <div className="flex items-center gap-1">
            <div className="inline-flex rounded-md border border-hairline overflow-hidden text-[11px]">
              <button
                onClick={() => setDailyMetric("tokens")}
                className={`px-2 py-0.5 font-semibold transition-colors ${
                  dailyMetric === "tokens"
                    ? "bg-primary text-on-primary"
                    : "text-charcoal hover:bg-cloud"
                }`}
              >
                Tokens
              </button>
              <button
                onClick={() => setDailyMetric("cost")}
                className={`px-2 py-0.5 font-semibold border-l border-hairline transition-colors ${
                  dailyMetric === "cost"
                    ? "bg-primary text-on-primary"
                    : "text-charcoal hover:bg-cloud"
                }`}
              >
                Cost
              </button>
            </div>
            <div className="inline-flex rounded-md border border-hairline overflow-hidden text-[11px]">
              <button
                onClick={() => setDailyView("chart")}
                className={`px-2 py-0.5 font-semibold transition-colors ${
                  dailyView === "chart"
                    ? "bg-primary text-on-primary"
                    : "text-charcoal hover:bg-cloud"
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setDailyView("list")}
                className={`px-2 py-0.5 font-semibold border-l border-hairline transition-colors ${
                  dailyView === "list"
                    ? "bg-primary text-on-primary"
                    : "text-charcoal hover:bg-cloud"
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {dailyView === "chart" ? (
          <DailyBarChart data={tsDaily ?? []} />
        ) : (
          <div className="divide-y divide-hairline max-h-[280px] overflow-y-auto">
            {dailyRows.length === 0 ? (
              <p className="hp-caption text-graphite py-3 text-center">
                {t("dashboard.empty")}
              </p>
            ) : (
              dailyRows.map((d) => {
                const value = dailyMetric === "tokens" ? d.tokens : d.cost;
                const empty = value === 0;
                return (
                  <div
                    key={d.date}
                    className={`flex items-center justify-between py-1.5 px-1 ${
                      empty ? "opacity-50" : ""
                    }`}
                  >
                    <span className="text-[11px] font-mono text-charcoal">{d.date}</span>
                    <span
                      className={`text-[12px] font-bold tabular-nums ${
                        empty ? "text-graphite" : "text-primary"
                      }`}
                    >
                      {empty
                        ? "—"
                        : dailyMetric === "tokens"
                          ? formatTokensCompact(d.tokens)
                          : formatUSD(d.cost)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="flex justify-end mt-2">
          <button
            onClick={copyDailyToClipboard}
            className="px-2 py-0.5 text-[11px] font-semibold rounded-md border border-hairline bg-canvas text-charcoal hover:bg-cloud transition-colors"
          >
            Copy
          </button>
        </div>
      </section>

      {/* THIS WEEK / THIS MONTH ============================================ */}
      <section className="grid grid-cols-2 gap-3">
        <div className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-3">
          <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-graphite mb-1">
            이번 주
          </p>
          <p className="text-[24px] font-bold text-primary leading-none tabular-nums">
            {formatTokensCompact(sumIO(week))}
          </p>
          <p className="text-[10px] text-graphite mt-1.5">
            {formatTokensCompact(week.total_cache_read + week.total_cache_write)} cached
          </p>
          <p className="text-[10px] text-charcoal mt-0.5">
            {formatUSD(week.total_cost_usd)} · {formatPercent(
              week.total_input_tokens / Math.max(1, sumIO(week))
            )} 입력
          </p>
        </div>

        <div className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-3">
          <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-graphite mb-1">
            이번 달 ({new Date().getMonth() + 1}월)
          </p>
          <p className="text-[24px] font-bold text-primary leading-none tabular-nums">
            {formatTokensCompact(monthToDate.tokens)}
          </p>
          <p className="text-[10px] text-graphite mt-1.5">
            {formatTokensCompact(monthToDate.cache)} cached
          </p>
          <p className="text-[10px] text-charcoal mt-0.5">
            {formatUSD(monthToDate.cost)} · {monthToDate.days}일
          </p>
        </div>
      </section>

      {/* ACTIVITY 8 WEEKS ============================================ */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-4">
        <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite mb-4">
          활동 (8주)
        </p>
        <HeatMap data={heatmap ?? []} weeks={8} />
      </section>

      {/* SECONDARY: TOOL COST / MODEL USAGE — minimal bar lists ====== */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-4">
        <MinimalBarList
          title="도구별 비용 (7일)"
          items={summary7.by_source
            .map((s) => ({ label: s.source, value: s.cost_usd }))
            .sort((a, b) => b.value - a.value)}
          color="#0aa9c9"
          formatValue={(v) => formatUSD(v)}
          emptyMessage="기록 없음"
        />
      </section>

      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-4">
        <MinimalBarList
          title="모델별 토큰 (7일)"
          items={summary7.by_model
            .map((m) => ({
              label: m.model.replace("claude-", ""),
              value: m.input_tokens + m.output_tokens,
            }))
            .sort((a, b) => b.value - a.value)}
          color="#024ad8"
          formatValue={(v) => formatTokensCompact(v)}
          emptyMessage="기록 없음"
        />
      </section>

    </div>
  );
}
