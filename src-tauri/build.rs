// Credenciales OAuth de Google para la sincronización (features/sync).
//
// Escritorio: salen de google-client.json (el JSON del cliente «Desktop app» que da Google
// Cloud, fuera del repositorio por .gitignore) o de las variables QUESTS_GOOGLE_CLIENT_ID /
// QUESTS_GOOGLE_CLIENT_SECRET (por ejemplo, secretos de la CI).
//
// iOS: el cliente es otro, de tipo «iOS», y no tiene secreto. Sale de google-client-ios.plist
// (el plist que da Google Cloud), de google-client-ios.json ({"client_id": "…"}) o de la
// variable QUESTS_GOOGLE_IOS_CLIENT_ID. Tiene que estar en el mismo proyecto de Google Cloud
// que el de escritorio: Drive reconoce la app por el proyecto y así ven los mismos archivos.
//
// Sin credencial, la app compila igual y la sincronización sale como «sin configurar».

fn main() {
    for f in ["google-client.json", "google-client-ios.plist", "google-client-ios.json"] {
        println!("cargo:rerun-if-changed={f}");
    }
    for v in ["QUESTS_GOOGLE_CLIENT_ID", "QUESTS_GOOGLE_CLIENT_SECRET", "QUESTS_GOOGLE_IOS_CLIENT_ID"] {
        println!("cargo:rerun-if-env-changed={v}");
    }

    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
        if let Some(id) = ios_client_id() {
            println!("cargo:rustc-env=QUESTS_GOOGLE_CLIENT_ID={id}");
        }
    } else if let Some((id, secret)) = desktop_client() {
        println!("cargo:rustc-env=QUESTS_GOOGLE_CLIENT_ID={id}");
        println!("cargo:rustc-env=QUESTS_GOOGLE_CLIENT_SECRET={secret}");
    }

    tauri_build::build()
}

fn desktop_client() -> Option<(String, String)> {
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
    Some((id?, secret?))
}

fn ios_client_id() -> Option<String> {
    if let Some(id) = env("QUESTS_GOOGLE_IOS_CLIENT_ID") {
        return Some(id);
    }
    if let Ok(text) = std::fs::read_to_string("google-client-ios.plist") {
        // <key>CLIENT_ID</key> seguido de <string>…</string>. Sin dependencias para leer un plist.
        let after = text.split("<key>CLIENT_ID</key>").nth(1)?;
        let value = after.split("<string>").nth(1)?.split("</string>").next()?.trim();
        return Some(value.to_owned()).filter(|v| !v.is_empty());
    }
    if let Ok(text) = std::fs::read_to_string("google-client-ios.json") {
        let json: serde_json::Value = serde_json::from_str(&text).expect("google-client-ios.json no es un JSON válido");
        return json.get("client_id").and_then(|v| v.as_str()).map(str::to_owned);
    }
    None
}

fn env(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|v| !v.trim().is_empty())
}
