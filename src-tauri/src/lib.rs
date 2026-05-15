// ============================================================
// [MODULE MARKER] W2: 파일 워처 + JSONL 파서 + SQLite
// 아래 주석 아래에 mod watcher; mod parser; mod db; 추가
// ============================================================
pub mod commands;
pub mod db;
pub mod models;
pub mod parser;
pub mod plugins;
pub mod pricing;
pub mod watcher;

// ============================================================
// [MODULE MARKER] W4: Supabase 집계 업로드 모듈
// ============================================================
pub mod aggregator;

// ============================================================
// [MODULE MARKER] W5: 시스템 트레이 + 자동 업데이트
// ============================================================
pub mod tray;

// Claude OAuth 사용량 (5h / 7d 한도) — Anthropic의 비공개 endpoint
pub mod oauth_usage;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("안녕하세요, {}! Rust에서 보내는 인사입니다.", name)
}

/// 로컬 데이터(SQLite) 디렉토리 경로. Settings 화면의 "데이터 폴더 열기"가 사용.
#[tauri::command]
fn get_data_dir() -> Result<String, String> {
    db::db_path()
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "데이터 디렉토리를 찾을 수 없습니다".into())
}

/// 메뉴바 popover 윈도우 표시 + 포커스. OAuth deep-link 콜백 도착 직후
/// 백그라운드에서 인증을 처리하는 동안 윈도우가 hidden 상태로 남는 것을 막기 위해 호출.
#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    tray::show_popover(&app);
}

// ============================================================
// [COMMAND MARKER] W2: get_summary, get_timeseries, get_top_mcp, get_top_plugins
// invoke_handler에 해당 커맨드 추가 필요
// ============================================================

use aggregator::sync_aggregates_now;
use commands::{
    get_heatmap, get_summary, get_timeseries, get_today_cost_usd, get_top_mcp, get_top_plugins,
};
use oauth_usage::{get_oauth_usage, refresh_oauth_usage};
use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _watcher = watcher::FileWatcher::start().ok();

    tauri::Builder::default()
        // 두 번째 instance가 실행되려 하면 기존 윈도우를 활성화하고 종료한다.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_summary,
            get_timeseries,
            get_top_mcp,
            get_top_plugins,
            get_heatmap,
            get_today_cost_usd,
            get_data_dir,
            show_main_window,
            sync_aggregates_now,
            get_oauth_usage,
            refresh_oauth_usage,
        ])
        .setup(|app| {
            tray::setup_tray(app.handle())?;
            tray::spawn_title_updater(app.handle().clone());

            // OAuth deep-link 콜백을 Rust 측에서 직접 처리해 popover 를 띄운다.
            // JS 측 `onOpenUrl` 도 동일하게 처리하지만:
            //   1) JS 이벤트 라우팅이 실패해도 윈도우는 떠야 한다
            //   2) Rust 에서 더 빨리 처리되어 사용자 체감 latency 가 짧다
            // URL 검증 / 세션 설정은 JS 가 그대로 담당한다 (Supabase 클라이언트가 거기 있음).
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    let s = url.as_str();
                    eprintln!("[deep-link] received: {}", s);
                    if s.starts_with("madup-token-monitor://auth/callback") {
                        tray::show_popover(&handle);
                    }
                }
            });

            Ok(())
        })
        // popover 동작: 포커스를 잃으면 자동으로 숨김 (메뉴바 드랍다운 UX).
        // CloseRequested는 decorations:false라 거의 발생하지 않지만, 발생하면 hide로 흡수.
        // Focused(false)는 헤더 드래그 시작 등으로도 잠깐 발생할 수 있어서 200ms 지연 후
        // 여전히 unfocused일 때만 hide — 클릭&드래그가 중간에 끊기지 않도록.
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let _ = window.hide();
                api.prevent_close();
            }
            tauri::WindowEvent::Focused(false) => {
                let w = window.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(200));
                    // deep-link 등으로 직전에 직접 띄운 popover 는 macOS 가
                    // 아직 frontmost 전환 중일 수 있어 잠깐 Focused(false) 가 뜬다.
                    // grace period 안이면 자동 hide 를 건너뛴다.
                    if tray::within_programmatic_show_grace() {
                        return;
                    }
                    if !w.is_focused().unwrap_or(true) {
                        let _ = w.hide();
                    }
                });
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
