export interface DailyUsage {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost_usd: number;
}

export interface ModelUsage {
  model: string;
  tokens: number;
  cost_usd: number;
}

export interface ToolUsage {
  tool: string;
  calls: number;
  cost_usd: number;
}

export interface McpUsage {
  name: string;
  calls: number;
}

export interface UsageSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_tokens: number;
  total_cost_usd: number;
  daily: DailyUsage[];
  by_model: ModelUsage[];
  by_tool: ToolUsage[];
  top_mcps: McpUsage[];
  team_top_mcps: McpUsage[];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDays(n: number): DailyUsage[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    const input = randomInt(50_000, 400_000);
    const output = randomInt(10_000, 80_000);
    const cache = randomInt(5_000, 100_000);
    return {
      date: d.toISOString().slice(0, 10),
      input_tokens: input,
      output_tokens: output,
      cache_tokens: cache,
      cost_usd: (input * 3 + output * 15 + cache * 0.3) / 1_000_000,
    };
  });
}

export function buildMockSummary(days: 1 | 7 | 30): UsageSummary {
  const daily = generateDays(days);
  const total_input_tokens = daily.reduce((s, d) => s + d.input_tokens, 0);
  const total_output_tokens = daily.reduce((s, d) => s + d.output_tokens, 0);
  const total_cache_tokens = daily.reduce((s, d) => s + d.cache_tokens, 0);
  const total_cost_usd = daily.reduce((s, d) => s + d.cost_usd, 0);

  return {
    total_input_tokens,
    total_output_tokens,
    total_cache_tokens,
    total_cost_usd,
    daily,
    by_model: [
      { model: "claude-opus-4-7", tokens: Math.floor(total_input_tokens * 0.4), cost_usd: total_cost_usd * 0.5 },
      { model: "claude-sonnet-4-6", tokens: Math.floor(total_input_tokens * 0.45), cost_usd: total_cost_usd * 0.35 },
      { model: "claude-haiku-4-5", tokens: Math.floor(total_input_tokens * 0.15), cost_usd: total_cost_usd * 0.15 },
    ],
    by_tool: [
      { tool: "Claude Code", calls: randomInt(200, 800), cost_usd: total_cost_usd * 0.6 },
      { tool: "Cursor", calls: randomInt(50, 200), cost_usd: total_cost_usd * 0.25 },
      { tool: "API Direct", calls: randomInt(10, 80), cost_usd: total_cost_usd * 0.15 },
    ],
    top_mcps: [
      { name: "mcp-atlassian", calls: randomInt(80, 300) },
      { name: "playwright", calls: randomInt(50, 200) },
      { name: "slack-bot", calls: randomInt(40, 150) },
      { name: "github", calls: randomInt(30, 120) },
      { name: "filesystem", calls: randomInt(20, 100) },
      { name: "postgres", calls: randomInt(15, 80) },
      { name: "google-drive", calls: randomInt(10, 60) },
      { name: "fetch", calls: randomInt(8, 50) },
      { name: "memory", calls: randomInt(5, 40) },
      { name: "sequential-thinking", calls: randomInt(3, 30) },
    ],
    team_top_mcps: [
      { name: "mcp-atlassian", calls: randomInt(500, 2000) },
      { name: "playwright", calls: randomInt(300, 1500) },
      { name: "slack-bot", calls: randomInt(200, 1200) },
      { name: "github", calls: randomInt(150, 1000) },
      { name: "filesystem", calls: randomInt(100, 800) },
      { name: "postgres", calls: randomInt(80, 600) },
      { name: "google-drive", calls: randomInt(60, 500) },
      { name: "fetch", calls: randomInt(40, 400) },
      { name: "memory", calls: randomInt(30, 300) },
      { name: "sequential-thinking", calls: randomInt(20, 200) },
    ],
  };
}
