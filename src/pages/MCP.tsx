import { useTranslation } from "react-i18next";
import { useTopMcp, useCompanyTopMcp } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { McpBarChart } from "@/components/charts/McpBarChart";

export function MCP() {
  const { t } = useTranslation();
  const { data: myMcp, isLoading: myLoading } = useTopMcp("30d");
  const { data: companyMcp, isLoading: compLoading } = useCompanyTopMcp();

  if (myLoading || compLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        불러오는 중...
      </div>
    );
  }

  if (!myMcp || myMcp.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t("mcp.empty")}
      </div>
    );
  }

  const teamAvgMap = new Map(
    (companyMcp ?? []).map((m) => [m.mcp_server, Math.round(m.count / 10)])
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">{t("mcp.title")}</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("mcp.myTop10")}</CardTitle></CardHeader>
          <CardContent>
            <McpBarChart data={myMcp} avgData={companyMcp} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("mcp.teamTop10")}</CardTitle></CardHeader>
          <CardContent>
            {companyMcp && companyMcp.length > 0 ? (
              <McpBarChart data={companyMcp} color="hsl(var(--secondary))" />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                팀 데이터 집계 중 (W4 Supabase 연동 후 표시)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("mcp.vsAverage")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {myMcp.map((mcp) => {
              const teamAvg = teamAvgMap.get(mcp.mcp_server) ?? 0;
              const ratio = teamAvg > 0 ? mcp.count / teamAvg : 1;
              const isAbove = ratio >= 1;
              return (
                <div key={mcp.mcp_server} className="flex items-center gap-3 text-sm">
                  <span className="w-36 truncate text-muted-foreground">
                    {mcp.mcp_server.replace("mcp-", "")}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isAbove ? "bg-primary" : "bg-muted-foreground"}`}
                      style={{ width: `${Math.min(ratio * 50, 100)}%` }}
                    />
                  </div>
                  <span className={`w-16 text-right font-medium ${isAbove ? "text-primary" : "text-muted-foreground"}`}>
                    {isAbove ? "+" : ""}{((ratio - 1) * 100).toFixed(0)}%
                  </span>
                  <span className="w-20 text-right text-muted-foreground">
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
