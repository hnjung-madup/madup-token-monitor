import { useTranslation } from "react-i18next";
import { useTopPlugins } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Plugins() {
  const { t } = useTranslation();
  const { data: plugins, isLoading } = useTopPlugins("30d");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-graphite text-sm">
        불러오는 중...
      </div>
    );
  }

  if (!plugins || plugins.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-graphite text-sm">
        {t("plugins.empty")}
      </div>
    );
  }

  const maxCount = Math.max(...plugins.map((p) => p.count), 1);

  return (
    <div className="px-10 py-10 max-w-[1366px] mx-auto space-y-8">
      <header>
        <p className="hp-eyebrow mb-3">Plugin Activity · 30 days</p>
        <h1 className="hp-display-lg text-ink">{t("plugins.title")}</h1>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plugins.map((plugin) => {
          const ratio = plugin.count / maxCount;
          return (
            <Card key={plugin.plugin_id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 normal-case tracking-normal text-ink !text-[14px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  {plugin.plugin_id}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="hp-display-md text-ink">
                  {plugin.count.toLocaleString("ko-KR")}
                </p>
                <p className="hp-caption text-graphite mt-1">
                  {t("plugins.totalCalls")}
                </p>
                <div className="mt-4 h-2 rounded-full bg-cloud overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default Plugins;
