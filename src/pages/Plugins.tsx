import { useTranslation } from "react-i18next";
import { useTopPlugins } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Plugins() {
  const { t } = useTranslation();
  const { data: plugins, isLoading } = useTopPlugins("30d");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        불러오는 중...
      </div>
    );
  }

  if (!plugins || plugins.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        {t("plugins.empty")}
      </div>
    );
  }

  const maxCount = Math.max(...plugins.map((p) => p.count), 1);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">{t("plugins.title")}</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plugins.map((plugin) => {
          const ratio = plugin.count / maxCount;
          return (
            <Card key={plugin.plugin_id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  {plugin.plugin_id}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{plugin.count.toLocaleString("ko-KR")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("plugins.totalCalls")}</p>
                <div className="mt-2 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
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
