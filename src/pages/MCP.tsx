import { useTopMcp, useCompanyTopMcp } from "@/hooks/useUsage";
import { MinimalBarList } from "@/components/MinimalBarList";

export function MCP() {
  const { data: myMcp, isFetching: myFetching } = useTopMcp("30d");
  const { data: companyMcp, isFetching: compFetching } = useCompanyTopMcp();

  const refreshing = myFetching || compFetching;
  const myItems = (myMcp ?? []).map((m) => ({
    label: m.mcp_server.replace("mcp-", ""),
    value: m.count,
  }));
  const teamItems = (companyMcp ?? []).map((m) => ({
    label: m.mcp_server.replace("mcp-", ""),
    value: m.count,
  }));

  return (
    <div className="px-4 py-4 space-y-5 max-w-full">
      <header>
        <div className="flex items-center justify-between mb-1">
          <p className="hp-eyebrow">MCP · 30 days</p>
          {refreshing && (
            <span className="text-[10px] text-graphite italic">갱신 중…</span>
          )}
        </div>
        <h1 className="hp-display-md text-ink">MCP 사용 분석</h1>
      </header>

      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-4">
        <MinimalBarList
          title="내 MCP TOP 10"
          items={myItems}
          color="#0aa9c9"
          emptyMessage="MCP 사용 기록이 없습니다"
        />
      </section>

      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-4">
        <MinimalBarList
          title="사내 MCP TOP 10"
          items={teamItems}
          color="#f5a524"
          emptyMessage="팀 데이터 집계 중입니다"
        />
      </section>
    </div>
  );
}

export default MCP;
