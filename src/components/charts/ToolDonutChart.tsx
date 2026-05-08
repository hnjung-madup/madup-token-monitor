import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { SourceSummary } from "@/types/models";
import { formatUSD } from "@/lib/format";
import { tokens } from "@/lib/tokens";

// Tone-on-tone palette: primary family (primary → bright → soft → deep).
const DONUT_PALETTE = [
  tokens.primary,
  tokens.primaryBright,
  tokens.primaryDeep,
  tokens.primarySoft,
  tokens.stormSea,
] as const;

interface Props {
  data: SourceSummary[];
}

export function ToolDonutChart({ data }: Props) {
  const chartData = data.map((d) => ({ name: d.source, value: d.cost_usd }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={DONUT_PALETTE[i % DONUT_PALETTE.length]} stroke={tokens.canvas} strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${tokens.hairline}`,
            background: tokens.canvas,
            color: tokens.ink,
            fontSize: 12,
          }}
          formatter={(v) => formatUSD(Number(v))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: tokens.charcoal }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
