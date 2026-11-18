#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // macOS needs the standard Edit menu for Cmd+C / Cmd+V / Cmd+A to reach the
            // webview. Windows keeps a menu-less window, which suits the minimal UI.
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::Menu;

                let menu = Menu::default(app.handle())?;
                app.set_menu(menu)?;
            }

            // `app` is only read by the macOS menu setup above.
            #[cfg(not(target_os = "macos"))]
            let _ = app;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
