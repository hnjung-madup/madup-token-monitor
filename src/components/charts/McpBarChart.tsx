import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { McpUsage } from "@/types/models";

interface Props {
  data: McpUsage[];
  avgData?: McpUsage[];
  color?: string;
}

export function McpBarChart({ data, avgData, color = "hsl(var(--primary))" }: Props) {
  const chartData = data.map((d) => {
    const avg = avgData?.find((a) => a.mcp_server === d.mcp_server);
    return {
      name: d.mcp_server.replace("mcp-", ""),
      calls: d.count,
      avg: avg ? Math.round(avg.count / 10) : undefined,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
        <Tooltip />
        {avgData && <ReferenceLine x={0} stroke="hsl(var(--border))" />}
        <Bar dataKey="calls" fill={color} radius={[0, 4, 4, 0]} name="내 호출" />
        {avgData && (
          <Bar dataKey="avg" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} name="팀 평균" opacity={0.6} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
