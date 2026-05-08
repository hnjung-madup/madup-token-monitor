use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageEvent {
    pub id: Option<i64>,
    pub source: String,
    pub model: Option<String>,
    pub ts: i64,
    pub input_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub cache_read: Option<i64>,
    pub cache_write: Option<i64>,
    pub cost_usd: Option<f64>,
    pub project: Option<String>,
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: Option<i64>,
    pub source: String,
    pub ts: i64,
    pub tool_name: String,
    pub mcp_server: Option<String>,
    pub plugin_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Summary {
    pub total_input_tokens: i64,
    pub total_output_tokens: i64,
    pub total_cache_read: i64,
    pub total_cache_write: i64,
    pub total_cost_usd: f64,
    pub total_cost_krw: f64,
    pub by_source: Vec<SourceSummary>,
    pub by_model: Vec<ModelSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceSummary {
    pub source: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelSummary {
    pub model: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    pub ts: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpUsage {
    pub mcp_server: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginUsage {
    pub plugin_id: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DayCount {
    pub date: String,
    pub count: i64,
    pub cost_usd: f64,
}
