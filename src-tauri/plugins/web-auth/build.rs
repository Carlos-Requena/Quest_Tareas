// Sin comandos para el JavaScript: solo lo usa Rust (src-tauri/src/sync/oauth.rs).
// En iOS enlaza el paquete Swift de ios/ (copia la API de Tauri en .tauri/tauri-api).

const COMMANDS: &[&str] = &[];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).ios_path("ios").build();
}
