import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ModelUsage } from "@/mocks/usageMock";
import { formatTokens } from "@/lib/format";

interface Props {
  data: ModelUsage[];
}

export function ModelBarChart({ data }: Props) {
  const chartData = data.map((d) => ({
    model: d.model.replace("claude-", "").replace(/-\d.*/, ""),
    tokens: d.tokens,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tickFormatter={(v: number) => formatTokens(v)} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="model" tick={{ fontSize: 11 }} width={80} />
        <Tooltip formatter={(v) => formatTokens(Number(v))} />
        <Bar dataKey="tokens" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
