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
            let cache_creation_total = usage
                .get("cache_creation_input_tokens")
                .and_then(Value::as_i64)
                .unwrap_or(0);
            // cache_creation 안에 ephemeral_5m / ephemeral_1h 분리 필드가 있으면 사용,
            // 없으면 전체를 5m으로 간주 (기존 jsonl 호환).
            let cache_write_5m = usage
                .pointer("/cache_creation/ephemeral_5m_input_tokens")
                .and_then(Value::as_i64)
                .unwrap_or(0);
            let cache_write_1h = usage
                .pointer("/cache_creation/ephemeral_1h_input_tokens")
                .and_then(Value::as_i64)
                .unwrap_or(0);
            let (cw_5m, cw_1h) = if cache_write_5m + cache_write_1h > 0 {
                (cache_write_5m, cache_write_1h)
            } else {
                (cache_creation_total, 0)
            };
            let cache_write = cw_5m + cw_1h;

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
                    cw_5m,
                    cw_1h,
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
                cache_write_5m: Some(cw_5m),
                cache_write_1h: Some(cw_1h),
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
                        // Skill 도구는 name="Skill"이라 같은 ts 의 여러 Skill 호출이 unique
                        // index (source, ts, tool_name)에서 충돌해 dedup으로 사라진다.
                        // tool_name 에 input.skill 값을 붙여 고유성 확보 (e.g.
                        // "Skill:dct-claude-plugin:dct-job") + plugin_id 추출.
                        let (mcp_server, plugin_id, effective_name) = if name == "Skill" {
                            let skill = item.pointer("/input/skill").and_then(Value::as_str);
                            let plugin = skill
                                .and_then(|s| s.split_once(':'))
                                .map(|(p, _)| p.to_string());
                            let effective = match skill {
                                Some(s) => format!("Skill:{}", s),
                                None => name.to_string(),
                            };
                            (None, plugin, effective)
                        } else {
                            let (s, p) = extract_mcp_plugin(name);
                            (s, p, name.to_string())
                        };
                        calls.push(ToolCall {
                            id: None,
                            source: source.to_owned(),
                            ts,
                            tool_name: effective_name,
                            mcp_server,
                            plugin_id,
                        });
                    }
                }
            }
        }
    }
}

/// Extracts (mcp_server, plugin_id) from a tool name. Three known patterns:
///   1. `mcp__<server>__<tool>` — plain MCP server (e.g. mcp__atlassian__jira_search,
///      mcp__slack-bot__slack_post_message). plugin_id = None.
///   2. `mcp__plugin_<plugin-id>_t__<tool>` — Claude Code plugin exposed via MCP.
///      The `_t` suffix is generated by the Claude Code plugin loader.
///      plugin_id = `<plugin-id>` (e.g. "oh-my-claudecode").
///   3. `<plugin-id>:<command>` — Claude Code plugin slash command / skill (e.g.
///      `dct-claude-plugin:dct-complete`). mcp_server = None, plugin_id = `<plugin-id>`.
fn extract_mcp_plugin(name: &str) -> (Option<String>, Option<String>) {
    if let Some(rest) = name.strip_prefix("mcp__") {
        let parts: Vec<&str> = rest.splitn(2, "__").collect();
        let server = parts.first().map(|s| s.to_string());
        // Claude Code 플러그인 (plugin_<name>_t)은 외부 MCP 서버가 아니라 내부 plugin이므로
        // mcp_server에는 카운트하지 않고 plugin_id에만 넣는다 — MCP TOP 10에 안 잡히게.
        if let Some(plugin_name) = server.as_deref().and_then(parse_plugin_from_mcp_server) {
            return (None, Some(plugin_name));
        }
        // 플러그인 레지스트리에 server 이름이 있으면 (e.g. mcp__dct-claude-plugin__xxx) plugin로 카운트.
        // ~/.claude/plugins/cache 의 실제 설치 정보를 신뢰 — 이름 휴리스틱 보다 정확.
        if let Some(s) = server.as_ref() {
            if crate::plugins::known_plugin_ids().contains(s) {
                return (None, Some(s.clone()));
            }
        }
        return (server, None);
    }
    // Slash command / skill: pluginId:commandName
    if let Some((plugin_id, cmd)) = name.split_once(':') {
        if !plugin_id.is_empty() && !cmd.is_empty() && !plugin_id.contains(' ') {
            return (None, Some(plugin_id.to_string()));
        }
    }
    (None, None)
}

/// Returns Some(<plugin-id>) only for the Claude Code plugin convention
/// `plugin_<name>_t`. Plain MCP servers (with or without hyphens) are NOT plugins.
fn parse_plugin_from_mcp_server(server: &str) -> Option<String> {
    let stripped = server.strip_prefix("plugin_")?;
    let plugin_name = stripped.strip_suffix("_t")?;
    if plugin_name.is_empty() {
        None
    } else {
        Some(plugin_name.to_string())
    }
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
            calc_cost_usd(m, input_tokens.unwrap_or(0), output_tokens.unwrap_or(0), 0, 0, 0)
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
            cache_write_5m: Some(0),
            cache_write_1h: Some(0),
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
            calc_cost_usd(m, input_tokens.unwrap_or(0), output_tokens.unwrap_or(0), 0, 0, 0)
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
            cache_write_5m: Some(0),
            cache_write_1h: Some(0),
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
        // 1. Plain MCP server (no plugin)
        let (server, plugin) = extract_mcp_plugin("mcp__atlassian__jira_search");
        assert_eq!(server.as_deref(), Some("atlassian"));
        assert_eq!(plugin, None);

        // mcp-atlassian / slack-bot: hyphenated MCP server names are NOT plugins
        let (s_a, p_a) = extract_mcp_plugin("mcp__mcp-atlassian__jira_search");
        assert_eq!(s_a.as_deref(), Some("mcp-atlassian"));
        assert_eq!(p_a, None);
        let (s_b, p_b) = extract_mcp_plugin("mcp__slack-bot__slack_post_message");
        assert_eq!(s_b.as_deref(), Some("slack-bot"));
        assert_eq!(p_b, None);

        // 2. Claude Code plugin via MCP: mcp__plugin_<name>_t__<tool>
        // Claude Code 플러그인은 외부 MCP 서버가 아니므로 mcp_server는 None.
        let (server2, plugin2) =
            extract_mcp_plugin("mcp__plugin_oh-my-claudecode_t__list_omc_skills");
        assert_eq!(server2, None);
        assert_eq!(plugin2.as_deref(), Some("oh-my-claudecode"));

        // 3. Slash command / skill: <plugin-id>:<command>
        let (s_c, p_c) = extract_mcp_plugin("dct-claude-plugin:dct-complete");
        assert_eq!(s_c, None);
        assert_eq!(p_c.as_deref(), Some("dct-claude-plugin"));

        // Non-tool names
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
