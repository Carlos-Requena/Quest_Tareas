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
        swift_rs_globals();
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

/// Arreglo para iOS con Xcode 27 (solo en release, que es donde pasa).
///
/// El SwiftPM de Xcode 27 deja «locales» las funciones `@_cdecl` de las librerías estáticas.
/// swift-rs 1.0.8 las vuelve a hacer globales con llvm-objcopy, pero solo las del módulo de cada
/// paquete (Tauri, nuestro plugin), no las de su propio módulo `SwiftRs` (retain_object,
/// release_object, string_from_bytes, data_from_bytes): cada archivo lleva una copia local y el
/// enlace falla con «Undefined symbols». Aquí se saca `SwiftRs.o` del archivo de Tauri, se hacen
/// globales esas cuatro funciones y se enlaza como una librería más. Si ya son globales (debug,
/// otra versión de Xcode o de swift-rs), no hace nada.
///
/// Corre después del build script de `tauri` (este crate depende de él y tauri tiene `links`).
fn swift_rs_globals() {
    use std::path::{Path, PathBuf};
    use std::process::Command;

    const SYMS: [&str; 4] = ["_retain_object", "_release_object", "_string_from_bytes", "_data_from_bytes"];
    let Ok(out_dir) = std::env::var("OUT_DIR").map(PathBuf::from) else { return };
    // OUT_DIR = target/<triple>/<perfil>/build/quests-<hash>/out → la carpeta build.
    let Some(build_dir) = out_dir.parent().and_then(Path::parent) else { return };

    // El libTauri.a más reciente del build script de tauri (target/…/build/tauri-<hash>/out/…).
    let mut archive: Option<(std::time::SystemTime, PathBuf)> = None;
    for entry in std::fs::read_dir(build_dir).into_iter().flatten().flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        let Some(hash) = name.strip_prefix("tauri-") else { continue };
        if !hash.chars().all(|c| c.is_ascii_hexdigit()) {
            continue;
        }
        let swift = entry.path().join("out/swift-rs/Tauri");
        for config in std::fs::read_dir(&swift).into_iter().flatten().flatten() {
            let lib = config.path().join("libTauri.a");
            if let Ok(time) = lib.metadata().and_then(|m| m.modified()) {
                if archive.as_ref().map_or(true, |(t, _)| time > *t) {
                    archive = Some((time, lib));
                }
            }
        }
    }
    let Some((_, archive)) = archive else { return };
    println!("cargo:rerun-if-changed={}", archive.display());

    let work = out_dir.join("swift-rs-globals");
    let _ = std::fs::remove_dir_all(&work);
    if std::fs::create_dir_all(&work).is_err() {
        return;
    }
    let ok = |c: &mut Command| c.status().map(|s| s.success()).unwrap_or(false);
    if !ok(Command::new("ar").current_dir(&work).arg("x").arg(&archive).arg("SwiftRs.o")) {
        return;
    }
    let object = work.join("SwiftRs.o");
    let Ok(nm) = Command::new("nm").arg(&object).output() else { return };
    let local: Vec<&str> = SYMS
        .iter()
        .copied()
        .filter(|s| String::from_utf8_lossy(&nm.stdout).lines().any(|l| l.ends_with(&format!(" t {s}"))))
        .collect();
    if local.is_empty() {
        return; // ya son globales: no hace falta
    }

    // llvm-objcopy de rustup (componente llvm-tools), junto al rustc con el que compila cargo.
    let rustc = std::env::var("RUSTC").unwrap_or_else(|_| "rustc".into());
    let host = std::env::var("HOST").unwrap_or_else(|_| "aarch64-apple-darwin".into());
    let Some(sysroot) = Command::new(&rustc).args(["--print", "sysroot"]).output().ok() else { return };
    let objcopy = PathBuf::from(String::from_utf8_lossy(&sysroot.stdout).trim()).join(format!("lib/rustlib/{host}/bin/llvm-objcopy"));
    if !objcopy.exists() {
        println!("cargo:warning=Falta llvm-objcopy: ejecuta `rustup component add llvm-tools` (el enlace para iOS fallará)");
        return;
    }
    let mut cmd = Command::new(objcopy);
    for s in &local {
        cmd.arg(format!("--globalize-symbol={s}"));
    }
    if !ok(cmd.arg(&object)) || !ok(Command::new("ar").current_dir(&work).args(["rcs", "libswiftrs_globals.a", "SwiftRs.o"])) {
        return;
    }
    println!("cargo:rustc-link-search=native={}", work.display());
    println!("cargo:rustc-link-lib=static=swiftrs_globals");
}
