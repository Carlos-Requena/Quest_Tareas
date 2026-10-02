// Credenciales OAuth de Google para la sincronización (features/sync).
// Salen de google-client.json (el JSON que da Google Cloud, fuera del repositorio por
// .gitignore) o de las variables QUESTS_GOOGLE_CLIENT_ID / QUESTS_GOOGLE_CLIENT_SECRET
// (por ejemplo, secretos de la CI). Sin ninguna, la app compila igual y la sincronización
// sale como «sin configurar».

fn main() {
    println!("cargo:rerun-if-changed=google-client.json");
    println!("cargo:rerun-if-env-changed=QUESTS_GOOGLE_CLIENT_ID");
    println!("cargo:rerun-if-env-changed=QUESTS_GOOGLE_CLIENT_SECRET");

    let (mut id, mut secret) = (env("QUESTS_GOOGLE_CLIENT_ID"), env("QUESTS_GOOGLE_CLIENT_SECRET"));
    if id.is_none() || secret.is_none() {
        if let Ok(text) = std::fs::read_to_string("google-client.json") {
            let json: serde_json::Value = serde_json::from_str(&text).expect("google-client.json no es un JSON válido");
            let c = json.get("installed").unwrap_or(&json);
            let field = |k: &str| c.get(k).and_then(|v| v.as_str()).map(str::to_owned);
            id = id.or(field("client_id"));
            secret = secret.or(field("client_secret"));
        }
    }
    if let (Some(id), Some(secret)) = (id, secret) {
        println!("cargo:rustc-env=QUESTS_GOOGLE_CLIENT_ID={id}");
        println!("cargo:rustc-env=QUESTS_GOOGLE_CLIENT_SECRET={secret}");
    }

    tauri_build::build()
}

fn env(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|v| !v.trim().is_empty())
}
