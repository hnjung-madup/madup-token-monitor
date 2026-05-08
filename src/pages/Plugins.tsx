import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MOCK_PLUGINS = [
  { name: "mcp-atlassian", calls: 243, active: true },
  { name: "playwright", calls: 187, active: true },
  { name: "slack-bot", calls: 134, active: true },
  { name: "github", calls: 98, active: true },
  { name: "filesystem", calls: 76, active: true },
  { name: "postgres", calls: 54, active: false },
];

export function Plugins() {
  const { t } = useTranslation();

  const active = MOCK_PLUGINS.filter((p) => p.active);
  const inactive = MOCK_PLUGINS.filter((p) => !p.active);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">{t("plugins.title")}</h1>

      {active.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          {t("plugins.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((plugin) => (
            <Card key={plugin.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  {plugin.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{plugin.calls.toLocaleString("ko-KR")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("plugins.totalCalls")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-muted-foreground mt-4">비활성 플러그인</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inactive.map((plugin) => (
              <Card key={plugin.name} className="opacity-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />
                    {plugin.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{plugin.calls.toLocaleString("ko-KR")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("plugins.totalCalls")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
