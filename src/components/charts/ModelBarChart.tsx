import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ModelSummary } from "@/types/models";
import { formatTokens } from "@/lib/format";
import { tokens } from "@/lib/tokens";

interface Props {
  data: ModelSummary[];
}

export function ModelBarChart({ data }: Props) {
  const chartData = data.map((d) => ({
    model: d.model.replace("claude-", "").replace(/-\d.*/, ""),
    tokens: d.input_tokens + d.output_tokens,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={tokens.hairline} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatTokens(v)}
          tick={{ fontSize: 11, fill: tokens.graphite }}
        />
        <YAxis type="category" dataKey="model" tick={{ fontSize: 11, fill: tokens.charcoal }} width={80} />
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
        <Bar dataKey="tokens" fill={tokens.primary} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
