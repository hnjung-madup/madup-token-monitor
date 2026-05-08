import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSummary, useTimeseries, useHeatmap } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyBarChart } from "@/components/charts/DailyBarChart";
import { ToolDonutChart } from "@/components/charts/ToolDonutChart";
import { ModelBarChart } from "@/components/charts/ModelBarChart";
import { HeatMap } from "@/components/HeatMap";
import { formatTokens, formatUSD, formatKRW, formatPercent } from "@/lib/format";
import type { Range } from "@/types/models";

const RANGES: { value: Range; label: string }[] = [
  { value: "1d", label: "dashboard.period.today" },
  { value: "7d", label: "dashboard.period.week" },
  { value: "30d", label: "dashboard.period.month" },
];

export function Dashboard() {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>("7d");

  const { data: summary, isLoading: sumLoading } = useSummary(range);
  const { data: timeseries, isLoading: tsLoading } = useTimeseries(range);
  const { data: heatmap, isLoading: hmLoading } = useHeatmap(30);

  const isLoading = sumLoading || tsLoading || hmLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        불러오는 중...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t("dashboard.empty")}
      </div>
    );
  }

  const totalTokens = summary.total_input_tokens + summary.total_output_tokens;
  const totalCache = summary.total_cache_read + summary.total_cache_write;
  const cacheEfficiency = (totalTokens + totalCache) > 0 ? totalCache / (totalTokens + totalCache) : 0;
  const inputRatio = totalTokens > 0 ? summary.total_input_tokens / totalTokens : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("dashboard.title")}</h1>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.value} value={r.value}>{t(r.label)}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>{t("dashboard.cards.totalTokens")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatTokens(totalTokens)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              입력 {formatTokens(summary.total_input_tokens)} / 출력 {formatTokens(summary.total_output_tokens)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("dashboard.cards.totalCost")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatUSD(summary.total_cost_usd)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatKRW(summary.total_cost_usd)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("dashboard.cards.inputOutput")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(inputRatio)}</p>
            <p className="text-xs text-muted-foreground mt-1">입력 토큰 비중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("dashboard.cards.cacheEfficiency")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(cacheEfficiency)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatTokens(totalCache)} 캐시</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t("dashboard.charts.dailyTokens")}</CardTitle></CardHeader>
          <CardContent>
            <DailyBarChart data={timeseries ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("dashboard.charts.toolCost")}</CardTitle></CardHeader>
          <CardContent>
            <ToolDonutChart data={summary.by_source} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("dashboard.charts.modelUsage")}</CardTitle></CardHeader>
          <CardContent>
            <ModelBarChart data={summary.by_model} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("dashboard.charts.activityHeatmap")}</CardTitle></CardHeader>
          <CardContent>
            <HeatMap data={heatmap ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
