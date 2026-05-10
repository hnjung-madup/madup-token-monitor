use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime,
};

/// macOS는 hide된 window를 다시 띄울 때 단순 `show()`만으로는 dock/foreground 활성화가 안 됨.
/// unminimize → show → set_focus 순서로 호출하고, macOS에서는 dock의 앱 자체도 visible로.
fn show_and_focus<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = app.show();
    }
}

fn toggle_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let visible = w.is_visible().unwrap_or(false);
        let focused = w.is_focused().unwrap_or(false);
        if visible && focused {
            let _ = w.hide();
            return;
        }
    }
    show_and_focus(app);
}

pub fn setup_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let mut builder = TrayIconBuilder::new()
        .tooltip("매드업 토큰 모니터")
        .show_menu_on_left_click(false);

    // 트레이 아이콘은 앱 default window icon (bundle의 madup-favicon)을 그대로 사용.
    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon).icon_as_template(false);
    }

    builder
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}
