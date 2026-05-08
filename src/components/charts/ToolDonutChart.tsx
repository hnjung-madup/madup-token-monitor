import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ToolUsage } from "@/mocks/usageMock";
import { formatUSD } from "@/lib/format";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--muted-foreground))",
];

interface Props {
  data: ToolUsage[];
}

export function ToolDonutChart({ data }: Props) {
  const chartData = data.map((d) => ({ name: d.tool, value: d.cost_usd }));
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
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatUSD(Number(v))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
