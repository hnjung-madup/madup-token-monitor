import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSummary, useTimeseries, useHeatmap } from "@/hooks/useUsage";
import { DailyBarChart } from "@/components/charts/DailyBarChart";
import { ToolDonutChart } from "@/components/charts/ToolDonutChart";
import { ModelBarChart } from "@/components/charts/ModelBarChart";
import { HeatMap } from "@/components/HeatMap";
import { SegmentedBar } from "@/components/SegmentedBar";
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

function PillTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-[12px] font-semibold rounded-full transition-colors ${
            value === o.value
              ? "bg-primary text-on-primary"
              : "text-charcoal hover:bg-cloud"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// 사용자가 의도한 토큰만 합산: input + output. cache는 시스템이 자동으로 다시 포함시키는
// 분량이라 "내 사용량" 직관과 맞지 않음 — cache는 별도 라벨로 보여준다.
function aggregateByDay(points: Point[]): { date: string; tokens: number; cost: number }[] {
  const map = new Map<string, { tokens: number; cost: number }>();
  for (const p of points) {
    const key = new Date(p.ts).toISOString().slice(0, 10);
    const cur = map.get(key) ?? { tokens: 0, cost: 0 };
    cur.tokens += p.input_tokens + p.output_tokens;
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
  const { data: heatmap } = useHeatmap(56);

  const dailyAggregated = useMemo(() => aggregateByDay(tsDaily ?? []), [tsDaily]);

  if (!summary1 || !summary7 || !summary30) {
    return (
      <div className="flex items-center justify-center h-64 text-graphite text-sm">
        불러오는 중...
      </div>
    );
  }

  // 사용자가 의도한 토큰 (input + output)만을 메인 숫자로 사용.
  // cache_read/cache_write는 시스템이 system prompt + history를 매 turn 재포함시키는
  // 분량이라 "내 사용량" 직관과 맞지 않음 — 별도 라벨로만 표시.
  const sumIO = (s: typeof summary1) => s.total_input_tokens + s.total_output_tokens;
  const sumCache = (s: typeof summary1) => s.total_cache_read + s.total_cache_write;

  const todayTokens = sumIO(summary1);
  const todayCache = sumCache(summary1);
  const todayCost = summary1.total_cost_usd;
  const weekAvgDailyTokens = sumIO(summary7) / 7;
  const todayVsWeek = pctDiff(todayTokens, weekAvgDailyTokens);

  const todayMessages = (tsDaily ?? []).filter(
    (p) => new Date(p.ts).toDateString() === new Date().toDateString(),
  ).length;
  const todaySessions = Math.max(1, Math.round(todayMessages / 4));

  // Quota mocks (Claude session/weekly limits not tracked yet) — input+output 기준
  const sessionUsage = Math.min(1, todayTokens / 50_000_000);
  const weeklyUsage = Math.min(1, sumIO(summary7) / 300_000_000);
  const sessionResetMs = 1 * 3600_000 + 3 * 60_000;
  const weeklyResetMs = 1 * 86_400_000 + 14 * 3600_000 + 53 * 60_000;

  const week = summary7;
  const month = summary30;

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
    <div className="px-8 py-8 space-y-6 max-w-[1200px] mx-auto">
      {/* HEADER ============================================ */}
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="hp-eyebrow mb-1.5">Token Insight</p>
          <h1 className="hp-display-md text-ink">{t("dashboard.title")}</h1>
        </div>
      </header>

      {/* TODAY CARD ============================================ */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-7">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite">
            오늘
          </p>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="hp-display-xl text-primary leading-none tabular-nums">
            {formatTokensCompact(todayTokens)}
          </span>
          <span className="hp-body text-graphite">tokens</span>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="hp-caption text-graphite">
            {formatTokensCompact(todayCache)} cached
          </span>
          {weekAvgDailyTokens > 0 && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
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

        <div className="mt-6 grid grid-cols-3 gap-6 pt-5 border-t border-hairline">
          <div>
            <p className="hp-caption-sm uppercase tracking-[0.12em] font-bold text-graphite">
              비용
            </p>
            <p className="hp-display-sm text-[#f5a524] mt-1 leading-none">
              {formatUSD(todayCost)}
            </p>
            <p className="hp-caption-sm text-graphite mt-1">{formatKRW(todayCost)}</p>
          </div>
          <div>
            <p className="hp-caption-sm uppercase tracking-[0.12em] font-bold text-graphite">
              요청
            </p>
            <p className="hp-display-sm text-primary mt-1 leading-none">
              {todayMessages.toLocaleString("ko-KR")}
            </p>
            <p className="hp-caption-sm text-graphite mt-1">건</p>
          </div>
          <div>
            <p className="hp-caption-sm uppercase tracking-[0.12em] font-bold text-graphite">
              세션
            </p>
            <p className="hp-display-sm text-primary mt-1 leading-none">
              {todaySessions}
            </p>
            <p className="hp-caption-sm text-graphite mt-1">개</p>
          </div>
        </div>
      </section>

      {/* USAGE QUOTA CARD ============================================ */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-7">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite">
            사용량 한도
          </p>
          <span className="text-[11px] text-graphite">Claude 구독 기준 (모의)</span>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="hp-body-emphasis text-ink">세션 (5h)</p>
              <div className="flex items-center gap-3">
                <span className="hp-caption text-graphite">
                  Resets in {formatRelativeTime(sessionResetMs)}
                </span>
                <span
                  className="text-[14px] font-bold tabular-nums text-[#f5a524]"
                >
                  {(sessionUsage * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <SegmentedBar value={sessionUsage} segments={12} color="amber" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="hp-body-emphasis text-ink">주간 한도</p>
              <div className="flex items-center gap-3">
                <span className="hp-caption text-graphite">
                  Resets in {formatRelativeTime(weeklyResetMs)}
                </span>
                <span
                  className="text-[14px] font-bold tabular-nums text-[#f5a524]"
                >
                  {(weeklyUsage * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <SegmentedBar value={weeklyUsage} segments={12} color="amber" />
          </div>
        </div>
      </section>

      {/* DAILY CARD ============================================ */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-7">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite">
            일자별
            <span className="ml-2 text-graphite">
              ({dailyRange === "1d" ? "1일" : dailyRange === "7d" ? "7일" : "30일"})
            </span>
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <PillTabs
              value={dailyRange}
              onChange={setDailyRange}
              options={RANGES.map((r) => ({ value: r.value, label: t(r.label) }))}
            />
            <PillTabs
              value={dailyMetric}
              onChange={setDailyMetric}
              options={[
                { value: "tokens", label: "Tokens" },
                { value: "cost", label: "Cost" },
              ]}
            />
            <PillTabs
              value={dailyView}
              onChange={setDailyView}
              options={[
                { value: "chart", label: "Chart" },
                { value: "list", label: "List" },
              ]}
            />
          </div>
        </div>

        {dailyView === "chart" ? (
          <DailyBarChart data={tsDaily ?? []} />
        ) : (
          <div className="divide-y divide-hairline max-h-[420px] overflow-y-auto">
            {dailyRows.length === 0 ? (
              <p className="hp-caption text-graphite py-4 text-center">
                {t("dashboard.empty")}
              </p>
            ) : (
              dailyRows.map((d) => {
                const value = dailyMetric === "tokens" ? d.tokens : d.cost;
                const empty = value === 0;
                return (
                  <div
                    key={d.date}
                    className={`flex items-center justify-between py-2.5 px-2 ${
                      empty ? "opacity-50" : ""
                    }`}
                  >
                    <span className="hp-caption font-mono text-charcoal">{d.date}</span>
                    <span
                      className={`text-[15px] font-bold tabular-nums ${
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

        <div className="flex justify-end mt-5">
          <button onClick={copyDailyToClipboard} className="hp-btn-ink !h-10 !px-5">
            Copy
          </button>
        </div>
      </section>

      {/* THIS WEEK / THIS MONTH ============================================ */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-6">
          <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite mb-2">
            이번 주
          </p>
          <p className="hp-display-lg text-primary leading-none tabular-nums">
            {formatTokensCompact(sumIO(week))}
          </p>
          <p className="hp-caption text-graphite mt-2">
            {formatTokensCompact(week.total_cache_read + week.total_cache_write)} cached
          </p>
          <p className="hp-caption text-charcoal mt-1">
            {formatUSD(week.total_cost_usd)} · {formatPercent(
              week.total_input_tokens / Math.max(1, sumIO(week))
            )} 입력
          </p>
        </div>

        <div className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-6">
          <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite mb-2">
            이번 달
          </p>
          <p className="hp-display-lg text-primary leading-none tabular-nums">
            {formatTokensCompact(sumIO(month))}
          </p>
          <p className="hp-caption text-graphite mt-2">
            {formatTokensCompact(month.total_cache_read + month.total_cache_write)} cached
          </p>
          <p className="hp-caption text-charcoal mt-1">
            {formatUSD(month.total_cost_usd)} · {formatPercent(
              month.total_input_tokens / Math.max(1, sumIO(month))
            )} 입력
          </p>
        </div>
      </section>

      {/* ACTIVITY 8 WEEKS ============================================ */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-7">
        <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite mb-4">
          활동 (8주)
        </p>
        <HeatMap data={heatmap ?? []} weeks={8} />
      </section>

      {/* SECONDARY: TOOL / MODEL ============================================ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-6">
          <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite mb-3">
            {t("dashboard.charts.toolCost")}
          </p>
          <ToolDonutChart data={summary7.by_source} />
        </div>
        <div className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-6">
          <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite mb-3">
            {t("dashboard.charts.modelUsage")}
          </p>
          <ModelBarChart data={summary7.by_model} />
        </div>
      </section>

    </div>
  );
}
