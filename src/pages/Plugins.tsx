import { useTopPlugins, useCompanyTopPlugins } from "@/hooks/useUsage";
import { MinimalBarList } from "@/components/MinimalBarList";

export function Plugins() {
  const { data: myPlugins, isFetching: myFetching } = useTopPlugins("30d");
  const { data: companyPlugins, isFetching: compFetching } =
    useCompanyTopPlugins(30);

  const refreshing = myFetching || compFetching;
  const myItems = (myPlugins ?? []).map((p) => ({
    label: p.plugin_id,
    value: p.count,
  }));
  const teamItems = (companyPlugins ?? []).map((p) => ({
    label: p.plugin_id,
    value: p.count,
  }));

  return (
    <div className="px-4 py-4 max-w-full space-y-5">
      <header>
        <div className="flex items-center justify-between mb-1">
          <p className="hp-eyebrow">Plugins · 30 days</p>
          {refreshing && (
            <span className="text-[10px] text-graphite italic">갱신 중…</span>
          )}
        </div>
        <h1 className="hp-display-md text-ink">활성 플러그인</h1>
      </header>

      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-4">
        <MinimalBarList
          title="내 플러그인 TOP 10"
          items={myItems}
          color="#0aa9c9"
          emptyMessage="활성 플러그인이 없습니다"
        />
      </section>

      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-4">
        <MinimalBarList
          title="사내 플러그인 TOP 10"
          items={teamItems}
          color="#f5a524"
          emptyMessage="팀 데이터 집계 중입니다"
        />
      </section>
    </div>
  );
}

export default Plugins;
