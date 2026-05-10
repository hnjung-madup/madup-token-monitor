import { useTranslation } from "react-i18next";
import { useTopMcp, useCompanyTopMcp } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { McpBarChart } from "@/components/charts/McpBarChart";

export function MCP() {
  const { t } = useTranslation();
  const { data: myMcp, isLoading: myLoading, isFetching: myFetching } = useTopMcp("30d");
  const { data: companyMcp, isFetching: compFetching } = useCompanyTopMcp();

  // localStorage persist 덕분에 두 번째 진입부터는 myMcp가 즉시 채워짐.
  // 진짜 첫 진입(캐시 0건)일 때만 spinner를 보여주고, 그 외엔 옛 데이터를 즉시 + 백그라운드 refetch.
  const hasCachedData = !!myMcp;

  if (!hasCachedData && myLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-graphite text-sm">
        불러오는 중...
      </div>
    );
  }

  if (!myMcp || myMcp.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-graphite text-sm">
        {t("mcp.empty")}
      </div>
    );
  }

  const teamAvgMap = new Map(
    (companyMcp ?? []).map((m) => [m.mcp_server, Math.round(m.count / 10)])
  );
  const refreshing = myFetching || compFetching;

  return (
    <div className="px-10 py-10 space-y-10 max-w-[1366px] mx-auto">
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="hp-eyebrow mb-3">MCP Usage · 30 days</p>
          <h1 className="hp-display-lg text-ink">{t("mcp.title")}</h1>
          <p className="hp-body text-charcoal mt-3 max-w-2xl">
            내가 가장 많이 호출한 MCP 서버 TOP 10과 사내 평균을 비교해 보세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {refreshing && (
            <span className="text-[11px] text-graphite italic">갱신 중…</span>
          )}
          <span className="hp-badge-soft">Top 10 · Personal vs Team</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("mcp.myTop10")}</CardTitle>
          </CardHeader>
          <CardContent>
            <McpBarChart data={myMcp} avgData={companyMcp} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("mcp.teamTop10")}</CardTitle>
          </CardHeader>
          <CardContent>
            {companyMcp && companyMcp.length > 0 ? (
              <McpBarChart data={companyMcp} color="#1a1a1a" />
            ) : (
              <p className="hp-caption text-graphite py-8 text-center">
                팀 데이터 집계 중 (W4 Supabase 연동 후 표시)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("mcp.vsAverage")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myMcp.map((mcp) => {
              const teamAvg = teamAvgMap.get(mcp.mcp_server) ?? 0;
              const ratio = teamAvg > 0 ? mcp.count / teamAvg : 1;
              const isAbove = ratio >= 1;
              return (
                <div
                  key={mcp.mcp_server}
                  className="grid grid-cols-[160px_1fr_72px_88px] items-center gap-4 text-sm"
                >
                  <span className="truncate font-medium text-ink">
                    {mcp.mcp_server.replace("mcp-", "")}
                  </span>
                  <div className="h-2 rounded-full bg-cloud overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isAbove ? "bg-primary" : "bg-graphite"}`}
                      style={{ width: `${Math.min(ratio * 50, 100)}%` }}
                    />
                  </div>
                  <span
                    className={`text-right font-bold ${isAbove ? "text-primary" : "text-graphite"}`}
                  >
                    {isAbove ? "+" : ""}
                    {((ratio - 1) * 100).toFixed(0)}%
                  </span>
                  <span className="text-right text-graphite hp-caption">
                    {mcp.count} {t("mcp.calls")}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MCP;
