use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use crate::models::{UsageEvent, ToolCall};

pub fn db_path() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("madup-token-monitor").join("data.db")
}

pub fn open() -> Result<Connection> {
    let path = db_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let conn = Connection::open(&path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS usage_events (
            id           INTEGER PRIMARY KEY,
            source       TEXT NOT NULL,
            model        TEXT,
            ts           INTEGER NOT NULL,
            input_tokens INTEGER,
            output_tokens INTEGER,
            cache_read   INTEGER,
            cache_write  INTEGER,
            cost_usd     REAL,
            project      TEXT,
            session_id   TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_usage_ts ON usage_events(ts);

        CREATE TABLE IF NOT EXISTS tool_calls (
            id        INTEGER PRIMARY KEY,
            source    TEXT,
            ts        INTEGER,
            tool_name TEXT,
            mcp_server TEXT,
            plugin_id TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tool_ts ON tool_calls(ts);",
    )
}

pub fn insert_usage_event(conn: &Connection, e: &UsageEvent) -> Result<()> {
    conn.execute(
        "INSERT INTO usage_events
            (source, model, ts, input_tokens, output_tokens, cache_read, cache_write, cost_usd, project, session_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![
            e.source, e.model, e.ts,
            e.input_tokens, e.output_tokens,
            e.cache_read, e.cache_write,
            e.cost_usd, e.project, e.session_id
        ],
    )?;
    Ok(())
}

pub fn insert_tool_call(conn: &Connection, t: &ToolCall) -> Result<()> {
    conn.execute(
        "INSERT INTO tool_calls (source, ts, tool_name, mcp_server, plugin_id)
         VALUES (?1,?2,?3,?4,?5)",
        params![t.source, t.ts, t.tool_name, t.mcp_server, t.plugin_id],
    )?;
    Ok(())
}

/// Returns unix-ms range for the given range string.
pub fn range_bounds(range: &str) -> (i64, i64) {
    let now = chrono::Utc::now().timestamp_millis();
    let day_ms = 86_400_000i64;
    let start = match range {
        "today" => {
            let today = chrono::Utc::now().date_naive();
            chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
                today.and_hms_opt(0, 0, 0).unwrap(),
                chrono::Utc,
            )
            .timestamp_millis()
        }
        "7d" => now - 7 * day_ms,
        "30d" => now - 30 * day_ms,
        _ => now - day_ms,
    };
    (start, now)
}
