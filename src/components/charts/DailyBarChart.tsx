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
import type { Point } from "@/types/models";
import { formatTokens } from "@/lib/format";
import { useTranslation } from "react-i18next";

interface Props {
  data: Point[];
}

export function DailyBarChart({ data }: Props) {
  const { t } = useTranslation();
  const chartData = data.map((d) => ({
    date: new Date(d.ts).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    [t("dashboard.legend.input")]: d.input_tokens,
    [t("dashboard.legend.output")]: d.output_tokens,
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
        <Bar dataKey={t("dashboard.legend.output")} stackId="a" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
