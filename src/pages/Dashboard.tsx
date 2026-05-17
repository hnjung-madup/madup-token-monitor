import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSummary,
  useTimeseries,
  useHeatmap,
  useOAuthUsage,
  refreshOAuthUsage,
} from "@/hooks/useUsage";
import { DailyBarChart } from "@/components/charts/DailyBarChart";
import { HeatMap } from "@/components/HeatMap";
import { MiniBarList } from "@/components/ui/MiniBarList";
import { KpiCard } from "@/components/ui/KpiCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { QuotaSegBar, quotaSignalClass } from "@/components/ui/QuotaSegBar";
import {
  formatTokensCompact,
  formatUSD,
  formatKRW,
  formatPercent,
  formatRelativeTime,
} from "@/lib/format";
import type { Range, Point } from "@/types/models";

const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "dashboard.period.week" },
  { value: "30d", label: "dashboard.period.month" },
];

type Granularity = "daily" | "weekly" | "monthly";
const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "daily", label: "일자별" },
  { value: "weekly", label: "주별" },
  { value: "monthly", label: "월별" },
];

function localDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function weekStartKey(ts: number): string {
  const d = new Date(ts);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return localDateKey(d.getTime());
}
function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function yearKey(ts: number): string {
  return String(new Date(ts).getFullYear());
}
function weekLabel(weekStartDate: string): string {
  const d = new Date(weekStartDate + "T00:00:00");
  const month = d.getMonth() + 1;
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const firstDow = (firstOfMonth.getDay() + 6) % 7;
  const firstMondayDate = 1 + ((7 - firstDow) % 7);
  const weekIdx = Math.floor((d.getDate() - firstMondayDate) / 7) + 1;
  return `${month}월 ${Math.max(1, weekIdx)}주차`;
}
function monthLabel(mk: string): string {
  const [y, m] = mk.split("-");
  return `${y.slice(2)}년 ${parseInt(m, 10)}월`;
}
function yearLabel(year: string): string {
  return `${year.slice(2)}년`;
}

interface AggRow {
  date: string;
  tokens: number;
  cost: number;
}

function aggregateByPeriod(points: Point[], granularity: Granularity): AggRow[] {
  const keyFn =
    granularity === "weekly" ? weekStartKey : granularity === "monthly" ? monthKey : localDateKey;
  const map = new Map<string, { tokens: number; cost: number }>();
  for (const p of points) {
    const key = keyFn(p.ts);
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

function todayLabel(): string {
  const d = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} (${days[d.getDay()]})`;
}

const DAILY_CARD_LIMIT: Partial<Record<Range, number>> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
};

export function Dashboard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [dailyRange, setDailyRange] = useState<Range>("7d");
  const [dailyGranularity, setDailyGranularity] = useState<Granularity>("daily");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [dailyMetric, setDailyMetric] = useState<"tokens" | "cost">("tokens");
  const [dailyView, setDailyView] = useState<"chart" | "list">("chart");
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(() => new Date());
  const [, setTick] = useState(0);

  // 1초마다 lastSync 상대시간 갱신.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data: summary30 } = useSummary("30d");
  const { data: summary7 } = useSummary("7d");
  const { data: summary1 } = useSummary("1d");
  const { data: tsDaily } = useTimeseries(dailyRange);
  const { data: tsMonth } = useTimeseries("30d");
  const { data: tsAll } = useTimeseries("all");
  const { data: heatmap } = useHeatmap(56);
  const { data: oauthResp } = useOAuthUsage();
  const oauthUsage = oauthResp?.data ?? null;
  const oauthError = oauthResp?.error ?? null;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["summary"] }),
        qc.invalidateQueries({ queryKey: ["timeseries"] }),
        qc.invalidateQueries({ queryKey: ["heatmap"] }),
        refreshOAuthUsage().then((r) => qc.setQueryData(["oauthUsage"], r)),
      ]);
      setLastSync(new Date());
    } finally {
      setRefreshing(false);
    }
  }

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const p of tsAll ?? []) set.add(monthKey(p.ts));
    return Array.from(set).sort().reverse();
  }, [tsAll]);
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const p of tsAll ?? []) set.add(yearKey(p.ts));
    return Array.from(set).sort().reverse();
  }, [tsAll]);

  useEffect(() => {
    if (
      dailyGranularity === "weekly" &&
      availableMonths.length > 0 &&
      !availableMonths.includes(selectedMonth)
    ) {
      setSelectedMonth(availableMonths[0]);
    }
    if (
      dailyGranularity === "monthly" &&
      availableYears.length > 0 &&
      !availableYears.includes(selectedYear)
    ) {
      setSelectedYear(availableYears[0]);
    }
  }, [dailyGranularity, availableMonths, availableYears, selectedMonth, selectedYear]);

  const dailyAggregated = useMemo<AggRow[]>(() => {
    if (dailyGranularity === "daily") {
      return aggregateByPeriod(tsDaily ?? [], "daily");
    }
    if (dailyGranularity === "weekly") {
      const all = aggregateByPeriod(tsAll ?? [], "weekly");
      return all.filter(
        (w) => monthKey(new Date(w.date + "T00:00:00").getTime()) === selectedMonth,
      );
    }
    return aggregateByPeriod(tsAll ?? [], "monthly").filter((m) =>
      m.date.startsWith(selectedYear + "-"),
    );
  }, [dailyGranularity, tsDaily, tsAll, selectedMonth, selectedYear]);

  const dailyLimit = DAILY_CARD_LIMIT[dailyRange] ?? 30;
  const dailyRows =
    dailyGranularity === "daily"
      ? dailyAggregated.slice(-dailyLimit)
      : dailyAggregated;

  // 7d 합산 / 월간 합산.
  const thisWeek = useMemo(() => calcRange(tsMonth ?? [], "this-week"), [tsMonth]);
  const monthToDate = useMemo(() => calcRange(tsMonth ?? [], "this-month"), [tsMonth]);

  // 7일 sparkline (오늘 포함 마지막 7일).
  const sparkValues = useMemo(() => {
    const agg = aggregateByPeriod(tsMonth ?? [], "daily").slice(-7);
    return agg.map((a) => a.tokens);
  }, [tsMonth]);

  if (!summary1 || !summary7 || !summary30) {
    return (
      <div className="grid place-items-center h-64 text-text-tertiary text-[13px]">
        불러오는 중...
      </div>
    );
  }

  const sumIO = (s: typeof summary1) =>
    s.total_input_tokens + s.total_output_tokens + s.total_cache_read + s.total_cache_write;
  const sumCache = (s: typeof summary1) => s.total_cache_read + s.total_cache_write;

  const todayTokens = sumIO(summary1);
  const todayCache = sumCache(summary1);
  const todayCost = summary1.total_cost_usd;
  const weekAvgDailyTokens = sumIO(summary7) / 7;
  const todayVsWeek = pctDiff(todayTokens, weekAvgDailyTokens);
  const todayMessages = summary1.message_count;
  const todaySessions = summary1.session_count;

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
  const monthlyUsage = Math.min(1, monthToDate.tokens / 15_000_000_000);

  // 활동일 / 평균 일일 토큰 (최근 8주 = 56일)
  const activeDays = (heatmap ?? []).filter((d) => d.count > 0).length;
  const avgDailyTokens =
    (heatmap ?? []).length > 0
      ? sumIO(summary30) / Math.max(1, (heatmap ?? []).filter((d) => d.count > 0).length || 30)
      : 0;

  const toolItems = summary7.by_source
    .map((s) => ({ label: s.source, value: s.cost_usd }))
    .sort((a, b) => b.value - a.value);
  const modelItems = summary7.by_model
    .map((m) => ({
      label: m.model.replace("claude-", ""),
      value: m.input_tokens + m.output_tokens,
    }))
    .sort((a, b) => b.value - a.value);

  function copyDailyToClipboard() {
    const lines = [
      ["Date", dailyMetric === "tokens" ? "Tokens" : "Cost (USD)"].join("\t"),
      ...dailyRows.map((d) =>
        [d.date, dailyMetric === "tokens" ? d.tokens : d.cost.toFixed(4)].join("\t"),
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
  }

  function exportCsv() {
    const lines = [
      ["Date", "Tokens", "Cost USD"].join(","),
      ...dailyRows.map((d) =>
        [d.date, String(d.tokens), d.cost.toFixed(4)].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `madup-token-monitor-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const todayDeltaUp = todayVsWeek >= 0;

  return (
    <div className="px-7 pt-6 pb-8">
      {/* Content head */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-text-primary">
            {t("nav.dashboard")}
          </h1>
          <p className="num text-[12px] text-text-tertiary mt-1 whitespace-nowrap">
            {todayLabel()} · 마지막 동기화 {formatRelativeShort(Date.now() - lastSync.getTime())} 전
          </p>
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <button onClick={exportCsv} className="mc-btn-outline">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 2v8M5 7l3 3 3-3M2 13h12" />
            </svg>
            내보내기
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="mc-btn-primary disabled:opacity-70"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={refreshing ? "animate-spin" : undefined}
            >
              <path d="M2 8a6 6 0 0110.3-4.2L14 2v4h-4M14 8a6 6 0 01-10.3 4.2L2 14v-4h4" />
            </svg>
            {refreshing ? "동기화 중…" : "새로고침"}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* ============ ROW 1: Today (col-8 feature) ============ */}
        <section className="mc-card-feature col-span-8">
          <header className="flex items-center justify-between mb-3.5 gap-3 relative">
            <span className="mc-eyebrow">오늘 · DAILY</span>
            <div className="flex items-center gap-2">
              {weekAvgDailyTokens > 0 && (
                <span className={todayDeltaUp ? "mc-delta-up" : "mc-delta-down"}>
                  {todayDeltaUp ? "+" : "−"}
                  {Math.abs(todayVsWeek * 100).toFixed(0)}% vs 7d 평균
                </span>
              )}
            </div>
          </header>

          <div className="grid grid-cols-[1fr_220px] gap-6 items-start">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2.5">
                <span className="num text-[48px] font-medium leading-none tracking-[-0.02em] text-azure">
                  {formatTokensCompact(todayTokens)}
                </span>
                <span className="text-[13px] text-text-secondary">
                  tokens · <span className="num">{formatTokensCompact(todayCache)}</span> cached
                </span>
              </div>
              <p className="text-[12px] text-text-tertiary mt-2.5 leading-snug">
                입력 + 출력 + 캐시 read/write 합산. Claude API 청구 기준.
              </p>

              <div className="mt-6 grid grid-cols-4 gap-4 pt-5 border-t border-hairline">
                <TodayStat
                  label="비용"
                  value={formatUSD(todayCost)}
                  sub={<span className="num">{formatKRW(todayCost)}</span>}
                  color="amber"
                />
                <TodayStat
                  label="요청"
                  value={todayMessages.toLocaleString("ko-KR")}
                  sub="건"
                  color="azure"
                />
                <TodayStat
                  label="세션"
                  value={String(todaySessions)}
                  sub="개"
                  color="violet"
                />
                <TodayStat
                  label="활성 사용자"
                  value="1"
                  sub="기기 1대"
                  color="lime"
                />
              </div>
            </div>

            <div
              className="rounded-[10px] border border-hairline p-3.5 pb-2.5"
              style={{ background: "var(--color-surface-2)" }}
            >
              <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-text-tertiary mb-1.5">
                최근 7일 추이
              </div>
              <div className="text-[15px] font-medium text-text-primary mb-1">
                <span className="num">
                  {formatTokensCompact(sparkValues[sparkValues.length - 1] ?? 0)}
                </span>{" "}
                <span className="text-text-tertiary text-[11px]">↘ 오늘</span>
              </div>
              <Sparkline values={sparkValues} width={190} height={84} />
              <div className="flex justify-between num text-[9.5px] text-text-faint mt-1">
                {(() => {
                  const last7 = aggregateByPeriod(tsMonth ?? [], "daily").slice(-7);
                  const first = last7[0]?.date.slice(5) ?? "";
                  const mid = last7[Math.floor(last7.length / 2)]?.date.slice(5) ?? "";
                  const lastEnd = last7[last7.length - 1]?.date.slice(5) ?? "";
                  return (
                    <>
                      <span>{first}</span>
                      <span>{mid}</span>
                      <span>{lastEnd}</span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </section>

        {/* ============ ROW 1: Quota (col-4) ============ */}
        <section className="mc-card col-span-4">
          <header className="flex items-center justify-between mb-3.5 gap-3 relative">
            <span className="text-[15px] font-semibold text-text-primary tracking-[-0.005em]">
              사용량 한도
            </span>
            <span
              className="inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
              style={{
                background: hasRealQuota ? "var(--color-azure-soft)" : "var(--color-surface-2)",
                color: hasRealQuota ? "var(--color-azure-bright)" : "var(--color-text-tertiary)",
              }}
              title={oauthError ?? undefined}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: hasRealQuota ? "var(--color-azure)" : "var(--color-text-faint)",
                }}
              />
              {hasRealQuota
                ? `OAuth 실시간${oauthUsage?.is_stale ? " (캐시)" : ""}`
                : oauthError
                  ? "오류"
                  : "추정값"}
            </span>
          </header>

          <QuotaRow
            name="세션"
            sub="(5h)"
            meta={`Resets in ${formatRelativeTime(sessionResetMs)}`}
            value={sessionUsage}
          />
          <QuotaRow
            name="주간 한도"
            meta={`Resets in ${formatRelativeTime(weeklyResetMs)}`}
            value={weeklyUsage}
          />
          <QuotaRow
            name="월간 누적"
            meta={`이번 달 ${new Date().getMonth() + 1}/1~`}
            value={monthlyUsage}
          />

          <div className="mt-5 pt-3.5 border-t border-hairline flex justify-between items-center">
            <span className="text-[11px] text-text-tertiary">
              {formatRelativeShort(Date.now() - lastSync.getTime())} 전 동기화됨
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-hairline bg-surface-2 text-text-secondary text-[11.5px] font-medium hover:text-text-primary hover:border-hairline-strong transition-colors disabled:opacity-60"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                className={refreshing ? "animate-spin" : undefined}
              >
                <path d="M2 8a6 6 0 0110.3-4.2L14 2v4h-4M14 8a6 6 0 01-10.3 4.2L2 14v-4h4" />
              </svg>
              새로고침
            </button>
          </div>
        </section>

        {/* ============ ROW 2: Daily breakdown (col-8) ============ */}
        <section className="mc-card col-span-8">
          <header className="flex items-center justify-between mb-3.5 gap-3 relative flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-text-primary tracking-[-0.005em]">
                기간별 사용량
              </span>
              <Select
                value={dailyGranularity}
                onChange={(v) => setDailyGranularity(v as Granularity)}
                options={GRANULARITIES}
                ariaLabel="단위 선택"
              />
              {dailyGranularity === "daily" ? (
                <Select
                  value={dailyRange}
                  onChange={(v) => setDailyRange(v as Range)}
                  options={RANGES.map((r) => ({ value: r.value, label: t(r.label) }))}
                  ariaLabel="기간 선택"
                />
              ) : dailyGranularity === "weekly" ? (
                <Select
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  options={availableMonths.map((m) => ({ value: m, label: monthLabel(m) }))}
                  ariaLabel="월 선택"
                />
              ) : (
                <Select
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={availableYears.map((y) => ({ value: y, label: yearLabel(y) }))}
                  ariaLabel="년 선택"
                />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Segmented
                value={dailyMetric}
                onChange={setDailyMetric}
                options={[
                  { value: "tokens", label: "Tokens" },
                  { value: "cost", label: "Cost" },
                ]}
                ariaLabel="지표 선택"
              />
              <Segmented
                value={dailyView}
                onChange={setDailyView}
                options={[
                  { value: "chart", label: "Chart" },
                  { value: "list", label: "List" },
                ]}
                ariaLabel="보기 전환"
              />
            </div>
          </header>

          <div
            className="rounded-[10px] border border-hairline p-4"
            style={{ background: "var(--color-surface-2)" }}
          >
            {dailyView === "chart" ? (
              <DailyBarChart
                data={dailyRows.map((d) => ({
                  date:
                    dailyGranularity === "weekly"
                      ? weekLabel(d.date)
                      : dailyGranularity === "monthly"
                        ? monthLabel(d.date)
                        : d.date.slice(5),
                  tokens: d.tokens,
                  cost: d.cost,
                }))}
                metric={dailyMetric}
                highlightLast={dailyGranularity === "daily"}
              />
            ) : (
              <div className="max-h-[280px] overflow-y-auto -mx-2">
                {dailyRows.length === 0 ? (
                  <p className="text-[12px] text-text-tertiary py-4 text-center">
                    {t("dashboard.empty")}
                  </p>
                ) : (
                  dailyRows.map((d, i) => {
                    const v = dailyMetric === "tokens" ? d.tokens : d.cost;
                    const empty = v === 0;
                    return (
                      <div
                        key={d.date}
                        className={`flex items-center justify-between px-2 py-2 ${
                          i > 0 ? "border-t border-hairline" : ""
                        } ${empty ? "opacity-50" : ""}`}
                      >
                        <span className="num text-[12px] text-text-secondary font-medium whitespace-nowrap">
                          {dailyGranularity === "weekly"
                            ? weekLabel(d.date)
                            : dailyGranularity === "monthly"
                              ? monthLabel(d.date)
                              : d.date}
                        </span>
                        <div className="flex items-center gap-3 flex-1 ml-3">
                          <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: empty ? "0%" : `${Math.max(2, (v / Math.max(...dailyRows.map((x) => (dailyMetric === "tokens" ? x.tokens : x.cost)), 1)) * 100)}%`,
                                background:
                                  "linear-gradient(90deg, var(--color-azure-deep), var(--color-azure))",
                              }}
                            />
                          </div>
                          <span
                            className={`num text-[13px] font-medium whitespace-nowrap ${empty ? "text-text-faint" : "text-azure"}`}
                          >
                            {empty
                              ? "—"
                              : dailyMetric === "tokens"
                                ? formatTokensCompact(d.tokens)
                                : formatUSD(d.cost)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-3.5">
            <div className="flex gap-3.5 text-[11px] text-text-tertiary">
              <Legend swatch="var(--color-azure)" label="Tokens (입력+출력+캐시)" />
              <Legend swatch="var(--color-violet)" label="오늘" />
              <Legend
                swatch="var(--color-amber)"
                label="평균"
                shape="line"
              />
            </div>
            <button
              onClick={copyDailyToClipboard}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-hairline bg-surface-2 text-text-secondary text-[11.5px] font-medium hover:text-text-primary hover:border-hairline-strong transition-colors"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <rect x="2" y="2" width="9" height="9" rx="1" />
                <path d="M5 5h6v6" />
              </svg>
              Copy
            </button>
          </div>
        </section>

        {/* ============ ROW 2: Activity heatmap (col-4) ============ */}
        <section className="mc-card col-span-4">
          <header className="flex items-center justify-between mb-3.5 gap-3 relative">
            <span className="text-[15px] font-semibold text-text-primary tracking-[-0.005em]">
              활동{" "}
              <span className="text-text-tertiary font-normal text-[12px] ml-1">
                최근 8주
              </span>
            </span>
          </header>

          <HeatMap data={heatmap ?? []} weeks={8} />

          <div className="mt-5 pt-3.5 border-t border-hairline grid grid-cols-2 gap-3.5">
            <div>
              <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-text-tertiary mb-1.5">
                평균 일일 토큰
              </div>
              <div className="num text-[20px] font-medium text-text-primary">
                {formatTokensCompact(avgDailyTokens)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-text-tertiary mb-1.5">
                활동일
              </div>
              <div className="num text-[20px] font-medium text-lime">
                {activeDays}/56
              </div>
            </div>
          </div>
        </section>

        {/* ============ ROW 3: 4 col-3 cards ============ */}
        <MiniStatCard
          eyebrow="이번 주 · 월~일"
          value={formatTokensCompact(thisWeek.tokens)}
          suffix="tokens"
          subline={
            <>
              <span className="num text-text-secondary">
                {formatTokensCompact(thisWeek.cache)}
              </span>{" "}
              cached · {thisWeek.days}일 활동
            </>
          }
          foot={[
            { label: "비용", value: formatUSD(thisWeek.cost) },
            {
              label: "입력",
              value: formatPercent(thisWeek.totalInput / Math.max(1, thisWeek.tokens)),
            },
          ]}
        />

        <MiniStatCard
          eyebrow={`이번 달 · ${new Date().getMonth() + 1}월 1일~`}
          value={formatTokensCompact(monthToDate.tokens)}
          suffix="tokens"
          subline={
            <>
              <span className="num text-text-secondary">
                {formatTokensCompact(monthToDate.cache)}
              </span>{" "}
              cached · {monthToDate.days}일 활동
            </>
          }
          foot={[
            { label: "비용", value: formatUSD(monthToDate.cost) },
            {
              label: "입력",
              value: formatPercent(monthToDate.totalInput / Math.max(1, monthToDate.tokens)),
            },
          ]}
        />

        <section className="mc-card col-span-3">
          <header className="mb-3.5">
            <span className="mc-eyebrow">도구별 비용 · 7일</span>
          </header>
          <MiniBarList
            items={toolItems}
            formatValue={(v) => formatUSD(v)}
            emphasizeMax="amber"
          />
        </section>

        <section className="mc-card col-span-3">
          <header className="mb-3.5">
            <span className="mc-eyebrow">모델별 토큰 · 7일</span>
          </header>
          <MiniBarList
            items={modelItems}
            formatValue={(v) => formatTokensCompact(v)}
            emphasizeMax="azure"
          />
        </section>
      </div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function calcRange(
  ts: Point[],
  kind: "this-week" | "this-month",
): { tokens: number; cost: number; cache: number; days: number; totalInput: number } {
  if (ts.length === 0)
    return { tokens: 0, cost: 0, cache: 0, days: 0, totalInput: 0 };
  const now = new Date();
  let start: number;
  let end: number;
  if (kind === "this-week") {
    const dow = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dow);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    start = monday.getTime();
    end = sunday.getTime();
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    end = Date.now();
  }
  const filtered = ts.filter((p) => p.ts >= start && p.ts <= end);
  const dayKeys = new Set(filtered.map((p) => localDateKey(p.ts)));
  let tokens = 0,
    cost = 0,
    cache = 0,
    totalInput = 0;
  for (const p of filtered) {
    const cr = p.cache_read ?? 0;
    const cw = p.cache_write ?? 0;
    tokens += p.input_tokens + p.output_tokens + cr + cw;
    totalInput += p.input_tokens;
    cost += p.cost_usd;
    cache += cr + cw;
  }
  return { tokens, cost, cache, days: dayKeys.size, totalInput };
}

function formatRelativeShort(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}초`;
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}분`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3600_000)}시간`;
  return `${Math.floor(ms / 86_400_000)}일`;
}

interface TodayStatProps {
  label: string;
  value: string;
  sub: React.ReactNode;
  color: "amber" | "azure" | "violet" | "lime";
}
function TodayStat({ label, value, sub, color }: TodayStatProps) {
  const colorClass = {
    amber: "text-amber",
    azure: "text-azure",
    violet: "text-violet",
    lime: "text-lime",
  }[color];
  return (
    <div>
      <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-text-tertiary mb-2 whitespace-nowrap">
        {label}
      </div>
      <div className={`num text-[22px] font-medium leading-tight tracking-[-0.01em] ${colorClass}`}>
        {value}
      </div>
      <div className="text-[11px] text-text-tertiary mt-1">{sub}</div>
    </div>
  );
}

interface QuotaRowProps {
  name: string;
  sub?: string;
  meta: string;
  value: number;
}
function QuotaRow({ name, sub, meta, value }: QuotaRowProps) {
  const pct = (value * 100).toFixed(1);
  return (
    <div className="mt-4 first:mt-1">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="text-[13px] font-semibold text-text-primary whitespace-nowrap">
          {name}
          {sub && (
            <span className="font-normal text-text-tertiary text-[11px] ml-1.5">
              {sub}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-text-tertiary whitespace-nowrap shrink-0">
          <span>{meta}</span>
          <span className={`num text-[13px] font-medium ${quotaSignalClass(value)}`}>
            {pct}%
          </span>
        </div>
      </div>
      <QuotaSegBar value={value} />
    </div>
  );
}

interface MiniStatProps {
  eyebrow: string;
  value: string;
  suffix: string;
  subline: React.ReactNode;
  foot: { label: string; value: string }[];
}
function MiniStatCard({ eyebrow, value, suffix, subline, foot }: MiniStatProps) {
  return (
    <section className="mc-card col-span-3">
      <header className="mb-1">
        <span className="mc-eyebrow">{eyebrow}</span>
      </header>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="num text-[36px] font-medium leading-none tracking-[-0.02em] text-azure">
          {value}
        </span>
        <span className="text-[12px] text-text-secondary">{suffix}</span>
      </div>
      <div className="text-[11px] text-text-tertiary mt-1.5">{subline}</div>
      <div className="mt-3.5 pt-3 border-t border-hairline flex gap-3.5 text-[11px] text-text-tertiary">
        {foot.map((f) => (
          <span key={f.label}>
            <strong className="num text-text-secondary font-semibold mr-1">
              {f.value}
            </strong>
            {f.label}
          </span>
        ))}
      </div>
    </section>
  );
}

interface LegendProps {
  swatch: string;
  label: string;
  shape?: "square" | "line";
}
function Legend({ swatch, label, shape = "square" }: LegendProps) {
  return (
    <span className="flex items-center gap-1.5">
      {shape === "square" ? (
        <span
          className="w-2 h-2 rounded-[2px]"
          style={{ background: swatch }}
        />
      ) : (
        <span
          className="w-3.5 h-[1.5px] mt-px"
          style={{ background: swatch }}
        />
      )}
      {label}
    </span>
  );
}

// KpiCard import 사용처 없는 경우 빈 wrapper 임포트로 만들지 않게 leave-out:
// (실제로 KpiCard 는 future use 를 위해 export 만 됨.)
export const __kpi_card_in_use = KpiCard;
