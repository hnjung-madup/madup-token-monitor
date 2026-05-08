import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { McpUsage } from "@/types/models";
import { tokens } from "@/lib/tokens";

interface Props {
  data: McpUsage[];
  avgData?: McpUsage[];
  color?: string;
}

export function McpBarChart({ data, avgData, color = tokens.primary }: Props) {
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
        <CartesianGrid strokeDasharray="3 3" stroke={tokens.hairline} />
        <XAxis type="number" tick={{ fontSize: 11, fill: tokens.graphite }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: tokens.charcoal }} width={100} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${tokens.hairline}`,
            background: tokens.canvas,
            color: tokens.ink,
            fontSize: 12,
          }}
        />
        <Bar dataKey="calls" fill={color} radius={[0, 3, 3, 0]} name="내 호출" />
        {avgData && (
          <Bar dataKey="avg" fill={tokens.primarySoft} radius={[0, 3, 3, 0]} name="팀 평균" />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
