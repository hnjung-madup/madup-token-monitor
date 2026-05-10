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
            id              INTEGER PRIMARY KEY,
            source          TEXT NOT NULL,
            model           TEXT,
            ts              INTEGER NOT NULL,
            input_tokens    INTEGER,
            output_tokens   INTEGER,
            cache_read      INTEGER,
            cache_write     INTEGER,
            cache_write_5m  INTEGER,
            cache_write_1h  INTEGER,
            cost_usd        REAL,
            project         TEXT,
            session_id      TEXT,
            message_id      TEXT,
            request_id      TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_usage_ts ON usage_events(ts);
        -- ai-token-monitor와 동일한 dedup key. 같은 응답이 여러 jsonl에 미러되어도
        -- (message_id, request_id) 조합으로 한 번만 카운트.
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_usage_msg
            ON usage_events(message_id, request_id);

        CREATE TABLE IF NOT EXISTS tool_calls (
            id        INTEGER PRIMARY KEY,
            source    TEXT,
            ts        INTEGER,
            tool_name TEXT,
            mcp_server TEXT,
            plugin_id TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tool_ts ON tool_calls(ts);
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_tool_call
            ON tool_calls(source, ts, tool_name);",
    )?;

    // 기존 DB의 누락된 컬럼 추가 (idempotent)
    let _ = conn.execute("ALTER TABLE usage_events ADD COLUMN message_id TEXT", []);
    let _ = conn.execute("ALTER TABLE usage_events ADD COLUMN request_id TEXT", []);
    let _ = conn.execute("ALTER TABLE usage_events ADD COLUMN cache_write_5m INTEGER", []);
    let _ = conn.execute("ALTER TABLE usage_events ADD COLUMN cache_write_1h INTEGER", []);

    // 옛 (source, session_id, ts, model, tokens) UNIQUE INDEX는 약해서 중복 허용 — 제거
    let _ = conn.execute("DROP INDEX IF EXISTS uniq_usage_event", []);

    Ok(())
}

pub fn insert_usage_event(conn: &Connection, e: &UsageEvent) -> Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO usage_events
            (source, model, ts, input_tokens, output_tokens, cache_read, cache_write, cache_write_5m, cache_write_1h, cost_usd, project, session_id, message_id, request_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        params![
            e.source, e.model, e.ts,
            e.input_tokens, e.output_tokens,
            e.cache_read, e.cache_write,
            e.cache_write_5m, e.cache_write_1h,
            e.cost_usd, e.project, e.session_id,
            e.message_id, e.request_id,
        ],
    )?;
    Ok(())
}

pub fn insert_tool_call(conn: &Connection, t: &ToolCall) -> Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO tool_calls (source, ts, tool_name, mcp_server, plugin_id)
         VALUES (?1,?2,?3,?4,?5)",
        params![t.source, t.ts, t.tool_name, t.mcp_server, t.plugin_id],
    )?;
    Ok(())
}

/// Returns unix-ms range for the given range string.
/// 모든 range를 local timezone 자정 기준으로 통일 (사내 RPC date-based와 일치).
/// 7d = 오늘 포함 7일치(=오늘 자정 - 6일 = 6일 전 0시), 30d = 오늘 - 29일.
pub fn range_bounds(range: &str) -> (i64, i64) {
    use chrono::{Duration, Local, TimeZone};
    let now = chrono::Utc::now().timestamp_millis();
    let today_local = Local::now().date_naive();
    let midnight_ms = |d: chrono::NaiveDate| -> i64 {
        Local
            .from_local_datetime(&d.and_hms_opt(0, 0, 0).unwrap())
            .single()
            .map(|dt| dt.timestamp_millis())
            .unwrap_or(now)
    };
    let start = match range {
        "today" | "1d" => midnight_ms(today_local),
        "7d" => midnight_ms(today_local - Duration::days(6)),
        "30d" => midnight_ms(today_local - Duration::days(29)),
        _ => midnight_ms(today_local),
    };
    (start, now)
}
