# Historial de verificación · Encargos temporales

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/temporal/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## 2026-10-08 · Ilustraciones añadidas por el jugador

Con `pnpm dev` en el navegador del panel (Chromium), con datos de prueba. La ventana donde se añaden está en [customize](customize.md).

- **Tests:** `temporal_art_added` / `temporal_art_removed` (repetidas, quitadas que no vuelven, de un tipo desconocido, sin imagen o sin id, nombre vacío), `artsOf` por tipo y en orden, `artBlobIds` y que llegan a `GameState.temporalArts` sin tocar al jugador; `pickHero` sobre listas. Entran en `randomStream`.
- **Interfaz:** una ilustración añadida a Citación sale al azar junto a Subaru en seis encargos cumplidos, impresa en sepia en la animación; quitarla borra su binario de IndexedDB.
- **No se verificó:** la app nativa ni la llegada a otro equipo por Drive.

## 2026-10-08 · Ilustraciones al cumplir según el tipo

Con `pnpm dev` en el navegador del panel (Chromium), a unos 1.024 px y a 402 × 874, en japonés.

- **Tests:** `heroesByKind` agrupa por la carpeta de su tipo (también con mayúsculas) e ignora archivos sueltos y carpetas que no son un tipo; `pickHero` reparte el azar entre las de su tipo y no da ninguna con la carpeta vacía.
- **Interfaz:** encargos de prueba cumplidos con `completeTemporal`: una cacería enseña a Kazuma, una citación a Subaru (los dos en sepia, multiplicados sobre el pergamino y con los bordes fundidos) y una entrega, sin imágenes, la silueta de siempre. La «G» de la recompensa se lee aunque Subaru sea ancho. Sin errores en la consola.
- **Plugin:** `virtual:temporal-heroes` lista `hunt/kazuma.webp` y `summons/subaru.webp`; dejar un `.webp` en `public/temporal/scout/` recarga la app y lo añade. `virtual:menu-characters` sigue listando los cinco personajes del menú tras pasar a `publicList`.
- **Visto en el teléfono, sin arreglar (ya pasaba antes):** con 5 cifras de oro la fila de la recompensa se sale por los lados, las cinco calaveras se montan unas sobre otras y, con un título largo, tapan «依頼達成！».
- **No se verificó:** la app nativa (WKWebView) ni Windows.

## Registro hasta el 2026-10-07

Hecho el 2026-10-02 con `pnpm dev` en Chromium (Playwright), ventanas de 1.280 × 780 y 1.024 × 700.

- **Tipos y build**: `npx tsc --noEmit` y `pnpm build` correctos.
- **Dominio** (32 comprobaciones con marcas de tiempo fijas, importando los módulos puros en el navegador; repetidas en Madrid, Tokio y Ciudad de México, con el cambio de hora del 25 de octubre): urgencias en los bordes del día, encargos de todo el día, guardas de la proyección (creado dos veces, parche que intenta tocar estado y adjuntos, adjunto repetido, cumplido dos veces, edición tras cumplir, retirado que no resucita, cumplir antes de crear), XP y oro sumados al jugador sin duplicar, datos mal formados, mismo estado con los eventos reordenados, orden del tablón, aspecto estable y formulario (ida y vuelta de fecha y hora).
- **Datos antiguos**: con la versión anterior (`main`) se generaron datos reales (sembrado, aceptar, progresar y reportar con botín, 22 eventos). La versión nueva los proyecta **idénticos** (XP, oro, nivel, inventario, pity y estados) y el tablón de encargos sale vacío, sin errores.
- **Interfaz**: crear con imagen y PDF (también con `Ctrl+Enter`), tablón con 8 encargos de todas las urgencias, navegación con flechas, abrir y cerrar el cartel, visor de imagen, editar (parche + adjunto quitado), retirar en dos pasos, «Ver cumplidos», japonés, ventana mínima de 1.024 px y «reducir movimiento».
- **Almacén**: los binarios se guardan en IndexedDB y se borran al quitar el adjunto o retirar el encargo; los eventos solo llevan la referencia y la miniatura (unos 15 KB con una imagen).
- **Animaciones**: capturadas fase a fase pausando el reloj global de GSAP y avanzándolo a mano.
- **Sonido**: el audio de las dos animaciones se grabó redirigiendo Web Audio a un `OfflineAudioContext` con el mismo reloj, y se comparó su espectrograma con el de los vídeos (golpe, destello, tic-tic, melodía y campanilla en su sitio).

### Quests enlazadas

Hecho el 2026-10-02 con `pnpm dev` en Chromium (Playwright).

- **Dominio** (marcas de tiempo fijas, tres zonas horarias): cumplir con quests pendientes se ignora (sin XP); con una de dos, también; con las dos, se cumple y suma la XP de las quests y la del encargo; una quest retirada deja de bloquear; una repetible completada antes de enlazarla no cuenta y después sí; una quest no se enlaza a dos encargos pendientes; enlazar sin duplicar; desenlazar; el parche no toca las quests; un encargo antiguo sin `questIds` se cumple; mismo estado con los eventos reordenados; `temporalId` desaparece al cumplir el encargo.
- **Interfaz:** formulario con dos quests nuevas (una ×3), una enlazada del tablón y «en cadena» (se crean con sus requisitos encadenados y el aviso «2 quests nuevas en el Quest Board»); sello «0/3» en el cartel; cartel abierto con la lista y «Faltan 3 quests»; `Enter` avisa de la que falta; de la lista al Quest Board (con el filtro de plazo reiniciado); detalle de la quest con el cartel del encargo; al terminar la primera, aviso de desbloqueo; al terminar la última, «ya puedes cumplir…»; «Cumplir encargo» activo y animación final; editar (desenlazar una, crear otra: eventos `temporal_unlinked`, `quest_created`, `temporal_linked`); japonés.

### Aceptados y sin aceptar

Hecho el 2026-10-03 con `pnpm dev` en el navegador integrado, a 800 × 600 y a 402 × 874 (teléfono).

- **Tests** (Vitest): guardas de `temporal_accepted`, `temporal_postponed` y `temporal_completed` sin aceptar; el parche no acepta ni aplaza; los encargos sin `planned` nacen aceptados; orden y filtro; en la proyección, la quest en reserva no se acepta, sale al aceptar el encargo, sigue en curso si se aplaza con ella en curso y queda libre al retirar el encargo; invariante sobre historiales aleatorios (ninguna quest en reserva pasa a en curso) y la XP recalculada a mano con la nueva guarda; flujo completo con el store (crear sin aceptar, rechazos sin escribir eventos, aceptar, no aplazar con una quest en curso, aplazar). Prueba de mutación: quitar la guarda de `quest_accepted` o la de cumplir sin aceptar la detectan 2 tests cada una.
- **Interfaz**: clavar «Examen de japonés» sin aceptar con dos quests rápidas (quedan en reserva y no salen en el Quest Board), filtro con sus números, cartel abierto con «◇ En reserva» y «Aceptar encargo», aceptar con `Enter` (sello estampado, «Aceptado el…», quests en el Quest Board), aplazar (el sello se va y vuelven a la reserva), japonés y teléfono (filtros a lo ancho, botones en dos filas).

**No verificado**: el sonido del sello (es `sfx.stamp()`, el de siempre); la app nativa.

**No verificado** (versión anterior): la app nativa (`pnpm tauri dev`) con la tabla `blobs` de SQLite y el puente de archivos grandes en base64; Windows; el visor de PDF dentro del WebView de Tauri (en Chromium sin interfaz el visor sale en blanco, así que tampoco se vio en el navegador); la descarga de adjuntos en Tauri; escuchar los sonidos de verdad (solo se analizaron); y el rendimiento de los textos gigantes con filtros en el WKWebView de macOS.
