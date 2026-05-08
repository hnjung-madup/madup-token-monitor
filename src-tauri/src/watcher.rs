use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use rusqlite::Connection;
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use crate::db;
use crate::parser;

/// Per-file state: how many bytes we have already consumed.
type FileOffsets = Arc<Mutex<HashMap<PathBuf, u64>>>;
/// Per-file partial-line buffer.
type FileBuffers = Arc<Mutex<HashMap<PathBuf, String>>>;

pub struct FileWatcher {
    _watcher: RecommendedWatcher,
}

impl FileWatcher {
    pub fn start() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let offsets: FileOffsets = Arc::new(Mutex::new(HashMap::new()));
        let buffers: FileBuffers = Arc::new(Mutex::new(HashMap::new()));

        let offsets_c = Arc::clone(&offsets);
        let buffers_c = Arc::clone(&buffers);

        let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
            let Ok(event) = res else { return };
            match event.kind {
                EventKind::Create(_) | EventKind::Modify(_) => {
                    for path in &event.paths {
                        if path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
                            process_file(path, &offsets_c, &buffers_c);
                        }
                    }
                }
                _ => {}
            }
        })?;

        for dir in watch_dirs() {
            if dir.exists() {
                watcher.watch(&dir, RecursiveMode::Recursive)?;
                // Process existing files on startup
                process_existing_files(&dir, &offsets, &buffers);
            }
        }

        Ok(FileWatcher { _watcher: watcher })
    }
}

fn watch_dirs() -> Vec<PathBuf> {
    let home = home_dir();
    let mut dirs = vec![
        home.join(".claude").join("projects"),
        home.join(".codex").join("sessions"),
    ];

    // OpenCode: macOS uses ~/.local/share, Windows uses %LOCALAPPDATA%
    #[cfg(target_os = "windows")]
    {
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            dirs.push(PathBuf::from(local).join("opencode"));
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        dirs.push(home.join(".local").join("share").join("opencode"));
    }

    dirs
}

fn home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("."))
}

fn process_existing_files(dir: &Path, offsets: &FileOffsets, buffers: &FileBuffers) {
    let Ok(entries) = walkdir_jsonl(dir) else { return };
    for path in entries {
        process_file(&path, offsets, buffers);
    }
}

fn walkdir_jsonl(dir: &Path) -> std::io::Result<Vec<PathBuf>> {
    let mut results = Vec::new();
    fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
        let Ok(rd) = fs::read_dir(dir) else { return };
        for entry in rd.flatten() {
            let path = entry.path();
            if path.is_dir() {
                walk(&path, out);
            } else if path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
                out.push(path);
            }
        }
    }
    walk(dir, &mut results);
    Ok(results)
}

fn process_file(path: &Path, offsets: &FileOffsets, buffers: &FileBuffers) {
    let Ok(mut file) = fs::File::open(path) else { return };
    let file_len = file.metadata().map(|m| m.len()).unwrap_or(0);

    let offset = {
        let mut map = offsets.lock().unwrap();
        *map.entry(path.to_path_buf()).or_insert(0)
    };

    if file_len <= offset {
        return; // no new bytes
    }

    file.seek(SeekFrom::Start(offset)).ok();
    let mut new_bytes = Vec::new();
    file.read_to_end(&mut new_bytes).ok();
    let new_text = String::from_utf8_lossy(&new_bytes).into_owned();

    // Prepend any leftover from previous read
    let prev_buf = {
        let mut map = buffers.lock().unwrap();
        map.remove(path).unwrap_or_default()
    };
    let full_text = prev_buf + &new_text;

    let source = detect_source(path);
    let project = extract_project(path);
    let session_id = extract_session_id(path);

    let (events, calls, leftover) =
        parser::parse_jsonl(&source, &full_text, project.as_deref(), session_id.as_deref());

    // Persist to SQLite
    if let Ok(conn) = db::open() {
        persist(&conn, &events, &calls);
    }

    // Update state
    {
        let mut map = offsets.lock().unwrap();
        map.insert(path.to_path_buf(), offset + new_bytes.len() as u64);
    }
    {
        let mut map = buffers.lock().unwrap();
        if !leftover.is_empty() {
            map.insert(path.to_path_buf(), leftover);
        }
    }
}

fn persist(
    conn: &Connection,
    events: &[crate::models::UsageEvent],
    calls: &[crate::models::ToolCall],
) {
    for e in events {
        db::insert_usage_event(conn, e).ok();
    }
    for c in calls {
        db::insert_tool_call(conn, c).ok();
    }
}

fn detect_source(path: &Path) -> String {
    let s = path.to_string_lossy();
    if s.contains(".claude") {
        "claude".to_owned()
    } else if s.contains(".codex") {
        "codex".to_owned()
    } else if s.contains("opencode") {
        "opencode".to_owned()
    } else {
        "unknown".to_owned()
    }
}

/// Extracts project name from path (Claude Code: ~/.claude/projects/<project>/<session>.jsonl)
fn extract_project(path: &Path) -> Option<String> {
    let home = home_dir();
    let base = home.join(".claude").join("projects");
    let rel = path.strip_prefix(&base).ok()?;
    rel.components().next().map(|c| c.as_os_str().to_string_lossy().into_owned())
}

/// Uses the file stem as session_id
fn extract_session_id(path: &Path) -> Option<String> {
    path.file_stem().map(|s| s.to_string_lossy().into_owned())
}
