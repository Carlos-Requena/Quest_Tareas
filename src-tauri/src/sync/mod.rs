// Sincronización con Google Drive (fase 2): la parte nativa. Ver src/features/sync/README.md.
//
// Rust solo hace de puente seguro con Google: iniciar sesión, guardar el token en el
// llavero y leer o escribir archivos en Drive. Qué se sube, qué se baja y cómo se
// fusiona lo decide el TypeScript (src/features/sync), que es donde vive el dominio.

mod drive;
mod oauth;

use serde::Serialize;
use tauri::ipc::Response;
use tauri::State;
use tokio::sync::Mutex;

pub use drive::{Account, DriveFile, UploadRequest};

#[derive(Default)]
pub struct SyncState {
    http: reqwest::Client,
    token: Mutex<Option<oauth::AccessToken>>,
    /// Id de la carpeta QuestsApp, una vez encontrada o creada.
    folder: Mutex<Option<String>>,
}

/// Errores con un `code` estable: el JavaScript lo traduce a un aviso.
#[derive(Debug)]
pub enum SyncError {
    /// La app se compiló sin google-client.json.
    NotConfigured,
    /// No hay sesión (nunca se conectó, se desconectó o caducó el permiso).
    SignedOut,
    ConsentDenied,
    /// Se cerró la hoja de inicio de sesión sin terminar (iOS).
    #[cfg_attr(not(target_os = "ios"), allow(dead_code))]
    Cancelled,
    /// Se aceptó sin marcar el permiso de Drive.
    MissingScope,
    Timeout,
    Network(String),
    Auth(String),
    Keyring(String),
    Drive(u16, String),
    Other(String),
}

impl SyncError {
    fn network(e: impl std::fmt::Display) -> Self {
        SyncError::Network(e.to_string())
    }
    fn keyring(e: impl std::fmt::Display) -> Self {
        SyncError::Keyring(e.to_string())
    }
}

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    status: Option<u16>,
    detail: String,
}

impl Serialize for SyncError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let (code, status, detail) = match self {
            SyncError::NotConfigured => ("not_configured", None, String::new()),
            SyncError::SignedOut => ("signed_out", None, String::new()),
            SyncError::ConsentDenied => ("consent_denied", None, String::new()),
            SyncError::Cancelled => ("cancelled", None, String::new()),
            SyncError::MissingScope => ("missing_scope", None, String::new()),
            SyncError::Timeout => ("timeout", None, String::new()),
            SyncError::Network(d) => ("network", None, d.clone()),
            SyncError::Auth(d) => ("auth", None, d.clone()),
            SyncError::Keyring(d) => ("keyring", None, d.clone()),
            SyncError::Drive(st, d) => ("drive", Some(*st), d.clone()),
            SyncError::Other(d) => ("other", None, d.clone()),
        };
        ErrorBody { code, status, detail }.serialize(s)
    }
}

type R<T> = Result<T, SyncError>;

/// Deja el fallo en la salida de error (se ve con `pnpm tauri dev` o en los logs del sistema).
fn logged<T>(cmd: &str, r: R<T>) -> R<T> {
    if let Err(e) = &r {
        eprintln!("[sync] {cmd}: {e:?}");
    }
    r
}

/// ¿Se compiló con la credencial de Google?
#[tauri::command]
pub fn sync_configured() -> bool {
    oauth::configured()
}

/// ¿Hay sesión guardada en el llavero? No usa la red.
#[tauri::command]
pub fn sync_signed_in() -> R<bool> {
    logged("signed_in", oauth::signed_in())
}

#[tauri::command]
pub async fn sync_sign_in(app: tauri::AppHandle, state: State<'_, SyncState>) -> R<Account> {
    logged("sign_in", oauth::sign_in(&app, &state.http, &state.token).await)?;
    *state.folder.lock().await = None;
    logged("about", drive::about(&state).await)
}

#[tauri::command]
pub async fn sync_sign_out(state: State<'_, SyncState>) -> R<()> {
    *state.folder.lock().await = None;
    logged("sign_out", oauth::sign_out(&state.http, &state.token).await)
}

#[tauri::command]
pub async fn sync_account(state: State<'_, SyncState>) -> R<Account> {
    logged("account", drive::about(&state).await)
}

#[tauri::command]
pub async fn drive_list(state: State<'_, SyncState>, kind: String) -> R<Vec<DriveFile>> {
    logged("list", drive::list(&state, &kind).await)
}

/// El contenido llega al JavaScript como ArrayBuffer, sin pasar por JSON.
#[tauri::command]
pub async fn drive_download(state: State<'_, SyncState>, file_id: String) -> R<Response> {
    Ok(Response::new(logged("download", drive::download(&state, &file_id).await)?))
}

#[tauri::command]
pub async fn drive_upload(state: State<'_, SyncState>, request: UploadRequest) -> R<DriveFile> {
    logged("upload", drive::upload(&state, request).await)
}
