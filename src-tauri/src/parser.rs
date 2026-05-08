use serde_json::Value;
use crate::models::{ToolCall, UsageEvent};
use crate::pricing::calc_cost_usd;

/// Parses accumulated JSONL text for `source` (claude|codex|opencode).
/// Returns (events, tool_calls). Incomplete trailing line is returned as `leftover`.
pub fn parse_jsonl(
    source: &str,
    text: &str,
    project: Option<&str>,
    session_id: Option<&str>,
) -> (Vec<UsageEvent>, Vec<ToolCall>, String) {
    let mut events = Vec::new();
    let mut calls = Vec::new();

    let mut lines = text.split('\n').peekable();
    let mut leftover = String::new();

    while let Some(line) = lines.next() {
        let is_last = lines.peek().is_none();
        let trimmed = line.trim();

        if trimmed.is_empty() {
            continue;
        }

        // Last line without trailing newline → keep as leftover
        if is_last && !text.ends_with('\n') {
            leftover = line.to_string();
            break;
        }

        let Ok(val) = serde_json::from_str::<Value>(trimmed) else {
            continue;
        };

        match source {
            "claude" => parse_claude_line(&val, source, project, session_id, &mut events, &mut calls),
            "codex" => parse_codex_line(&val, source, project, session_id, &mut events),
            "opencode" => parse_opencode_line(&val, source, project, session_id, &mut events),
            _ => {}
        }
    }

    (events, calls, leftover)
}

fn parse_claude_line(
    val: &Value,
    source: &str,
    project: Option<&str>,
    session_id: Option<&str>,
    events: &mut Vec<UsageEvent>,
    calls: &mut Vec<ToolCall>,
) {
    let ts = extract_ts(val);

    // Usage event from assistant message
    if val.get("type").and_then(Value::as_str) == Some("assistant") {
        if let Some(usage) = val.pointer("/message/usage") {
            let model = val
                .pointer("/message/model")
                .and_then(Value::as_str)
                .map(str::to_owned);
            let input_tokens = usage.get("input_tokens").and_then(Value::as_i64);
            let output_tokens = usage.get("output_tokens").and_then(Value::as_i64);
            let cache_read = usage
                .get("cache_read_input_tokens")
                .and_then(Value::as_i64)
                .unwrap_or(0);
            let cache_write = usage
                .get("cache_creation_input_tokens")
                .and_then(Value::as_i64)
                .unwrap_or(0);

            // dedup keys — same response that gets mirrored across worktrees
            // shares (message_id, request_id), so we use them as the unique tuple.
            let message_id = val
                .pointer("/message/id")
                .and_then(Value::as_str)
                .map(str::to_owned);
            let request_id = val
                .get("requestId")
                .and_then(Value::as_str)
                .map(str::to_owned);

            let cost_usd = model.as_deref().map(|m| {
                calc_cost_usd(
                    m,
                    input_tokens.unwrap_or(0),
                    output_tokens.unwrap_or(0),
                    cache_read,
                    cache_write,
                )
            });

            events.push(UsageEvent {
                id: None,
                source: source.to_owned(),
                model,
                ts,
                input_tokens,
                output_tokens,
                cache_read: Some(cache_read),
                cache_write: Some(cache_write),
                cost_usd,
                project: project.map(str::to_owned),
                session_id: session_id.map(str::to_owned),
                message_id,
                request_id,
            });
        }

        // tool_use entries inside content array
        if let Some(content) = val.pointer("/message/content").and_then(Value::as_array) {
            for item in content {
                if item.get("type").and_then(Value::as_str) == Some("tool_use") {
                    if let Some(name) = item.get("name").and_then(Value::as_str) {
                        let (mcp_server, plugin_id) = extract_mcp_plugin(name);
                        calls.push(ToolCall {
                            id: None,
                            source: source.to_owned(),
                            ts,
                            tool_name: name.to_owned(),
                            mcp_server,
                            plugin_id,
                        });
                    }
                }
            }
        }
    }
}

/// Extracts (mcp_server, plugin_id) from a tool name like `mcp__atlassian__jira_search`
/// or `mcp__dct-claude-plugin__some_tool`.
fn extract_mcp_plugin(name: &str) -> (Option<String>, Option<String>) {
    if !name.starts_with("mcp__") {
        return (None, None);
    }
    let rest = &name["mcp__".len()..];
    let parts: Vec<&str> = rest.splitn(2, "__").collect();
    let server = parts.first().map(|s| s.to_string());
    // Heuristic: plugin_id is the server name when it looks like a plugin package
    let plugin = server.clone().filter(|s| s.contains('-'));
    (server, plugin)
}

fn parse_codex_line(
    val: &Value,
    source: &str,
    project: Option<&str>,
    session_id: Option<&str>,
    events: &mut Vec<UsageEvent>,
) {
    let ts = extract_ts(val);
    if let Some(usage) = val.get("usage") {
        let model = val.get("model").and_then(Value::as_str).map(str::to_owned);
        let input_tokens = usage.get("prompt_tokens").and_then(Value::as_i64);
        let output_tokens = usage.get("completion_tokens").and_then(Value::as_i64);
        let cost_usd = model.as_deref().map(|m| {
            calc_cost_usd(m, input_tokens.unwrap_or(0), output_tokens.unwrap_or(0), 0, 0)
        });
        events.push(UsageEvent {
            id: None,
            source: source.to_owned(),
            model,
            ts,
            input_tokens,
            output_tokens,
            cache_read: Some(0),
            cache_write: Some(0),
            cost_usd,
            project: project.map(str::to_owned),
            session_id: session_id.map(str::to_owned),
            message_id: None,
            request_id: None,
        });
    }
}

fn parse_opencode_line(
    val: &Value,
    source: &str,
    project: Option<&str>,
    session_id: Option<&str>,
    events: &mut Vec<UsageEvent>,
) {
    let ts = extract_ts(val);
    // OpenCode uses similar schema to Codex; adapt as schema becomes known
    if let Some(usage) = val.get("usage").or_else(|| val.get("tokens")) {
        let model = val
            .get("model")
            .or_else(|| val.get("modelId"))
            .and_then(Value::as_str)
            .map(str::to_owned);
        let input_tokens = usage
            .get("input_tokens")
            .or_else(|| usage.get("prompt_tokens"))
            .and_then(Value::as_i64);
        let output_tokens = usage
            .get("output_tokens")
            .or_else(|| usage.get("completion_tokens"))
            .and_then(Value::as_i64);
        let cost_usd = model.as_deref().map(|m| {
            calc_cost_usd(m, input_tokens.unwrap_or(0), output_tokens.unwrap_or(0), 0, 0)
        });
        events.push(UsageEvent {
            id: None,
            source: source.to_owned(),
            model,
            ts,
            input_tokens,
            output_tokens,
            cache_read: Some(0),
            cache_write: Some(0),
            cost_usd,
            project: project.map(str::to_owned),
            session_id: session_id.map(str::to_owned),
            message_id: None,
            request_id: None,
        });
    }
}

fn extract_ts(val: &Value) -> i64 {
    // Try common timestamp fields
    val.get("timestamp")
        .or_else(|| val.get("ts"))
        .or_else(|| val.get("created_at"))
        .and_then(|v| {
            if let Some(s) = v.as_str() {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|dt| dt.timestamp_millis())
            } else {
                v.as_i64().map(|n| {
                    // Distinguish seconds vs milliseconds
                    if n < 10_000_000_000 { n * 1000 } else { n }
                })
            }
        })
        .unwrap_or_else(|| chrono::Utc::now().timestamp_millis())
}

#[cfg(test)]
mod tests {
    use super::*;

    const CLAUDE_LINE: &str = r#"{"type":"assistant","timestamp":"2024-01-15T10:00:00Z","message":{"model":"claude-3-5-sonnet-20241022","usage":{"input_tokens":100,"output_tokens":50,"cache_creation_input_tokens":10,"cache_read_input_tokens":5},"content":[{"type":"tool_use","name":"mcp__atlassian__jira_search","id":"t1"}]}}"#;

    const BROKEN_LINE: &str = r#"{"type":"assistant","broken_json":true"#;

    #[test]
    fn test_parse_claude_normal() {
        let text = format!("{CLAUDE_LINE}\n");
        let (events, calls, leftover) = parse_jsonl("claude", &text, Some("proj"), Some("sess1"));
        assert_eq!(events.len(), 1);
        assert_eq!(calls.len(), 1);
        assert!(leftover.is_empty());

        let e = &events[0];
        assert_eq!(e.input_tokens, Some(100));
        assert_eq!(e.output_tokens, Some(50));
        assert_eq!(e.cache_write, Some(10));
        assert_eq!(e.cache_read, Some(5));
        assert_eq!(e.model.as_deref(), Some("claude-3-5-sonnet-20241022"));

        let c = &calls[0];
        assert_eq!(c.tool_name, "mcp__atlassian__jira_search");
        assert_eq!(c.mcp_server.as_deref(), Some("atlassian"));
    }

    #[test]
    fn test_parse_broken_line_skipped() {
        let text = format!("{BROKEN_LINE}\n");
        let (events, calls, _) = parse_jsonl("claude", &text, None, None);
        assert!(events.is_empty());
        assert!(calls.is_empty());
    }

    #[test]
    fn test_partial_line_becomes_leftover() {
        // No trailing newline → last line is partial
        let text = format!("{CLAUDE_LINE}\n{BROKEN_LINE}");
        let (events, _, leftover) = parse_jsonl("claude", &text, None, None);
        assert_eq!(events.len(), 1);
        assert_eq!(leftover, BROKEN_LINE);
    }

    #[test]
    fn test_extract_mcp_plugin() {
        let (server, plugin) = extract_mcp_plugin("mcp__atlassian__jira_search");
        assert_eq!(server.as_deref(), Some("atlassian"));
        assert_eq!(plugin, None); // "atlassian" has no hyphen

        let (server2, plugin2) = extract_mcp_plugin("mcp__dct-claude-plugin__some_tool");
        assert_eq!(server2.as_deref(), Some("dct-claude-plugin"));
        assert_eq!(plugin2.as_deref(), Some("dct-claude-plugin"));

        let (s, p) = extract_mcp_plugin("Bash");
        assert_eq!(s, None);
        assert_eq!(p, None);
    }

    #[test]
    fn test_empty_text() {
        let (events, calls, leftover) = parse_jsonl("claude", "", None, None);
        assert!(events.is_empty());
        assert!(calls.is_empty());
        assert!(leftover.is_empty());
    }
}
