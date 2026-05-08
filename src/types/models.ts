// W2 Rust models.rs 기준 TypeScript 타입 정의

export interface Summary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read: number;
  total_cache_write: number;
  total_cost_usd: number;
  total_cost_krw: number;
  by_source: SourceSummary[];
  by_model: ModelSummary[];
}

export interface SourceSummary {
  source: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface ModelSummary {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface Point {
  ts: number;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  cost_usd: number;
}

export interface McpUsage {
  mcp_server: string;
  count: number;
}

export interface PluginUsage {
  plugin_id: string;
  count: number;
}

export interface DayCount {
  date: string;
  count: number;
  cost_usd: number;
}

export type Range = "1d" | "7d" | "30d";

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  message_count: number;
  total_tokens: number;
  cost_usd: number;
}
