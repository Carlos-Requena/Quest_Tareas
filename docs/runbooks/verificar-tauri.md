# Verificar la app nativa (macOS y Windows)

Hace falta cuando el cambio toca Rust, un plugin, un permiso, la CSP, SQLite o el almacén de binarios, o algo que el navegador no reproduce (el visor de PDF, el vídeo en WKWebView, la app empaquetada). Para iOS, [compilar-ios.md](compilar-ios.md).

## Arrancar

```bash
pnpm tauri dev                          # ventana nativa con recarga en caliente (Vite en 1420)
pnpm tauri build --debug --no-bundle    # app nativa de prueba, sin instalador (más rápido)
pnpm tauri build                        # instalador para el sistema actual
```

El instalador de Windows (`.msi` / `.exe`) se compila en Windows o en la CI, que lo deja como artefacto de cada run (sin firmar).

## La base de datos del propietario

`~/Library/Application Support/com.quests.app/quests.db` (macOS) y `%APPDATA%\com.quests.app\` (Windows), con sus archivos `quests.db-wal` y `quests.db-shm` si la app está abierta. Es su progreso real: **nunca la borres ni la edites** ([AGENTES §3](../AGENTES.md#3-comandos)). Consultas de solo lectura:

```bash
sqlite3 ~/Library/Application\ Support/com.quests.app/quests.db \
  "SELECT json_extract(body, '$.type') AS tipo, count(*) FROM events GROUP BY tipo;"
```

```bash
sqlite3 ~/Library/Application\ Support/com.quests.app/quests.db \
  "SELECT substr(id, 1, 12), mime, size FROM blobs;"
```

El snapshot (fila `snapshot` de `meta`) es una caché que la app recalcula sola si no vale; aun así, en la base del propietario no se toca: para ver cómo arranca sin él, hazlo en el navegador o en una copia.

**Una copia con otro identificador** tiene su propia base y su propio `deviceId`: `pnpm tauri build --debug --no-bundle --config '{"identifier":"com.quests.app.equipob"}'`. Pero el llavero usa siempre el servicio `com.quests.app`, así que **comparte la sesión de Google**: si el propietario está conectado, esa copia baja sus eventos de Drive y sube los suyos ([verificar-sync.md](verificar-sync.md)). No sirve para una prueba aislada.

## Empezar de cero

Para probar algo con la app vacía, **usa el navegador** (`pnpm dev`): no sincroniza y su `localStorage` se aparta y se devuelve sin tocar nada del propietario ([verificar-ui.md](verificar-ui.md#empezar-de-cero-en-el-navegador)).

Dejar vacía **la app nativa** es el último recurso y solo se hace si el propietario lo pide o lo autoriza de forma explícita. Antes, avísale de una consecuencia: si la sincronización está conectada, la app vacía no se queda vacía, porque baja todos los eventos de su Drive y sube los suyos (los ejemplos) con un `deviceId` nuevo. Desconectarla borra la sesión del llavero, que también es suya: tampoco sin permiso.

1. **Cierra la app** (con la app abierta, SQLite escribe en `quests.db-wal`).
2. **Mueve la base a una copia con fecha**, nunca la borres, y apunta su huella:

   ```bash
   D=~/Documents/Quests-copias/$(date +%F-%H%M)
   mkdir -p "$D"
   mv ~/Library/Application\ Support/com.quests.app/quests.db* "$D"/
   shasum -a 256 "$D"/quests.db > "$D"/quests.db.sha256
   ls -l "$D"
   ```

   Comprueba que en `$D` están `quests.db` (y, si existían, `-wal` y `-shm`) antes de seguir. En Windows, lo mismo con el Explorador: mueve los `quests.db*` de `%APPDATA%\com.quests.app\` a una carpeta con fecha.
3. **Abre la app**: crea una base nueva con los datos de ejemplo. Haz la prueba.
4. **Restaura**: cierra la app, aparta la base de prueba (también moviéndola, a `"$D"/prueba/`) y devuelve la original:

   ```bash
   mkdir -p "$D"/prueba
   mv ~/Library/Application\ Support/com.quests.app/quests.db* "$D"/prueba/
   mv "$D"/quests.db* ~/Library/Application\ Support/com.quests.app/
   diff <(cut -d' ' -f1 "$D"/quests.db.sha256) <(shasum -a 256 ~/Library/Application\ Support/com.quests.app/quests.db | cut -d' ' -f1) && echo "Restaurada idéntica"
   ```

   Hazlo en la misma terminal del paso 2 (o vuelve a poner `D` con esa carpeta). Si `diff` no dice «Restaurada idéntica», para y avisa al propietario. Abre la app y comprueba que ve sus datos. La carpeta `$D` se queda: la borra el propietario si quiere.

## Qué mirar

- **Logs de Rust** en la terminal de `pnpm tauri dev` (la sincronización escribe `[sync] …`).
- **Permisos:** un plugin nuevo necesita su permiso en `src-tauri/capabilities/default.json` y su registro en `src-tauri/src/lib.rs`; `tauri-build` valida los permisos al compilar (`cargo check` en `src-tauri/`).
- **CSP:** si algo no carga (vídeo, PDF, fondo, imágenes `blob:`), mira primero la CSP de `tauri.conf.json` (la tabla está en [COMO-FUNCIONA.md](../COMO-FUNCIONA.md#content-security-policy-csp)). En el navegador se puede probar la misma política como cabecera, pero lo que vale es la ventana nativa.
- **Archivos grandes por el puente:** el almacén de binarios viaja en base64 por IPC; prueba con un adjunto de varios MB.
- **Snapshot:** al arrancar, la app guarda o usa el snapshot de la tabla `meta`; en desarrollo avisa en la consola si no coincide con la proyección completa.

## Trampas conocidas

- **WebKit (macOS) frente a Chromium:** el vídeo se pide por trozos (`Range`) que el protocolo de Tauri no siempre atiende (por eso vídeo y música se cargan en memoria como `blob:`); WebKit solo arranca solo un vídeo mudo con el atributo `muted`.
- **Windows (WebView2)** tiene otro motor: fuentes, animaciones y visor de PDF pueden verse distintos. La app se ha usado allí para sincronizar, pero nadie la ha recorrido a fondo ([deuda](../INFORME-TECNICO.md#deuda-técnica-y-riesgos)).
- **Capturas de la ventana nativa:** hacen falta permisos de grabación de pantalla; si no los hay, dilo en el informe en vez de darla por vista.

## Icono de la app

Es el emblema del Quest Board (`Emblem` en `src/components/Header.tsx`), en `src-tauri/icons/source/app-icon.svg`. Si cambia:

1. Pásalo a PNG de 1024 px **sin transparencia**: `qlmanage -t -s 1024 -o . app-icon.svg` y quita el alfa con `sips` pasando por JPEG.
2. Genera todos los tamaños (escritorio e iOS): `pnpm tauri icon src-tauri/icons/source/app-icon.png`.
3. Quita solo la carpeta `src-tauri/icons/android/`, que acaba de crear el paso 2 (no hay app de Android); el resto de `src-tauri/icons/` se queda.
