use rusqlite::Connection;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Serialize)]
struct UsageAggregate {
    user_id: String,
    date: String,
    source: String,
    total_input: i64,
    total_output: i64,
    total_cost_usd: f64,
}

#[derive(Debug, Serialize)]
struct McpUsage {
    user_id: String,
    date: String,
    mcp_server: String,
    count: i64,
}

#[derive(Debug, Serialize)]
struct PluginUsage {
    user_id: String,
    date: String,
    plugin_id: String,
    count: i64,
}

#[derive(Debug, Serialize)]
struct AggregatePayload {
    usage_aggregates: Vec<UsageAggregate>,
    mcp_usage: Vec<McpUsage>,
    plugin_usage: Vec<PluginUsage>,
}

fn read_local_aggregates(db_path: &str) -> Result<AggregatePayload, Box<dyn std::error::Error>> {
    let conn = Connection::open(db_path)?;

    // 토큰 카운트와 비용 합계만 — 원본 메시지/프롬프트 절대 업로드 금지
    let mut stmt = conn.prepare(
        "SELECT date, source,
                SUM(input_tokens) as total_input,
                SUM(output_tokens) as total_output,
                SUM(cost_usd) as total_cost_usd
         FROM usage_log
         GROUP BY date, source",
    )?;

    let usage_aggregates: Vec<UsageAggregate> = stmt
        .query_map([], |row| {
            Ok(UsageAggregate {
                user_id: String::new(), // Supabase에서 auth.uid()로 채움
                date: row.get(0)?,
                source: row.get(1)?,
                total_input: row.get(2)?,
                total_output: row.get(3)?,
                total_cost_usd: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut mcp_stmt = conn.prepare(
        "SELECT date, mcp_server, SUM(count) as count
         FROM mcp_usage_log
         GROUP BY date, mcp_server",
    )?;

    let mcp_usage: Vec<McpUsage> = mcp_stmt
        .query_map([], |row| {
            Ok(McpUsage {
                user_id: String::new(),
                date: row.get(0)?,
                mcp_server: row.get(1)?,
                count: row.get(2)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut plugin_stmt = conn.prepare(
        "SELECT date, plugin_id, SUM(count) as count
         FROM plugin_usage_log
         GROUP BY date, plugin_id",
    )?;

    let plugin_usage: Vec<PluginUsage> = plugin_stmt
        .query_map([], |row| {
            Ok(PluginUsage {
                user_id: String::new(),
                date: row.get(0)?,
                plugin_id: row.get(1)?,
                count: row.get(2)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(AggregatePayload {
        usage_aggregates,
        mcp_usage,
        plugin_usage,
    })
}

fn upsert_to_supabase(
    supabase_url: &str,
    anon_key: &str,
    access_token: &str,
    payload: &AggregatePayload,
) -> Result<(), Box<dyn std::error::Error>> {
    let client = ureq::AgentBuilder::new().build();
    let auth_header = format!("Bearer {}", access_token);

    let headers: HashMap<&str, &str> = HashMap::from([
        ("apikey", anon_key),
        ("Authorization", &auth_header),
        ("Content-Type", "application/json"),
        ("Prefer", "resolution=merge-duplicates"),
    ]);

    // usage_aggregates upsert
    if !payload.usage_aggregates.is_empty() {
        let mut req = client.post(&format!("{}/rest/v1/usage_aggregates", supabase_url));
        for (k, v) in &headers {
            req = req.set(k, v);
        }
        req.send_json(serde_json::to_value(&payload.usage_aggregates)?)?;
    }

    // mcp_usage upsert
    if !payload.mcp_usage.is_empty() {
        let mut req = client.post(&format!("{}/rest/v1/mcp_usage", supabase_url));
        for (k, v) in &headers {
            req = req.set(k, v);
        }
        req.send_json(serde_json::to_value(&payload.mcp_usage)?)?;
    }

    // plugin_usage upsert
    if !payload.plugin_usage.is_empty() {
        let mut req = client.post(&format!("{}/rest/v1/plugin_usage", supabase_url));
        for (k, v) in &headers {
            req = req.set(k, v);
        }
        req.send_json(serde_json::to_value(&payload.plugin_usage)?)?;
    }

    Ok(())
}

/// Tauri command: 즉시 집계 동기화 (share_consent=true인 경우만)
#[tauri::command]
pub async fn sync_aggregates_now(
    supabase_url: String,
    anon_key: String,
    access_token: String,
    db_path: String,
) -> Result<String, String> {
    let payload =
        read_local_aggregates(&db_path).map_err(|e| format!("DB read error: {}", e))?;

    upsert_to_supabase(&supabase_url, &anon_key, &access_token, &payload)
        .map_err(|e| format!("Supabase upsert error: {}", e))?;

    Ok(format!(
        "Synced: {} usage rows, {} mcp rows, {} plugin rows",
        payload.usage_aggregates.len(),
        payload.mcp_usage.len(),
        payload.plugin_usage.len()
    ))
}
