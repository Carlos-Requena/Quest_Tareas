//! Inicio de sesión web en iOS con `ASWebAuthenticationSession`: la hoja de Safari del sistema
//! que abre una página de inicio de sesión y vuelve a la app cuando la página redirige a un
//! esquema propio. En el escritorio no hace nada (allí se usa el navegador y 127.0.0.1).
//!
//! No tiene comandos para el JavaScript: solo lo llama Rust (`src-tauri/src/sync/oauth.rs`),
//! así que la URL de vuelta (con el código de autorización) nunca pasa por el WebView.

use tauri::plugin::{Builder, TauriPlugin};
use tauri::Runtime;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_web_auth);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("web-auth")
        .setup(|_app, _api| {
            #[cfg(target_os = "ios")]
            {
                use tauri::Manager;
                let handle = _api.register_ios_plugin(init_plugin_web_auth)?;
                _app.manage(ios::WebAuth(handle));
            }
            Ok(())
        })
        .build()
}

/// Por qué no se obtuvo la URL de vuelta.
#[derive(Debug)]
pub enum Error {
    /// La persona cerró la hoja sin terminar.
    Cancelled,
    Failed(String),
}

#[cfg(target_os = "ios")]
pub use ios::WebAuth;

#[cfg(target_os = "ios")]
mod ios {
    use serde::{Deserialize, Serialize};
    use tauri::plugin::mobile::PluginInvokeError;
    use tauri::plugin::PluginHandle;
    use tauri::Runtime;

    use super::Error;

    pub struct WebAuth<R: Runtime>(pub(crate) PluginHandle<R>);

    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Request<'a> {
        url: &'a str,
        callback_scheme: &'a str,
    }

    #[derive(Deserialize)]
    struct Reply {
        url: String,
    }

    impl<R: Runtime> WebAuth<R> {
        /// Abre `url` en la hoja del sistema y espera a que la página redirija a
        /// `callback_scheme:...`. Devuelve esa URL entera.
        pub async fn authenticate(&self, url: &str, callback_scheme: &str) -> Result<String, Error> {
            match self.0.run_mobile_plugin_async::<Reply>("authenticate", Request { url, callback_scheme }).await {
                Ok(r) => Ok(r.url),
                Err(PluginInvokeError::InvokeRejected(e)) if e.code.as_deref() == Some("cancelled") => Err(Error::Cancelled),
                Err(e) => Err(Error::Failed(e.to_string())),
            }
        }
    }
}
