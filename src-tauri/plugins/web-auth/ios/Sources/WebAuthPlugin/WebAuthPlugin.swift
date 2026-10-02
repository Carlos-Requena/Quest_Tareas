// Inicio de sesión web con ASWebAuthenticationSession: la hoja de Safari del sistema.
// Abre la URL de Google, espera a que redirija al esquema de la app y devuelve esa URL.
// La sesión de Safari se comparte (prefersEphemeralWebBrowserSession = false): si ya se
// inició sesión en Google en Safari, solo hay que elegir la cuenta.

import AuthenticationServices
import Tauri
import UIKit
import WebKit

class AuthenticateArgs: Decodable {
  let url: String
  let callbackScheme: String
}

class WebAuthPlugin: Plugin, ASWebAuthenticationPresentationContextProviding {
  /// La sesión tiene que seguir viva mientras la hoja está abierta.
  private var session: ASWebAuthenticationSession?

  @objc public func authenticate(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(AuthenticateArgs.self)
    guard let url = URL(string: args.url) else {
      invoke.reject("URL no válida")
      return
    }
    DispatchQueue.main.async {
      let session = ASWebAuthenticationSession(url: url, callbackURLScheme: args.callbackScheme) {
        [weak self] callback, error in
        self?.session = nil
        if let callback = callback {
          invoke.resolve(["url": callback.absoluteString])
        } else if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
          invoke.reject("La hoja se cerró sin terminar", code: "cancelled")
        } else {
          invoke.reject(error?.localizedDescription ?? "Error desconocido")
        }
      }
      session.presentationContextProvider = self
      session.prefersEphemeralWebBrowserSession = false
      self.session = session
      if !session.start() {
        self.session = nil
        invoke.reject("No se pudo abrir la hoja de inicio de sesión")
      }
    }
  }

  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    return manager.viewController?.view.window ?? ASPresentationAnchor()
  }
}

@_cdecl("init_plugin_web_auth")
func initPlugin() -> Plugin {
  return WebAuthPlugin()
}
