use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, Position, Rect, Runtime, Size,
};

pub const TRAY_ID: &str = "main-tray";

/// `tauri::Position`/`Size` enum을 physical pixel 값으로 변환.
fn rect_to_physical(rect: &Rect, scale: f64) -> (f64, f64, f64, f64) {
    let (x, y) = match rect.position {
        Position::Physical(p) => (p.x as f64, p.y as f64),
        Position::Logical(p) => (p.x * scale, p.y * scale),
    };
    let (w, h) = match rect.size {
        Size::Physical(s) => (s.width as f64, s.height as f64),
        Size::Logical(s) => (s.width * scale, s.height * scale),
    };
    (x, y, w, h)
}

/// 트레이 아이콘 rect 아래에 윈도우를 popover처럼 배치한다.
/// 확장 모니터 지원: 트레이 좌표를 포함하는 모니터를 찾아 그 안에서 clamp.
fn position_below_tray<R: Runtime>(app: &AppHandle<R>, rect: &Rect) {
    let Some(w) = app.get_webview_window("main") else {
        return;
    };
    let scale = w.scale_factor().unwrap_or(1.0);
    let (tray_x, tray_y, tray_w, tray_h) = rect_to_physical(rect, scale);
    let win_width_phys = w.outer_size().map(|s| s.width as f64).unwrap_or(460.0 * scale);
    let tray_center_x = tray_x + tray_w / 2.0;
    let mut x = tray_center_x - win_width_phys / 2.0;
    let y = tray_y + tray_h + (4.0 * scale);

    // 트레이 클릭 좌표가 속한 모니터를 찾는다 — current_monitor()는 윈도우 기준이라
    // 확장 모니터의 메뉴바를 클릭하면 잘못된 모니터가 잡힐 수 있다.
    let containing_monitor = w
        .available_monitors()
        .ok()
        .and_then(|monitors| {
            monitors.into_iter().find(|m| {
                let mp = m.position();
                let ms = m.size();
                let mx = mp.x as f64;
                let my = mp.y as f64;
                let mw = ms.width as f64;
                let mh = ms.height as f64;
                tray_center_x >= mx && tray_center_x < mx + mw && tray_y >= my && tray_y < my + mh
            })
        })
        .or_else(|| w.current_monitor().ok().flatten());

    if let Some(m) = containing_monitor {
        let mp = m.position();
        let ms = m.size();
        let pad = 8.0 * scale;
        let min_x = mp.x as f64 + pad;
        let max_x = (mp.x as f64) + (ms.width as f64) - win_width_phys - pad;
        if x > max_x {
            x = max_x;
        }
        if x < min_x {
            x = min_x;
        }
    }
    let _ = w.set_position(PhysicalPosition::new(x, y));
}

fn show_and_focus<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn toggle_window_at<R: Runtime>(app: &AppHandle<R>, rect: &Rect) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
            return;
        }
    }
    position_below_tray(app, rect);
    show_and_focus(app);
}

// 트레이 전용 아이콘 — 메뉴바에 어울리는 작은 마크.
// Finder/Dock 아이콘은 bundle.icon (madup-favicon)이 따로 담당한다.
const TRAY_ICON_BYTES: &[u8] = include_bytes!("../icons/tray.png");

pub fn setup_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("매드업 토큰 모니터")
        .show_menu_on_left_click(false);

    if let Ok(icon) = tauri::image::Image::from_bytes(TRAY_ICON_BYTES) {
        builder = builder.icon(icon).icon_as_template(false);
    } else if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon).icon_as_template(false);
    }

    builder
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
            {
                toggle_window_at(tray.app_handle(), &rect);
            }
        })
        .build(app)?;
    Ok(())
}

/// 1분마다 오늘(local-tz) USD 비용을 읽어 트레이 타이틀에 반영.
/// macOS는 메뉴바 아이콘 옆 텍스트, 그 외 OS는 tooltip에 표시.
pub fn spawn_title_updater<R: Runtime>(app: AppHandle<R>) {
    std::thread::spawn(move || loop {
        let cost = crate::commands::today_cost_usd();
        if let Some(tray) = app.tray_by_id(TRAY_ID) {
            #[cfg(target_os = "macos")]
            {
                // 정수 달러로만 표시 (예: $12). 0.5 미만은 비워둔다.
                let title = if cost >= 0.5 {
                    format!(" ${}", cost.round() as i64)
                } else {
                    String::new()
                };
                let _ = tray.set_title(Some(title));
            }
            #[cfg(not(target_os = "macos"))]
            {
                let tooltip = if cost >= 0.5 {
                    format!("매드업 토큰 모니터 — 오늘 ${}", cost.round() as i64)
                } else {
                    "매드업 토큰 모니터".to_string()
                };
                let _ = tray.set_tooltip(Some(tooltip));
            }
        }
        std::thread::sleep(std::time::Duration::from_secs(60));
    });
}
