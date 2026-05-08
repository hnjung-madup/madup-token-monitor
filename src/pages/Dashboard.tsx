import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUsage } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyBarChart } from "@/components/charts/DailyBarChart";
import { ToolDonutChart } from "@/components/charts/ToolDonutChart";
import { ModelBarChart } from "@/components/charts/ModelBarChart";
import { HeatMap } from "@/components/HeatMap";
import { formatTokens, formatUSD, formatKRW, formatPercent } from "@/lib/format";

type Period = 1 | 7 | 30;

export function Dashboard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>(7);
  const { data, isLoading, error } = useUsage(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        불러오는 중...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t("dashboard.empty")}
      </div>
    );
  }

  const totalTokens = data.total_input_tokens + data.total_output_tokens + data.total_cache_tokens;
  const cacheEfficiency = totalTokens > 0 ? data.total_cache_tokens / totalTokens : 0;
  const inputRatio = totalTokens > 0 ? data.total_input_tokens / totalTokens : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("dashboard.title")}</h1>
        <Tabs value={String(period)} onValueChange={(v) => setPeriod(Number(v) as Period)}>
          <TabsList>
            <TabsTrigger value="1">{t("dashboard.period.today")}</TabsTrigger>
            <TabsTrigger value="7">{t("dashboard.period.week")}</TabsTrigger>
            <TabsTrigger value="30">{t("dashboard.period.month")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.cards.totalTokens")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatTokens(totalTokens)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              입력 {formatTokens(data.total_input_tokens)} / 출력 {formatTokens(data.total_output_tokens)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.cards.totalCost")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatUSD(data.total_cost_usd)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatKRW(data.total_cost_usd)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.cards.inputOutput")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(inputRatio)}</p>
            <p className="text-xs text-muted-foreground mt-1">입력 토큰 비중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.cards.cacheEfficiency")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(cacheEfficiency)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatTokens(data.total_cache_tokens)} 캐시</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.charts.dailyTokens")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyBarChart data={data.daily} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.charts.toolCost")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ToolDonutChart data={data.by_tool} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.charts.modelUsage")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ModelBarChart data={data.by_model} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.charts.activityHeatmap")}</CardTitle>
          </CardHeader>
          <CardContent>
            <HeatMap data={data.daily} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
