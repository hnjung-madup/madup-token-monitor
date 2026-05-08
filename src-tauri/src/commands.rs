use rusqlite::params;
use crate::db::{open, range_bounds};
use crate::models::{DayCount, McpUsage, PluginUsage, Point, Summary, SourceSummary, ModelSummary};
use crate::pricing::usd_to_krw_rate;

#[tauri::command]
pub fn get_summary(range: String) -> Result<Summary, String> {
    let conn = open().map_err(|e| e.to_string())?;
    let (start, end) = range_bounds(&range);

    let mut stmt = conn
        .prepare(
            "SELECT source, model,
                    COALESCE(SUM(input_tokens),0),
                    COALESCE(SUM(output_tokens),0),
                    COALESCE(SUM(cache_read),0),
                    COALESCE(SUM(cache_write),0),
                    COALESCE(SUM(cost_usd),0.0)
             FROM usage_events
             WHERE ts BETWEEN ?1 AND ?2
             GROUP BY source, model",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![start, end], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, f64>(6)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut total_input = 0i64;
    let mut total_output = 0i64;
    let mut total_cache_read = 0i64;
    let mut total_cache_write = 0i64;
    let mut total_cost = 0f64;
    let mut source_map: std::collections::HashMap<String, SourceSummary> =
        std::collections::HashMap::new();
    let mut model_map: std::collections::HashMap<String, ModelSummary> =
        std::collections::HashMap::new();

    for row in rows.flatten() {
        let (source, model, inp, out, cr, cw, cost) = row;
        total_input += inp;
        total_output += out;
        total_cache_read += cr;
        total_cache_write += cw;
        total_cost += cost;

        let se = source_map.entry(source.clone()).or_insert(SourceSummary {
            source: source.clone(),
            input_tokens: 0,
            output_tokens: 0,
            cost_usd: 0.0,
        });
        se.input_tokens += inp;
        se.output_tokens += out;
        se.cost_usd += cost;

        if let Some(m) = model {
            let me = model_map.entry(m.clone()).or_insert(ModelSummary {
                model: m,
                input_tokens: 0,
                output_tokens: 0,
                cost_usd: 0.0,
            });
            me.input_tokens += inp;
            me.output_tokens += out;
            me.cost_usd += cost;
        }
    }

    // 메시지 / 세션 카운트는 별도 쿼리
    let message_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM usage_events WHERE ts BETWEEN ?1 AND ?2",
            params![start, end],
            |row| row.get(0),
        )
        .unwrap_or(0);
    let session_count: i64 = conn
        .query_row(
            "SELECT COUNT(DISTINCT session_id) FROM usage_events WHERE ts BETWEEN ?1 AND ?2 AND session_id IS NOT NULL",
            params![start, end],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let rate = usd_to_krw_rate();
    Ok(Summary {
        total_input_tokens: total_input,
        total_output_tokens: total_output,
        total_cache_read,
        total_cache_write,
        total_cost_usd: total_cost,
        total_cost_krw: total_cost * rate,
        message_count,
        session_count,
        by_source: source_map.into_values().collect(),
        by_model: model_map.into_values().collect(),
    })
}

#[tauri::command]
pub fn get_timeseries(range: String, source: Option<String>) -> Result<Vec<Point>, String> {
    let conn = open().map_err(|e| e.to_string())?;
    let (start, end) = range_bounds(&range);

    // Bucket by hour
    let sql = if source.is_some() {
        "SELECT (ts / 3600000) * 3600000 as bucket,
                COALESCE(SUM(input_tokens),0),
                COALESCE(SUM(output_tokens),0),
                COALESCE(SUM(cache_read),0),
                COALESCE(SUM(cache_write),0),
                COALESCE(SUM(cost_usd),0.0)
         FROM usage_events
         WHERE ts BETWEEN ?1 AND ?2 AND source = ?3
         GROUP BY bucket ORDER BY bucket"
    } else {
        "SELECT (ts / 3600000) * 3600000 as bucket,
                COALESCE(SUM(input_tokens),0),
                COALESCE(SUM(output_tokens),0),
                COALESCE(SUM(cache_read),0),
                COALESCE(SUM(cache_write),0),
                COALESCE(SUM(cost_usd),0.0)
         FROM usage_events
         WHERE ts BETWEEN ?1 AND ?2
         GROUP BY bucket ORDER BY bucket"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let map_row = |row: &rusqlite::Row| {
        Ok(Point {
            ts: row.get(0)?,
            input_tokens: row.get(1)?,
            output_tokens: row.get(2)?,
            cache_read: row.get(3)?,
            cache_write: row.get(4)?,
            cost_usd: row.get(5)?,
        })
    };

    let points: Vec<Point> = if let Some(src) = source {
        stmt.query_map(params![start, end, src], map_row)
    } else {
        stmt.query_map(params![start, end], map_row)
    }
    .map_err(|e| e.to_string())?
    .flatten()
    .collect();

    Ok(points)
}

#[tauri::command]
pub fn get_top_mcp(range: String) -> Result<Vec<McpUsage>, String> {
    let conn = open().map_err(|e| e.to_string())?;
    let (start, end) = range_bounds(&range);

    let mut stmt = conn
        .prepare(
            "SELECT mcp_server, COUNT(*) as cnt
             FROM tool_calls
             WHERE ts BETWEEN ?1 AND ?2 AND mcp_server IS NOT NULL
             GROUP BY mcp_server
             ORDER BY cnt DESC
             LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![start, end], |row| {
            Ok(McpUsage {
                mcp_server: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn get_top_plugins(range: String) -> Result<Vec<PluginUsage>, String> {
    let conn = open().map_err(|e| e.to_string())?;
    let (start, end) = range_bounds(&range);

    let mut stmt = conn
        .prepare(
            "SELECT plugin_id, COUNT(*) as cnt
             FROM tool_calls
             WHERE ts BETWEEN ?1 AND ?2 AND plugin_id IS NOT NULL
             GROUP BY plugin_id
             ORDER BY cnt DESC
             LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![start, end], |row| {
            Ok(PluginUsage {
                plugin_id: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn get_heatmap(days: Option<i64>) -> Result<Vec<DayCount>, String> {
    let conn = open().map_err(|e| e.to_string())?;
    let n = days.unwrap_or(30);
    let now = chrono::Utc::now().timestamp_millis();
    let start = now - n * 86_400_000;

    let mut stmt = conn
        .prepare(
            "SELECT date(ts / 1000, 'unixepoch') as day,
                    COUNT(*) as cnt,
                    COALESCE(SUM(cost_usd), 0.0)
             FROM usage_events
             WHERE ts >= ?1
             GROUP BY day
             ORDER BY day",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![start], |row| {
            Ok(DayCount {
                date: row.get(0)?,
                count: row.get(1)?,
                cost_usd: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    Ok(items)
}
