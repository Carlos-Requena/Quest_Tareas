// Inicio de sesión con Google: OAuth 2 para apps de escritorio con PKCE y redirección
// a 127.0.0.1 (el navegador vuelve a un puerto local que abre la app un momento).
//
// - El refresh token se guarda en el llavero del sistema (Llavero de macOS, Administrador
//   de credenciales de Windows). Nunca en SQLite, en un archivo ni en el JavaScript.
// - El access token (1 hora) vive solo en memoria, dentro de SyncState.
// - Permiso pedido: drive.file. La app solo ve los archivos que ha creado ella.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::RngCore;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use url::Url;

use super::SyncError;

pub const SCOPE: &str = "https://www.googleapis.com/auth/drive.file";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const REVOKE_URL: &str = "https://oauth2.googleapis.com/revoke";
const KEYRING_SERVICE: &str = "com.quests.app";
const KEYRING_USER: &str = "google-drive";
/// Lo que se espera a que vuelvas del navegador antes de dar el intento por perdido.
const SIGN_IN_TIMEOUT: Duration = Duration::from_secs(300);

/// Credencial de la app (no del usuario), incrustada al compilar por build.rs.
struct Client {
    id: &'static str,
    secret: &'static str,
}

fn client() -> Option<Client> {
    match (option_env!("QUESTS_GOOGLE_CLIENT_ID"), option_env!("QUESTS_GOOGLE_CLIENT_SECRET")) {
        (Some(id), Some(secret)) if !id.is_empty() && !secret.is_empty() => Some(Client { id, secret }),
        _ => None,
    }
}

pub fn configured() -> bool {
    client().is_some()
}

pub struct AccessToken {
    value: String,
    expires_at: Instant,
}

fn entry() -> Result<keyring::Entry, SyncError> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(SyncError::keyring)
}

fn stored_refresh_token() -> Result<Option<String>, SyncError> {
    match entry()?.get_password() {
        Ok(t) => Ok(Some(t)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(SyncError::keyring(e)),
    }
}

fn forget_refresh_token() -> Result<(), SyncError> {
    match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(SyncError::keyring(e)),
    }
}

pub fn signed_in() -> Result<bool, SyncError> {
    Ok(stored_refresh_token()?.is_some())
}

fn random_url_safe(bytes: usize) -> String {
    let mut b = vec![0u8; bytes];
    rand::thread_rng().fill_bytes(&mut b);
    URL_SAFE_NO_PAD.encode(b)
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
    refresh_token: Option<String>,
    scope: Option<String>,
}

#[derive(Deserialize)]
struct TokenError {
    error: String,
}

/// Abre el navegador, espera a que vuelvas con el permiso y guarda el refresh token.
pub async fn sign_in(http: &reqwest::Client, cache: &Mutex<Option<AccessToken>>) -> Result<(), SyncError> {
    let c = client().ok_or(SyncError::NotConfigured)?;
    let verifier = random_url_safe(64);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let state = random_url_safe(24);

    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(SyncError::network)?;
    let port = listener.local_addr().map_err(SyncError::network)?.port();
    let redirect = format!("http://127.0.0.1:{port}");

    let mut url = Url::parse(AUTH_URL).expect("URL fija");
    url.query_pairs_mut()
        .append_pair("client_id", c.id)
        .append_pair("redirect_uri", &redirect)
        .append_pair("response_type", "code")
        .append_pair("scope", SCOPE)
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("state", &state)
        // offline + consent: Google da siempre un refresh token, también al volver a conectar.
        .append_pair("access_type", "offline")
        .append_pair("prompt", "consent");
    open::that_detached(url.as_str()).map_err(|e| SyncError::Other(format!("no se pudo abrir el navegador: {e}")))?;

    let code = tokio::time::timeout(SIGN_IN_TIMEOUT, wait_for_code(&listener, &state))
        .await
        .map_err(|_| SyncError::Timeout)??;

    let resp = http
        .post(TOKEN_URL)
        .form(&[
            ("client_id", c.id),
            ("client_secret", c.secret),
            ("code", code.as_str()),
            ("code_verifier", verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect.as_str()),
        ])
        .send()
        .await
        .map_err(SyncError::network)?;
    if !resp.status().is_success() {
        return Err(SyncError::Auth(resp.text().await.unwrap_or_default()));
    }
    let token: TokenResponse = resp.json().await.map_err(SyncError::network)?;
    // Con el consentimiento por partes, se puede desmarcar Drive y aceptar igualmente.
    if !token.scope.as_deref().unwrap_or("").split(' ').any(|s| s == SCOPE) {
        return Err(SyncError::MissingScope);
    }
    let refresh = token.refresh_token.ok_or_else(|| SyncError::Auth("Google no devolvió refresh token".into()))?;
    entry()?.set_password(&refresh).map_err(SyncError::keyring)?;
    *cache.lock().await = Some(AccessToken {
        value: token.access_token,
        expires_at: Instant::now() + Duration::from_secs(token.expires_in),
    });
    Ok(())
}

/// Atiende al navegador en el puerto local hasta que llega la respuesta de Google.
async fn wait_for_code(listener: &TcpListener, state: &str) -> Result<String, SyncError> {
    loop {
        let (mut sock, _) = listener.accept().await.map_err(SyncError::network)?;
        let mut buf = vec![0u8; 8192];
        let n = sock.read(&mut buf).await.unwrap_or(0);
        let head = String::from_utf8_lossy(&buf[..n]);
        let path = head.lines().next().and_then(|l| l.split_whitespace().nth(1)).unwrap_or("/");
        let params: HashMap<String, String> = Url::parse(&format!("http://127.0.0.1{path}"))
            .map(|u| u.query_pairs().into_owned().collect())
            .unwrap_or_default();

        let result = if let Some(err) = params.get("error") {
            Some(Err(if err == "access_denied" { SyncError::ConsentDenied } else { SyncError::Auth(err.clone()) }))
        } else if let Some(code) = params.get("code") {
            Some(if params.get("state").map(String::as_str) == Some(state) {
                Ok(code.clone())
            } else {
                Err(SyncError::Auth("state distinto: respuesta que no pidió esta app".into()))
            })
        } else {
            None // el favicon u otra petición del navegador
        };

        let page = match &result {
            Some(Ok(_)) => DONE_PAGE,
            Some(Err(_)) => FAILED_PAGE,
            None => "",
        };
        let status = if result.is_some() { "200 OK" } else { "404 Not Found" };
        let reply = format!(
            "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{page}",
            page.len()
        );
        let _ = sock.write_all(reply.as_bytes()).await;
        let _ = sock.shutdown().await;
        if let Some(r) = result {
            return r;
        }
    }
}

const DONE_PAGE: &str = "<!doctype html><meta charset=utf-8><title>Quests</title><body style=\"font-family:Georgia,serif;background:#0a0908;color:#ece5d6;display:grid;place-items:center;height:100vh;margin:0;text-align:center\"><div><h1 style=\"color:#f2d68f\">Quests</h1><p>Conectado con Google Drive. Ya puedes cerrar esta pestaña y volver a la app.</p><p>Google ドライブに接続しました。このタブを閉じてアプリに戻ってください。</p></div>";
const FAILED_PAGE: &str = "<!doctype html><meta charset=utf-8><title>Quests</title><body style=\"font-family:Georgia,serif;background:#0a0908;color:#ece5d6;display:grid;place-items:center;height:100vh;margin:0;text-align:center\"><div><h1 style=\"color:#e2604c\">Quests</h1><p>No se ha conectado con Google Drive. Vuelve a la app para intentarlo otra vez.</p><p>Google ドライブに接続できませんでした。アプリに戻ってもう一度お試しください。</p></div>";

/// Un access token válido: el de memoria o uno nuevo con el refresh token del llavero.
pub async fn access_token(http: &reqwest::Client, cache: &Mutex<Option<AccessToken>>) -> Result<String, SyncError> {
    let mut guard = cache.lock().await;
    if let Some(t) = guard.as_ref() {
        if t.expires_at > Instant::now() + Duration::from_secs(60) {
            return Ok(t.value.clone());
        }
    }
    let c = client().ok_or(SyncError::NotConfigured)?;
    let refresh = stored_refresh_token()?.ok_or(SyncError::SignedOut)?;
    let resp = http
        .post(TOKEN_URL)
        .form(&[
            ("client_id", c.id),
            ("client_secret", c.secret),
            ("refresh_token", refresh.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(SyncError::network)?;
    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        // Caducado (7 días con la app en pruebas) o retirado desde la cuenta de Google.
        if serde_json::from_str::<TokenError>(&body).map(|e| e.error == "invalid_grant").unwrap_or(false) {
            forget_refresh_token()?;
            *guard = None;
            return Err(SyncError::SignedOut);
        }
        return Err(SyncError::Auth(body));
    }
    let token: TokenResponse = resp.json().await.map_err(SyncError::network)?;
    let value = token.access_token.clone();
    *guard = Some(AccessToken { value: token.access_token, expires_at: Instant::now() + Duration::from_secs(token.expires_in) });
    Ok(value)
}

/// Olvida el access token de memoria (Drive dijo 401): el siguiente se pide de nuevo.
pub async fn invalidate(cache: &Mutex<Option<AccessToken>>) {
    *cache.lock().await = None;
}

/// Desconecta: borra el token del llavero y se lo retira a Google (si hay conexión).
pub async fn sign_out(http: &reqwest::Client, cache: &Mutex<Option<AccessToken>>) -> Result<(), SyncError> {
    let refresh = stored_refresh_token()?;
    forget_refresh_token()?;
    *cache.lock().await = None;
    if let Some(t) = refresh {
        let _ = http.post(REVOKE_URL).form(&[("token", t.as_str())]).send().await;
    }
    Ok(())
}
