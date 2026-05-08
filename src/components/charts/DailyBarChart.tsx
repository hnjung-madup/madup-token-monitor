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
import { tokens } from "@/lib/tokens";

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
        <CartesianGrid strokeDasharray="3 3" stroke={tokens.hairline} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: tokens.graphite }} />
        <YAxis
          tickFormatter={(v: number) => formatTokens(v)}
          tick={{ fontSize: 11, fill: tokens.graphite }}
          width={60}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${tokens.hairline}`,
            background: tokens.canvas,
            color: tokens.ink,
            fontSize: 12,
          }}
          formatter={(v) => formatTokens(Number(v))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: tokens.charcoal }} />
        <Bar dataKey={t("dashboard.legend.input")} stackId="a" fill={tokens.primary} radius={[0, 0, 0, 0]} />
        <Bar dataKey={t("dashboard.legend.output")} stackId="a" fill={tokens.primaryDeep} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
