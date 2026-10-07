# Verificar la interfaz en el navegador

Casi todo se verifica con `pnpm dev` en el navegador: es el mismo código que la app nativa, con los datos en `localStorage` en lugar de SQLite. Lo nativo (SQLite, llavero, plugins, CSP real) se verifica con [verificar-tauri.md](verificar-tauri.md).

## Arrancar

- Si el puerto 1420 está ocupado, el propietario probablemente tiene la app abierta: **úsala** en `http://localhost:1420` en vez de arrancar otra copia. Si arrancas un servidor tú, páralo al terminar.
- El `localStorage` del navegador de pruebas es tuyo; el del navegador del propietario, no: **no lo vacíes** sin su permiso. Para empezar de cero, [apártalo y devuélvelo](#empezar-de-cero-en-el-navegador).

## Qué mirar

1. **El flujo completo** de lo que cambiaste, con el ratón y con el teclado.
2. **En japonés** (tecla `L`): textos que se salen, kana que ocupan el doble.
3. **En el teléfono**: ventana a **402 × 874** (un iPhone 17). Es el mismo CSS que en el iPhone; el simulador solo hace falta para lo nativo. Y en la ventana mínima del escritorio, **1.024 px**.
4. **La consola**, sin errores ni avisos nuevos.
5. **Datos antiguos**, si cambiaste un formato: carga datos generados con `main` y comprueba que se ven igual.
6. **Restaura el viewport** al terminar.

## Empezar de cero en el navegador

En el navegador la app no sincroniza (la sincronización sale «no disponible»), así que es el sitio para probar con datos vacíos. Los datos son las claves `quests.*` del `localStorage` de `http://localhost:1420` (los adjuntos van aparte, en IndexedDB `quests.blobs`, y no estorban). Si ese navegador es el del propietario, pídele permiso antes.

1. **Guarda una copia con fecha**, en la consola de la app:

   ```js
   const copia = Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("quests.")).map((k) => [k, localStorage.getItem(k)]));
   Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([JSON.stringify(copia)])), download: `quests-localStorage-${new Date().toISOString().slice(0, 10)}.json` }).click();
   ```

   Comprueba que se ha descargado el archivo antes de seguir.
2. **Aparta solo esas claves** y recarga: la app arranca vacía, con los datos de ejemplo.

   ```js
   for (const k of Object.keys(copia)) localStorage.removeItem(k);
   location.reload();
   ```

3. **Restaura** al terminar (la recarga del paso 2 borra `copia` de la consola: la fuente es el archivo descargado):

   ```js
   for (const k of Object.keys(localStorage).filter((k) => k.startsWith("quests."))) localStorage.removeItem(k);
   const datos = /* pega aquí el contenido del JSON descargado */ {};
   for (const [k, v] of Object.entries(datos)) localStorage.setItem(k, v);
   location.reload();
   ```

   Comprueba que se ven los datos de antes.

## Recetas

- **Llamar al dominio desde la app abierta:** `await import('/src/features/x/model.ts')` en la consola. Para el store, importa **la URL exacta** que cargó la app (ver trampas).
- **Lo que depende del tiempo** (horas, días): no esperes. Inyecta eventos con `ts` en el pasado en `localStorage["quests.events"]` y recarga, o adelanta el reloj de la página.
- **Animaciones fotograma a fotograma:** importa la misma instancia de GSAP que usa la app (la URL `/node_modules/.vite/deps/gsap.js?v=…` aparece en el código que sirve Vite, por ejemplo en `fetch('/src/lib/fx.ts')`), pausa `gsap.globalTimeline` y avánzalo con `.time(t + 1/60)` en bucle: los callbacks se disparan en orden. Si la captura repite un fotograma viejo, fuerza un repintado (cambiar el tamaño del viewport).
- **Oír sin altavoces:** sustituye `window.AudioContext` por un `OfflineAudioContext` cuyo `currentTime` sea el reloj de GSAP (pausado y avanzado a mano); al final, `startRendering()` da el audio exacto de la animación, que se guarda como WAV y se mide con un espectrograma (o se une a los fotogramas con `ffmpeg`). Desactiva antes la música (`quests.music`): `OfflineAudioContext` no tiene `createMediaElementSource`.

## Trampas conocidas del entorno (no son fallos de la app)

- **Dos copias del mismo módulo.** Tras una recarga en caliente, Vite sirve el módulo editado como `archivo.ts?t=…`. Importar `/src/store/game.ts` a mano puede dar **otra instancia** del store (sin `init()`, con `ready` en `false`), incluso tras recargar si cambió una dependencia. Importa la URL exacta: `performance.getEntriesByType("resource").map((e) => e.name).find((n) => n.includes("/src/store/game.ts"))`.
- **Recargas que fallan a medias** al crear varios archivos seguidos: pueden dejar módulos viejos vivos. Recarga entera (⌘R) antes de concluir nada.
- **Pestaña en segundo plano** (`document.hidden`): `requestAnimationFrame` se frena y GSAP no avanza. En la ventana real de la app no pasa.
- **Chromium sin GPU** (pruebas automáticas): los textos gigantes con filtros se pintan tan despacio que GSAP frena su reloj (*lag smoothing*); para capturar fases, pausa el reloj y avánzalo a mano.
- **Vídeo en el Chromium de Playwright:** no reproduce H.264. Por eso los vídeos llevan también WebM; si solo hubiera MP4, se vería el respaldo.
- **`gsap.set` y variables CSS con `var(...)`:** no las aplica. Usa `el.style.setProperty("--x", "var(--y)")`.
- **Ventana emulada en el panel del navegador:** los clics por coordenadas pueden caer fuera. Comprueba con un registro de eventos antes de dar un botón por roto.
- **Autoplay:** sin una interacción previa, el WebView no deja sonar el audio (y avisa en la consola). Un sonido al arrancar debe comprobar `navigator.userActivation.hasBeenActive`.
- **Portapapeles:** el navegador de pruebas puede no dar permiso; la app tiene un respaldo con `execCommand("copy")`.

## Tests de la interfaz y del store

- `vitest.config.ts` fija `TZ=Europe/Madrid`. Si un test de fechas pasa en tu equipo y falla en otro, crea fechas sin pasar por la zona horaria: usa `new Date(año, mes, día)` (hora local) o `deadlineIn`.
- Los tests del store usan `// @vitest-environment happy-dom` y `vi.mock("../lib/sfx", …)` con `src/test/sfxMock.ts` (en Node no hay `AudioContext`). Para simular cerrar y abrir la app, `vi.resetModules()` y vuelve a importar `src/store/game.ts` (ver `boot()` en `src/store/game.test.ts`).
