mod sync;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        // Contactos de las quests: llamar, escribir, abrir la web o Mapas (features/contacts).
        .plugin(tauri_plugin_opener::init())
        // Avisos del sistema: pomodoros, encargos, agenda y rachas (features/notifications).
        .plugin(tauri_plugin_notification::init())
        // Hoja de inicio de sesión de Google en iOS (sync/oauth.rs).
        .plugin(tauri_plugin_web_auth::init())
        // Vibración del iPhone (src/lib/haptics.ts); en el escritorio no hace nada.
        .plugin(tauri_plugin_haptics::init())
        // Sincronización con Google Drive (src/sync y src/features/sync).
        .manage(sync::SyncState::default())
        .invoke_handler(tauri::generate_handler![
            sync::sync_configured,
            sync::sync_signed_in,
            sync::sync_sign_in,
            sync::sync_sign_out,
            sync::sync_account,
            sync::drive_list,
            sync::drive_download,
            sync::drive_upload,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
