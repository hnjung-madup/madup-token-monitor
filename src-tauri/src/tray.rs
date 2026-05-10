use tauri::{
    menu::{Menu, MenuItem},
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
        let _ = app.show(); // NSApp setActivationPolicy(.regular) 동등
    }
}

pub fn setup_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "열기", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide", "숨기기", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("매드업 토큰 모니터")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_and_focus(app),
            "hide" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let visible = w.is_visible().unwrap_or(false);
                    let focused = w.is_focused().unwrap_or(false);
                    if visible && focused {
                        let _ = w.hide();
                    } else {
                        show_and_focus(app);
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
