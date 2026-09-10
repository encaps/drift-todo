// Prevents an extra console window on Windows. Harmless on macOS.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    image::Image,
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Runtime,
};
use tauri_plugin_autostart::{ManagerExt, MacosLauncher};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Brings the window forward. `quick_add` also pops the quick-add modal by
/// replaying the `n` shortcut the web app already listens for on `window`.
fn focus_window<R: Runtime>(app: &AppHandle<R>, quick_add: bool) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
    if quick_add {
        let _ = window.eval("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }))");
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            // Cmd+Shift+Space from anywhere: show Drift with quick add open.
            let hotkey = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::Space);
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |app, shortcut, event| {
                        if shortcut == &hotkey && event.state() == ShortcutState::Pressed {
                            focus_window(app, true);
                        }
                    })
                    .build(),
            )?;
            app.global_shortcut().register(hotkey)?;

            let launch_at_login = app.autolaunch().is_enabled().unwrap_or(false);

            let show = MenuItem::with_id(app, "show", "Show Drift", true, None::<&str>)?;
            let quick_add =
                MenuItem::with_id(app, "quick_add", "Quick Add…", true, None::<&str>)?;
            let autostart = CheckMenuItem::with_id(
                app,
                "autostart",
                "Launch at Login",
                true,
                launch_at_login,
                None::<&str>,
            )?;
            let quit = MenuItem::with_id(app, "quit", "Quit Drift", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &show,
                    &quick_add,
                    &PredefinedMenuItem::separator(app)?,
                    &autostart,
                    &PredefinedMenuItem::separator(app)?,
                    &quit,
                ],
            )?;

            // The app icon is a filled square, which a template image would
            // flatten into a black blob. tray.png is the bare "d" glyph.
            let tray_icon = Image::from_bytes(include_bytes!("../icons/tray@2x.png"))?;

            let autostart_item = autostart.clone();
            TrayIconBuilder::with_id("main")
                .icon(tray_icon)
                .icon_as_template(true)
                .tooltip("Drift")
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => focus_window(app, false),
                    "quick_add" => focus_window(app, true),
                    "autostart" => {
                        let manager = app.autolaunch();
                        let enabled = manager.is_enabled().unwrap_or(false);
                        let result = if enabled {
                            manager.disable()
                        } else {
                            manager.enable()
                        };
                        // Keep the checkmark honest if the toggle failed.
                        let _ = autostart_item.set_checked(if result.is_ok() {
                            !enabled
                        } else {
                            enabled
                        });
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Drift");
}
