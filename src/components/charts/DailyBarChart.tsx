import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DailyUsage } from "@/mocks/usageMock";
import { formatDate, formatTokens } from "@/lib/format";
import { useTranslation } from "react-i18next";

interface Props {
  data: DailyUsage[];
}

export function DailyBarChart({ data }: Props) {
  const { t } = useTranslation();
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    [t("dashboard.legend.input")]: d.input_tokens,
    [t("dashboard.legend.output")]: d.output_tokens,
    [t("dashboard.legend.cache")]: d.cache_tokens,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v: number) => formatTokens(v)} tick={{ fontSize: 11 }} width={60} />
        <Tooltip formatter={(v) => formatTokens(Number(v))} />
        <Legend />
        <Bar dataKey={t("dashboard.legend.input")} stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
        <Bar dataKey={t("dashboard.legend.output")} stackId="a" fill="hsl(var(--secondary))" />
        <Bar dataKey={t("dashboard.legend.cache")} stackId="a" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
