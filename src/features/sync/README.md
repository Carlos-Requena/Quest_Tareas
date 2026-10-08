---
funcionalidad: sync
titulo: Sincronización con Google Drive
resumen: Cada equipo sube sus eventos a un archivo propio en Google Drive y baja los de los demás; los adjuntos viajan por su SHA-256.
tipo: infraestructura
eventos: []
preferencias: []
adr: [ADR-04, ADR-28, ADR-29, ADR-30, ADR-32]
---

# Sincronización con Google Drive

Cada equipo sube sus eventos a la carpeta `QuestsApp/` del Google Drive del jugador y baja los de los demás. Como los eventos son inmutables y la proyección es determinista, unirlos basta: **dos equipos que trabajaron sin conexión llegan al mismo estado**. Funciona en macOS, Windows e iPhone. El control (una nube con un punto de estado y un panel para conectar, sincronizar o desconectar) está en los ajustes del [menú](../menu/README.md).

Configurar la credencial, probar con dos equipos y qué mirar si falla: [docs/runbooks/verificar-sync.md](../../../docs/runbooks/verificar-sync.md).

## Qué hace

- Varios equipos con el mismo progreso, sin servidor propio; sin conexión se juega igual y se sincroniza al volver.
- Sincroniza al abrir la app, cada 5 minutos, al volver a la ventana (si hace más de 1 minuto), al ocultarla si hay algo sin subir (en el iPhone, al salir de la app) y al cerrarla (como mucho 8 s). Una sincronización a la vez.
- También los binarios: los adjuntos de los encargos, el fondo del menú comprado al mercader y los personajes añadidos al menú.
- La app solo ve sus propios archivos de Drive (permiso `drive.file`) y los tokens nunca llegan a disco ni al JavaScript.

```
 Equipo A                         Google Drive (QuestsApp/)                 Equipo B
 ┌───────────┐  sube su archivo   ┌──────────────────────────┐  baja       ┌───────────┐
 │ SQLite A  │ ─────────────────▶ │ events-A.jsonl           │ ──────────▶ │ merge()   │
 │           │ ◀───────────────── │ events-B.jsonl           │ ◀────────── │ SQLite B  │
 └───────────┘  baja y merge()    │ blob-<sha256>  (adjuntos)│  sube       └───────────┘
                                  └──────────────────────────┘
```

1. **Bajar.** Se listan los `events-*.jsonl` (por `appProperties`, no por carpeta). Los de otros equipos cuya `version` cambió desde el último cursor se descargan, se leen (`decodeEvents`) y se fusionan con `EventStore.merge`, que ignora los que ya existen. Si entró algo, `store.rebuild()` recalcula el estado.
2. **Subir.** Si hay eventos sin subir (`unsynced`) o el archivo propio no está en Drive, se sube **entero** (`byDevice`) y se marcan como subidos **solo** los que se leyeron antes de subir: lo hecho durante la subida va en la siguiente.
3. **Binarios.** Se suben los que se usan y no están en Drive, y se bajan los que se usan y faltan aquí. Su nombre es su SHA-256: cada uno se mueve una sola vez y al bajarlo se comprueba el hash.

Cada equipo escribe **solo su archivo**: nunca hay dos escritores sobre el mismo. Si dos equipos crean a la vez su carpeta `QuestsApp`, no pasa nada: los archivos se buscan por sus propiedades y se sube a la más antigua.

## Reglas y decisiones

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Rust hace el OAuth y todas las llamadas a Drive; el JavaScript solo pide «lista», «baja», «sube» | `fetch` desde el JavaScript con el token | El token nunca toca el WebView y la CSP sigue sin abrirse a Google ([ADR-28](../../../docs/decisions/ADR-28-oauth-y-drive-en-rust.md)) |
| Refresh token en el llavero del sistema (crate `keyring`); access token solo en memoria | SQLite o un archivo | Es una credencial de Google: el llavero la cifra con la cuenta del usuario |
| PKCE + redirección a `127.0.0.1:<puerto libre>` en el escritorio | Copiar y pegar un código; esquema de URL propio | Es el flujo que recomienda Google para apps de escritorio |
| Permiso `drive.file` y una carpeta visible `QuestsApp/` | `drive.appdata`; `drive` entero | No requiere auditoría y deja ver (y copiar) los datos |
| Un JSONL por equipo, reescrito entero; cursor por archivo con su `version` | Un archivo por evento; añadir al final; bajar todo siempre | Drive no permite añadir a un archivo y miles de archivos serían miles de peticiones; sin novedades no se descarga nada ([ADR-29](../../../docs/decisions/ADR-29-jsonl-por-equipo.md)) |
| Binarios por SHA-256 y solo los que se usan | Toda la tabla `blobs` | No se suben huérfanos y nunca se duplican |
| Datos de ejemplo con ids fijos (`seed:quest:*`) y lápida de quests retiradas (`ProjectionAcc.deletedQuests`) | Ids aleatorios | Si no, dos equipos que empiezan vacíos tendrían los ejemplos duplicados y uno que llega tarde devolvería los retirados ([ADR-30](../../../docs/decisions/ADR-30-ids-fijos-y-lapida.md)) |
| Credencial de la app en `src-tauri/google-client.json`, fuera del repositorio, incrustada por `build.rs`; en la CI, por secretos | En el código | Nunca en el repositorio. Google trata el *client secret* de escritorio como no confidencial |

### En el iPhone

Solo cambia **cómo se inicia sesión**; bajar, fusionar, subir, los binarios, el llavero y Drive son el mismo código ([ADR-32](../../../docs/decisions/ADR-32-login-google-ios.md)).

- **Otro cliente de Google, de tipo «iOS», sin secreto**, en el **mismo proyecto** de Google Cloud que el de escritorio (Drive reconoce la app por el proyecto). Vuelve a un esquema propio: el id del cliente al revés (`com.googleusercontent.apps.<id>:/oauth2redirect`). Su *bundle ID* es el de la app en iOS (`src-tauri/tauri.ios.conf.json`, ver [compilar-ios](../../../docs/runbooks/compilar-ios.md#firmar-con-un-apple-id-gratuito)).
- **La hoja de inicio de sesión del sistema** (`ASWebAuthenticationSession`) en un plugin propio, `src-tauri/plugins/web-auth` (Swift en `ios/`). Cuando Google redirige al esquema, la hoja se cierra y devuelve la URL a **Rust**, que comprueba el `state` y canjea el código con PKCE. El plugin no tiene comandos para el JavaScript: el código nunca pasa por el WebView.
- **Cerrar la hoja sin terminar** devuelve `cancelled`: se vuelve a «Conectar» sin aviso.
- **El refresh token** va al llavero de iOS (`keyring` con `apple-native`); se borra si se borra la app.
- **Sincronizar al salir**: salir de la app la oculta (`visibilitychange`) y es la última ocasión antes de que iOS la suspenda.
- **La credencial** del cliente iOS la incrusta `build.rs` al compilar para iOS. Qué archivo o variable y dónde va: [verificar-sync](../../../docs/runbooks/verificar-sync.md#credenciales-fuera-del-repositorio).

## Modelo

| Tipo | Dónde | Qué es |
|---|---|---|
| `RemoteFile` | `model.ts` | Un archivo de Quests en Drive: id, nombre, MIME, `version` y `appProperties` (`quests`: `events` o `blob`; `key`: deviceId o SHA-256) |
| `Cursors` | `model.ts` | Id de archivo → versión ya leída. En la tabla `meta` (`sync.cursors`), por equipo |
| `SyncReport`, `SyncPhase` | `model.ts` | Lo que hizo una sincronización; fase de la interfaz (`unavailable` · `unconfigured` · `signedOut` · `signingIn` · `idle` · `syncing` · `error`) |
| `DriveApi`, `SyncBlobs`, `SyncDeps` | `engine.ts` | Lo que necesita `runSync`, inyectado: se prueba con un Drive falso |
| `SyncState`, `SyncError` | `src-tauri/src/sync/mod.rs` | Estado nativo (cliente HTTP, access token, carpeta) y errores con un `code` estable |

## Eventos

No añade eventos. Viajan los que existen, con su `v` (los de una versión futura viajan y la proyección los ignora). Los cursores y la cuenta conectada van en la tabla `meta`, por equipo.

| `code` de error (Rust) | Qué pasa | Qué se ve |
|---|---|---|
| `not_configured` | La app se compiló sin credencial | Nube apagada: «sin configurar» |
| `signed_out` | No hay sesión, o caducó (7 días con la app de Google Cloud en pruebas) | Se vuelve a «Conectar» y avisa |
| `consent_denied`, `missing_scope` | No se dio permiso, o se desmarcó Drive | Aviso para volver a conectar |
| `cancelled` | iOS: se cerró la hoja sin terminar | Nada: se vuelve a «Conectar» |
| `timeout` | No se volvió del navegador en 5 minutos | Aviso |
| `network` | Sin conexión | Punto rojo; en las automáticas no avisa y se reintenta |
| `drive`, `auth`, `keyring`, `other` | Fallo de Google o del sistema | Punto rojo y el motivo en el panel; el detalle va a la salida de error de Rust (`[sync] …`) |

## Archivos

| Archivo | Qué hace |
|---|---|
| `model.ts` | Puro: nombres, JSONL (`encodeEvents` / `decodeEvents`), `planEvents`, `planBlobs`, `SYNC_EVERY_MS`, `CLOSE_TIMEOUT_MS` |
| `engine.ts` | `runSync(deps)`: bajar, fusionar, subir y binarios, con todo inyectado |
| `drive.ts` | Puente con Rust (`invoke`) y tipo de los errores nativos |
| `storage.ts` | Cursores y cuenta en la tabla `meta` |
| `actions.ts` | `initSync`, `syncNow`, `signIn`, `signOut`: cuándo sincronizar (una a la vez) y al cerrar |
| `ui.ts` | Estado de la interfaz (Zustand) |
| `components/SyncControl.tsx` | La nube con su panel y `SyncWatcher` (arranca al cargar el juego) |
| `sync.css`, `i18n.ts` | Estilos y textos es + ja |
| `engine.test.ts` | Dos y tres equipos en memoria con un Drive falso (`src/test/memory.ts`) |

### Dónde está cada cosa

| Concepto | Símbolo |
|---|---|
| Una sincronización completa, con todo inyectado | [`runSync`](engine.ts) |
| Qué bajar y qué subir | [`planEvents`](model.ts) y [`planBlobs`](model.ts) |
| Leer y escribir el JSONL | [`encodeEvents`](model.ts) y [`decodeEvents`](model.ts) |
| Cuándo se sincroniza (al abrir, cada `SYNC_EVERY_MS`, al volver, al salir y al cerrar) | [`initSync`](actions.ts), [`syncNow`](actions.ts), [`syncIfPending`](actions.ts) y [`watchClose`](actions.ts), con [`SYNC_EVERY_MS`](model.ts) y [`CLOSE_TIMEOUT_MS`](model.ts) |
| Conectar y desconectar | [`signIn`](actions.ts) y [`signOut`](actions.ts) |
| Puente con Rust | [`tauriDrive`](drive.ts) |
| Comandos nativos | [`sync_sign_in`](../../../src-tauri/src/sync/mod.rs), [`drive_list`](../../../src-tauri/src/sync/mod.rs), [`drive_download`](../../../src-tauri/src/sync/mod.rs) y [`drive_upload`](../../../src-tauri/src/sync/mod.rs) |
| La nube de los ajustes y el arranque | [`SyncControl`](components/SyncControl.tsx) y [`SyncWatcher`](components/SyncControl.tsx) |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src-tauri/src/sync/` | `oauth.rs` (PKCE con 127.0.0.1 o la hoja de iOS, llavero, refresco, desconexión), `drive.rs` (listar, bajar, subir con subida reanudable), `mod.rs` (comandos) |
| `src-tauri/plugins/web-auth/` | Plugin con `ASWebAuthenticationSession` (Swift); solo hace algo en iOS |
| `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/src/lib.rs` | `reqwest`, `keyring`, `tokio`, `tauri-plugin-web-auth`…; la credencial al compilar; los comandos |
| `src-tauri/capabilities/default.json` | `core:window:allow-destroy`: al escuchar el cierre de la ventana, Tauri la cierra desde el JavaScript |
| `src-tauri/.gitignore` | `/google-client.json`, `/google-client-ios.plist`, `/google-client-ios.json` |
| `.github/workflows/ci.yml` | Secretos `QUESTS_GOOGLE_CLIENT_ID` y `QUESTS_GOOGLE_CLIENT_SECRET` |
| `src/storage/eventStore.ts` | `byDevice`; inserciones y `markSynced` por lotes |
| `src/storage/blobStore.ts` | `ids()` y `readBase64()` |
| `src/domain/seed.ts`, `src/domain/projection.ts` | Ids fijos en los ejemplos; `deletedQuests` |
| `src/App.tsx` | `<SyncWatcher />` |
| `src/features/menu/components/MenuSettings.tsx` | `<SyncControl />` en los ajustes |
| `src/i18n/locales/{es,ja}.ts` | `syncEs` / `syncJa` bajo `sync` |

## Dependencias

- **`src/domain/blobs.ts`** (`blobsInUse`): qué binarios están en uso (adjuntos e ilustraciones de los encargos, mercader y personajes) para subirlos o bajarlos.
- **La usan:** `menu` (el control en los ajustes).

## Estado actual

- **Última verificación:** 2026-10-06, por el propietario con Google Drive de verdad entre el Mac, el iPhone y Windows. Antes, dos copias de la app nativa de macOS con bases distintas llegaron a los mismos eventos.
- **Tests:** `engine.test.ts` (la puerta de la fase 2: el mismo estado en cualquier orden).
- **Sin verificar:** los adjuntos con Drive de verdad (solo en los tests); la sincronización al cerrar la ventana y al salir de la app en iOS (cuánto deja iOS terminar); la caducidad a los 7 días; un personaje del menú llegando a otro equipo.
- **Historial:** [docs/history/verificacion/sync.md](../../../docs/history/verificacion/sync.md).

## Pendiente

- Publicar la app de Google Cloud en «In production»: está en la [hoja de ruta](../../../docs/INFORME-TECNICO.md#hoja-de-ruta).
- Borrar de Drive los binarios que dejan de usarse.
- Partir el archivo de cada equipo por meses cuando pase de unos MB (hoy se reescribe entero con cada novedad).
