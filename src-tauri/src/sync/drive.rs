// Llamadas a la API de Google Drive v3. Solo las hace Rust: el token nunca llega al
// JavaScript y la CSP de la ventana sigue sin permitir conexiones de fuera.
//
// Cada archivo de Quests lleva appProperties { quests: <tipo>, key: <clave> }:
// - quests=events, key=<deviceId>  → events-<deviceId>.jsonl (los eventos de un equipo)
// - quests=blob,   key=<SHA-256>   → blob-<SHA-256> (un adjunto o el fondo del menú)
// Se buscan por esas propiedades, no por carpeta: si dos equipos crean a la vez su
// carpeta QuestsApp, los archivos se siguen encontrando todos.

use std::collections::HashMap;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use reqwest::header::{CONTENT_TYPE, LOCATION};
use reqwest::{Method, RequestBuilder, Response};
use serde::{Deserialize, Serialize};

use super::{oauth, SyncError, SyncState};

const API: &str = "https://www.googleapis.com/drive/v3";
const UPLOAD: &str = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME: &str = "application/vnd.google-apps.folder";
const FOLDER_NAME: &str = "QuestsApp";
const FILE_FIELDS: &str = "id,name,mimeType,version,modifiedTime,size,appProperties";
/// Tipos de archivo que la app sabe buscar (la consulta no se arma con texto libre).
const KINDS: [&str; 2] = ["events", "blob"];

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DriveFile {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub mime_type: Option<String>,
    /// Sube cada vez que cambia el archivo (Drive lo da como texto: es un int64).
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub modified_time: Option<String>,
    #[serde(default)]
    pub size: Option<String>,
    #[serde(default)]
    pub app_properties: HashMap<String, String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListResponse {
    #[serde(default)]
    files: Vec<DriveFile>,
    next_page_token: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub email: String,
    pub name: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AboutResponse {
    user: AboutUser,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AboutUser {
    email_address: Option<String>,
    display_name: Option<String>,
}

/// Lo que sube el JavaScript: texto (eventos) o base64 (binarios).
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadRequest {
    /// Archivo existente que se sobrescribe; sin él, se crea uno nuevo.
    pub file_id: Option<String>,
    pub name: String,
    pub mime: String,
    pub kind: String,
    pub key: String,
    pub text: Option<String>,
    pub base64: Option<String>,
}

/// Una petición autenticada. Si Drive responde 401 (token caducado antes de tiempo),
/// se pide otro y se repite una vez.
async fn send(state: &SyncState, build: impl Fn(&str) -> RequestBuilder) -> Result<Response, SyncError> {
    for attempt in 0..2 {
        let token = oauth::access_token(&state.http, &state.token).await?;
        let resp = build(&token).send().await.map_err(SyncError::network)?;
        let status = resp.status();
        if status.as_u16() == 401 && attempt == 0 {
            oauth::invalidate(&state.token).await;
            continue;
        }
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(SyncError::Drive(status.as_u16(), body.chars().take(300).collect()));
        }
        return Ok(resp);
    }
    Err(SyncError::SignedOut)
}

pub async fn about(state: &SyncState) -> Result<Account, SyncError> {
    let resp = send(state, |t| {
        state.http.get(format!("{API}/about")).bearer_auth(t).query(&[("fields", "user(emailAddress,displayName)")])
    })
    .await?;
    let about: AboutResponse = resp.json().await.map_err(SyncError::network)?;
    Ok(Account { email: about.user.email_address.unwrap_or_default(), name: about.user.display_name })
}

async fn query(state: &SyncState, q: &str) -> Result<Vec<DriveFile>, SyncError> {
    let mut out = Vec::new();
    let mut page: Option<String> = None;
    loop {
        let fields = format!("nextPageToken,files({FILE_FIELDS})");
        let resp = send(state, |t| {
            let mut r = state.http.get(format!("{API}/files")).bearer_auth(t).query(&[
                ("q", q),
                ("spaces", "drive"),
                ("pageSize", "1000"),
                ("orderBy", "createdTime"),
                ("fields", fields.as_str()),
            ]);
            if let Some(p) = &page {
                r = r.query(&[("pageToken", p.as_str())]);
            }
            r
        })
        .await?;
        let list: ListResponse = resp.json().await.map_err(SyncError::network)?;
        out.extend(list.files);
        match list.next_page_token {
            Some(p) => page = Some(p),
            None => return Ok(out),
        }
    }
}

/// Los archivos de Quests de un tipo, de todos los equipos.
pub async fn list(state: &SyncState, kind: &str) -> Result<Vec<DriveFile>, SyncError> {
    if !KINDS.contains(&kind) {
        return Err(SyncError::Other(format!("tipo de archivo desconocido: {kind}")));
    }
    query(state, &format!("appProperties has {{ key='quests' and value='{kind}' }} and trashed=false")).await
}

/// La carpeta QuestsApp: la más antigua si hay varias, o una nueva.
async fn folder(state: &SyncState) -> Result<String, SyncError> {
    if let Some(id) = state.folder.lock().await.clone() {
        return Ok(id);
    }
    let found = query(state, &format!("mimeType='{FOLDER_MIME}' and name='{FOLDER_NAME}' and trashed=false")).await?;
    let id = match found.into_iter().next() {
        Some(f) => f.id,
        None => {
            let meta = serde_json::json!({ "name": FOLDER_NAME, "mimeType": FOLDER_MIME, "appProperties": { "quests": "folder" } });
            let resp = send(state, |t| state.http.post(format!("{API}/files")).bearer_auth(t).query(&[("fields", "id")]).json(&meta)).await?;
            resp.json::<DriveFile>().await.map_err(SyncError::network)?.id
        }
    };
    *state.folder.lock().await = Some(id.clone());
    Ok(id)
}

fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub async fn download(state: &SyncState, file_id: &str) -> Result<Vec<u8>, SyncError> {
    if !valid_id(file_id) {
        return Err(SyncError::Other("id de archivo no válido".into()));
    }
    let resp = send(state, |t| state.http.get(format!("{API}/files/{file_id}")).bearer_auth(t).query(&[("alt", "media")])).await?;
    Ok(resp.bytes().await.map_err(SyncError::network)?.to_vec())
}

/// Sube un archivo entero (subida reanudable: vale también para adjuntos de 20 MB).
pub async fn upload(state: &SyncState, req: UploadRequest) -> Result<DriveFile, SyncError> {
    if !KINDS.contains(&req.kind.as_str()) {
        return Err(SyncError::Other(format!("tipo de archivo desconocido: {}", req.kind)));
    }
    let bytes: Vec<u8> = match (&req.text, &req.base64) {
        (Some(t), _) => t.clone().into_bytes(),
        (None, Some(b)) => STANDARD.decode(b).map_err(|e| SyncError::Other(format!("base64 no válido: {e}")))?,
        (None, None) => Vec::new(),
    };

    let (method, url, meta) = match &req.file_id {
        Some(id) if valid_id(id) => (Method::PATCH, format!("{UPLOAD}/files/{id}"), serde_json::json!({})),
        Some(_) => return Err(SyncError::Other("id de archivo no válido".into())),
        None => {
            let parent = folder(state).await?;
            let meta = serde_json::json!({
                "name": req.name,
                "mimeType": req.mime,
                "parents": [parent],
                "appProperties": { "quests": req.kind, "key": req.key },
            });
            (Method::POST, format!("{UPLOAD}/files"), meta)
        }
    };

    // 1) Abrir la sesión de subida (con los metadatos).
    let session = send(state, |t| {
        state
            .http
            .request(method.clone(), &url)
            .bearer_auth(t)
            .query(&[("uploadType", "resumable"), ("fields", FILE_FIELDS)])
            .header("X-Upload-Content-Type", req.mime.as_str())
            .json(&meta)
    })
    .await;
    let session = match session {
        Ok(r) => r,
        Err(SyncError::Drive(404, body)) => {
            // La carpeta (o el archivo) ya no está: se busca de nuevo la próxima vez.
            *state.folder.lock().await = None;
            return Err(SyncError::Drive(404, body));
        }
        Err(e) => return Err(e),
    };
    let location = session
        .headers()
        .get(LOCATION)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| SyncError::Other("Drive no devolvió la URL de subida".into()))?
        .to_owned();

    // 2) Enviar el contenido.
    let token = oauth::access_token(&state.http, &state.token).await?;
    let resp = state
        .http
        .put(location)
        .bearer_auth(token)
        .header(CONTENT_TYPE, req.mime.as_str())
        .body(bytes)
        .send()
        .await
        .map_err(SyncError::network)?;
    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        return Err(SyncError::Drive(status, resp.text().await.unwrap_or_default().chars().take(300).collect()));
    }
    resp.json::<DriveFile>().await.map_err(SyncError::network)
}
