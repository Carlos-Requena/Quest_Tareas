# Sincronización con Google Drive (fase 2)

Cada equipo sube sus eventos a una carpeta `QuestsApp/` del Google Drive del jugador y baja los de los demás. Como los eventos son inmutables y la proyección es determinista, unirlos es suficiente: todos los equipos llegan al mismo estado. Es la fase 2 de la hoja de ruta, y su puerta: **dos equipos que trabajaron sin conexión llegan al mismo estado**.

## Requisitos

- Usar Quests en varios equipos (macOS, Windows e iPhone) con el mismo progreso, sin servidor propio.
- Funciona sin conexión: se juega igual y se sincroniza al volver.
- Sincroniza al abrir la app, cada 5 minutos, al volver a la ventana (si hace más de 1 minuto), al ocultarla si hay algo sin subir (en el iPhone, al salir de la app) y al cerrarla (como mucho 8 s).
- También los binarios: los PDF e imágenes de los encargos y el fondo del menú.
- La app solo ve sus propios archivos de Drive (permiso `drive.file`), y los tokens nunca llegan a disco ni al JavaScript.
- Indicador en la cabecera: una nube con un punto de estado y un panel para conectar, sincronizar o desconectar.

## Cómo funciona

```
 Equipo A                         Google Drive (QuestsApp/)                 Equipo B
 ┌───────────┐  sube su archivo   ┌──────────────────────────┐  baja       ┌───────────┐
 │ SQLite A  │ ─────────────────▶ │ events-A.jsonl           │ ──────────▶ │ merge()   │
 │           │ ◀───────────────── │ events-B.jsonl           │ ◀────────── │ SQLite B  │
 └───────────┘  baja y merge()    │ blob-<sha256>  (adjuntos)│  sube       └───────────┘
                                  └──────────────────────────┘
```

1. **Bajar.** Se listan los `events-*.jsonl` (por `appProperties`, no por carpeta). Los de otros equipos cuya `version` cambió desde la última vez se descargan, se leen (`decodeEvents`) y se fusionan con `EventStore.merge`, que ignora los que ya existen. Si entró algo nuevo, `store.rebuild()` recalcula el estado.
2. **Subir.** Si este equipo tiene eventos sin subir (`unsynced`) o su archivo no está en Drive, sube su archivo **entero** (`byDevice`). Después marca como subidos **solo** los que leyó antes de subir: lo que hagas durante la subida va en la siguiente.
3. **Binarios.** Se suben los que usa algún encargo o el fondo del menú y no están en Drive. Se bajan los que se usan y faltan aquí. Su nombre es su SHA-256, así que nunca cambian: cada uno se mueve una sola vez. Al bajarlo se comprueba que el contenido coincide con el hash.

Cada equipo escribe **solo su archivo**: nunca hay dos escritores sobre el mismo archivo, ni conflictos de escritura. Si dos equipos crean a la vez su carpeta `QuestsApp`, no pasa nada: los archivos se buscan por sus propiedades y se sube a la carpeta más antigua.

## En el iPhone

Lo único que cambia es **cómo se inicia sesión**. Bajar, fusionar, subir, los binarios, el llavero y Drive son el mismo código.

- **Otro cliente de Google, de tipo «iOS».** Google no admite la redirección a `127.0.0.1` para apps de iPhone, y en iOS una app no puede quedarse escuchando un puerto mientras Safari está delante. El cliente iOS **no tiene secreto** y vuelve a un esquema propio: el id del cliente al revés (`com.googleusercontent.apps.<id>:/oauth2redirect`). Tiene que estar **en el mismo proyecto de Google Cloud** que el de escritorio: Drive reconoce la app por el proyecto, y así los dos ven los mismos archivos con `drive.file`. Su *bundle ID* tiene que ser el de la app en iOS: **`com.requenadonacarlos.quests`** (`src-tauri/tauri.ios.conf.json`; `com.quests.app` ya lo tenía registrado otra cuenta de Apple).
- **La hoja de inicio de sesión del sistema**, `ASWebAuthenticationSession`, en un plugin propio: `src-tauri/plugins/web-auth` (Swift en `ios/`, Rust en `src/lib.rs`). iOS pregunta primero «"Quests" quiere usar accounts.google.com para iniciar sesión» y abre una hoja de Safari que comparte la sesión de Google de Safari. Cuando Google redirige al esquema, la hoja se cierra y devuelve la URL a **Rust**, que comprueba el `state` y canjea el código con PKCE, sin secreto. El plugin no tiene comandos para el JavaScript: la URL con el código nunca pasa por el WebView (ADR-28 sigue igual).
- **Cerrar la hoja sin terminar** devuelve `cancelled`: se vuelve a «Conectar» sin aviso de error.
- **El refresh token** va al llavero de iOS (el mismo crate `keyring`, `apple-native`). Se borra si se borra la app.
- **Sincronizar al salir.** En el iPhone no hay «cerrar la ventana»: salir de la app la oculta (`visibilitychange`) y es la última ocasión antes de que iOS la suspenda. Si hay algo sin subir, se sincroniza entonces.
- **La credencial** sale de `src-tauri/google-client-ios.plist` (el plist que da Google Cloud), `google-client-ios.json` (`{"client_id": "…"}`) o la variable `QUESTS_GOOGLE_IOS_CLIENT_ID`; las dos primeras, fuera del repositorio. `build.rs` elige la de iOS cuando compila para iOS. Ojo: la variable de entorno **no llega** cuando compila Xcode (`pnpm tauri ios build` / `dev`); en local, usa el archivo.

## Decisiones

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Rust hace el OAuth y todas las llamadas a Drive; el JavaScript solo pide «lista», «baja», «sube» | `fetch` desde el JavaScript con el token | El token nunca toca el WebView y la CSP sigue sin permitir conexiones de fuera |
| Refresh token en el llavero del sistema (crate `keyring`); access token solo en memoria | Guardarlo en SQLite o en un archivo | Es una credencial de Google: el llavero la cifra con la cuenta del usuario |
| PKCE + redirección a `127.0.0.1:<puerto libre>` | Copiar y pegar un código; esquema de URL propio | Es el flujo que recomienda Google para apps de escritorio, sin permisos ni registros nuevos |
| Permiso `drive.file` y una carpeta visible `QuestsApp/` | `drive.appdata` (carpeta oculta); `drive` entero | `drive.file` es el permiso que ya configuró el propietario; no requiere auditoría y deja ver (y copiar) los datos |
| Un archivo JSONL por equipo, reescrito entero | Un archivo por evento; añadir al final | Drive no permite añadir a un archivo. Un archivo por evento serían miles de peticiones. Unos KB o MB por equipo se suben en una petición |
| Cursor por archivo con su `version` de Drive, en `meta` | Bajar todo siempre | Una sincronización sin novedades no descarga nada |
| Binarios por SHA-256 y solo los que se usan | Sincronizar toda la tabla `blobs` | No se suben huérfanos y nunca se duplican |
| Datos de ejemplo con ids fijos (`seed:quest:*`) y lápida de quests retiradas (`ProjectionAcc.deletedQuests`) | Ids aleatorios | Dos equipos que empiezan vacíos tendrían los ejemplos duplicados al sincronizar; y uno que se instala tarde devolvería los que ya retiraste. Sube `PROJECTION_VERSION` a 4 |
| Credencial de la app en `src-tauri/google-client.json` (fuera del repositorio), incrustada al compilar por `build.rs`; en la CI, por secretos | En el código | Nunca en el repositorio. Para una app de escritorio, Google trata el *client secret* como no confidencial: va dentro del instalador |
| iOS: cliente «iOS» sin secreto y `ASWebAuthenticationSession` en un plugin propio (`plugins/web-auth`), con el canje en Rust | El cliente de escritorio con 127.0.0.1; `tauri-plugin-deep-link` + abrir Safari; el SDK de Google Sign-In; un plugin de la comunidad | 127.0.0.1 no vale en iOS. Con *deep links*, la URL con el código pasaría por el JavaScript y habría que registrar el esquema en Info.plist. El SDK de Google es mucho código y CocoaPods. Unas 60 líneas de Swift propias se revisan enteras |

## Tipos

| Tipo | Dónde | Qué es |
|---|---|---|
| `RemoteFile` | `model.ts` | Un archivo de Quests en Drive: id, nombre, tipo MIME, `version` y `appProperties` (`quests`: `events` o `blob`; `key`: deviceId o SHA-256) |
| `Cursors` | `model.ts` | `files`: id de archivo → versión ya leída. En la tabla `meta` (`sync.cursors`), por equipo |
| `SyncReport` | `model.ts` | Lo que hizo una sincronización: recibidos, enviados, binarios, líneas rechazadas |
| `SyncPhase` | `model.ts` | `unavailable` (navegador) · `unconfigured` · `signedOut` · `signingIn` · `idle` · `syncing` · `error` |
| `DriveApi`, `SyncBlobs`, `SyncDeps` | `engine.ts` | Lo que necesita `runSync`, inyectado: así se prueba con un Drive falso |
| `SyncState`, `SyncError` | `src-tauri/src/sync/mod.rs` | Estado nativo (cliente HTTP, access token, carpeta) y errores con un `code` estable |

## Eventos

No añade eventos. Viajan los que ya existen, con su `v` (los de una versión futura viajan y la proyección los ignora). Lo que es de cada equipo (cursores y cuenta) va en la tabla `meta`, no en eventos.

## Errores

| `code` (Rust) | Qué pasa | Qué se ve |
|---|---|---|
| `not_configured` | La app se compiló sin credencial | Nube apagada: «sin configurar» |
| `signed_out` | No hay sesión, o caducó (7 días con la app en pruebas) | Se vuelve a «Conectar» y avisa |
| `consent_denied`, `missing_scope` | No se dio permiso, o se desmarcó Drive | Aviso para volver a conectar |
| `cancelled` | iOS: se cerró la hoja de inicio de sesión sin terminar | Nada: se vuelve a «Conectar» |
| `timeout` | No se volvió del navegador en 5 minutos | Aviso |
| `network` | Sin conexión | Punto rojo; en las automáticas no avisa y se reintenta |
| `drive`, `auth`, `keyring`, `other` | Fallo de Google o del sistema | Punto rojo y el motivo en el panel; el detalle va a la salida de error de Rust (`[sync] …`) |

## Archivos

| Archivo | Qué hace |
|---|---|
| `model.ts` | Puro: nombres, JSONL (`encodeEvents` / `decodeEvents`), `planEvents`, `planBlobs` |
| `engine.ts` | `runSync(deps)`: bajar, fusionar, subir y binarios, con todo inyectado |
| `drive.ts` | Puente con Rust (`invoke`) y tipo de los errores nativos |
| `storage.ts` | Cursores y cuenta en la tabla `meta` |
| `actions.ts` | Conectar, desconectar, sincronizar (una a la vez), cuándo hacerlo y al cerrar |
| `ui.ts` | Estado de la interfaz (Zustand) |
| `components/SyncControl.tsx` | La nube de la cabecera con su panel, y `SyncWatcher` (arranca al cargar el juego) |
| `i18n.ts`, `sync.css` | Textos es + ja y estilos |
| `src-tauri/src/sync/` | `oauth.rs` (PKCE con 127.0.0.1 o la hoja de iOS, llavero, refresco, desconexión), `drive.rs` (listar, bajar, subir con subida reanudable), `mod.rs` (comandos) |
| `src-tauri/plugins/web-auth/` | Plugin de Tauri con `ASWebAuthenticationSession` (Swift); solo hace algo en iOS |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src-tauri/Cargo.toml`, `build.rs`, `src/lib.rs` | `reqwest` (TLS nativo), `keyring`, `tokio`, `open`…; la credencial al compilar; los 8 comandos |
| `src-tauri/capabilities/default.json` | `core:window:allow-destroy`: al escuchar el cierre de la ventana, Tauri la cierra desde el JavaScript |
| `src-tauri/.gitignore` | `/google-client.json`, `/google-client-ios.plist`, `/google-client-ios.json` |
| `src-tauri/Cargo.toml`, `src/lib.rs` | `tauri-plugin-web-auth` (ruta local) y su registro |
| `.github/workflows/ci.yml` | Secretos `QUESTS_GOOGLE_CLIENT_ID` y `QUESTS_GOOGLE_CLIENT_SECRET` |
| `src/storage/eventStore.ts` | `byDevice`; inserciones y `markSynced` por lotes (antes, una sentencia por evento) |
| `src/storage/blobStore.ts` | `ids()` y `readBase64()` |
| `src/domain/seed.ts`, `projection.ts` | Ids fijos en los ejemplos; `deletedQuests`; `PROJECTION_VERSION` 4 |
| `src/components/Header.tsx`, `src/App.tsx` | `<SyncControl />` y `<SyncWatcher />` |
| `src/i18n/locales/{es,ja}.ts` | `syncEs` / `syncJa` bajo `sync` |

## Verificación

- **Tests** (`engine.test.ts`, 18, con dos o tres «equipos» en memoria y un Drive falso, `src/test/memory.ts`):
  - 6 historiales aleatorios de 300 eventos por equipo que tocan las mismas quests: los dos llegan a los mismos 600 eventos y al mismo estado.
  - Con tres equipos, el orden de las sincronizaciones no cambia el resultado.
  - Una sincronización sin novedades no sube ni baja nada.
  - Cada equipo escribe solo su archivo.
  - Un evento hecho durante la subida va en la siguiente.
  - Un fallo a medias no pierde lo ya fusionado.
  - Las líneas rotas y las de otro equipo se saltan.
  - Los eventos de una versión futura viajan sin cambiar el estado.
  - Los adjuntos viajan una sola vez, los huérfanos no suben y uno dañado no se guarda.
  - Los ejemplos de dos equipos se juntan, y uno retirado no vuelve.
- **Prueba de mutación:** de 4 errores introducidos, los tests detectan 3. El cuarto (marcar como subido todo lo leído para subir) es equivalente: incluye siempre lo que no estaba subido.
- **En la app nativa de macOS, con Google Drive de verdad**, se usaron dos copias de la app con identificadores distintos (dos bases y dos `deviceId`):
  - Inicio de sesión con PKCE y token en el llavero.
  - A subió sus 15 eventos y B bajó esos 15 y subió los suyos. Los ejemplos se juntaron: 5 quests y 10 objetos.
  - El propietario aceptó, avanzó y completó quests en las dos copias. Tras sincronizar, las dos tenían los mismos 37 eventos, todos subidos y sin errores.
  - El primer intento tras conectar falló sin dejar rastro. Al volver a abrir funcionó; lo más probable es que la API de Drive aún no estuviera activa (se había activado minutos antes). Desde entonces, los fallos se registran (`[sync] …`).
- **iPhone (simulador de iOS 27)**, con un id de cliente falso (`google-client-ios.json` temporal):
  - El llavero de iOS responde (sale «Conectar», no un error).
  - «Conectar» abre el aviso del sistema y la hoja de Safari con la página de Google, que contesta `invalid_client` (lo esperado con un id falso): la URL, el esquema y el plugin funcionan.
  - Cerrar la hoja vuelve a «Conectar» sin aviso.
- **iPhone (simulador), con el cliente iOS de verdad** (proyecto 1002522575092, el mismo que el de escritorio; *bundle ID* creado como `com.quests.app`; hay que cambiarlo a `com.requenadonacarlos.quests`): Google acepta el cliente y enseña su página de inicio de sesión («continuar a "Quests"»). No se llegó a iniciar sesión.
- **Sin probar:**
  - Iniciar sesión en iOS de principio a fin, el canje del código sin secreto y la sincronización entre el iPhone y el Mac (falta crear el cliente iOS en Google Cloud).
  - Sincronizar al salir de la app en iOS (cuánto deja iOS terminar antes de suspenderla).
  - Windows.
  - Los adjuntos con Drive de verdad (solo en los tests).
  - La sincronización al cerrar la ventana.
  - La caducidad a los 7 días.
  - Dos equipos físicos distintos.
