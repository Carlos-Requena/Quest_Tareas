# Changelog técnico

Cómo llegó Quests a su estado actual: las fases, las versiones de la proyección, las cifras de cada época y los fallos que aparecieron y cómo se resolvieron. **Es un registro**: no describe la app de hoy (para eso, [COMO-FUNCIONA.md](../COMO-FUNCIONA.md), el [informe](../INFORME-TECNICO.md) y el README de cada funcionalidad). Lo nuevo va arriba en cada tabla.

El historial de verificación de cada funcionalidad está en [verificacion/](verificacion/).

---

## Cronología

| Fecha | Cambio | `PROJECTION_VERSION` | Tests en ese momento |
|---|---|---|---|
| 2026-10-08 | Personajes vivos (malla de WebGL, aura, partículas, entrada gacha; vídeo e imagen animada como personaje) y compañero de Mi día, editables en la personalización (ADR-52). El mismo día: personalización con frases e ilustraciones (ADR-51) | 13 | 496 en 42 archivos |
| 2026-10-07 | Consolidación de la documentación: mapas de símbolos en las funcionalidades grandes (menu, items, temporal, failure, chronicle, merchant, sync), procedimientos seguros para empezar de cero, copias duplicadas sustituidas por enlaces y comprobaciones nuevas en `scripts/docs.mjs` (símbolos enlazados, archivos ajenos en `docs/`, numeración de las ADR, claves del frontmatter, comandos destructivos y cifras de líneas) | 11 | 464 en 39 archivos |
| 2026-10-07 | Documentación reestructurada: guía compacta, índice generado desde el código (`pnpm docs:index`), una ADR por archivo, runbooks, historial aparte y una plantilla común para los README | 11 | 464 en 39 archivos |
| 2026-10-07 | Personajes del menú: rotación diaria, elegir para hoy, añadir y quitar con imagen sincronizada (ADR-50) | 11 | 464 en 39 archivos |
| 2026-10-07 | Menú de opciones al estilo de un gacha; la barra del teléfono pasa de seis botones a cuatro (ADR-49) | 10 | 452 en 39 archivos |
| 2026-10-06 | Uso diario: editar (ADR-42), deshacer (ADR-43), fallos (ADR-44), repetición por días (ADR-45), Mi día (ADR-46), avisos del sistema (ADR-47), alta rápida y búsqueda (ADR-48). El propietario prueba la sincronización con el iPhone y con Windows | 10 | 447 en 38 archivos |
| 2026-10-03 | Calendario y agenda personal (ADR-40, ADR-41) | 9 | 394 |
| 2026-10-03 | Encargos aceptados y sin aceptar (ADR-38); contactos (ADR-39) | 8 | 375 |
| 2026-10-03 | Coleccionables únicos y tipos fijos de objeto (ADR-36); un almanaque por tipo (ADR-37) | 7 | — |
| 2026-10-03 | Recompensa calculada (ADR-35) | 5 | — |
| 2026-10-03 | App de iPhone: compilación release con Xcode 27 e instalación en un iPhone 15 Pro Max (ADR-34); sin límite de quests en curso (ADR-33) | 4 | 336 en 25 archivos |
| 2026-10-02 | App de iPhone en el simulador e inicio de sesión de Google en iOS (ADR-31, ADR-32) | 4 | — |
| 2026-10-02 | **Fase 2**: sincronización con Google Drive (ADR-28 a ADR-30) | 4 | 332 en 24 archivos |
| 2026-10-02 | **Fase 1.5** (endurecimiento): eventos versionados, reloj lógico híbrido, error boundary, CSP estricta y CI en macOS y Windows (ADR-24 a ADR-27) | 3 | 314 |
| 2026-10-02 | Equipo de serie, rachas, objetivo de tipo lista y crónica (ADR-21 a ADR-23) | 3 | 302 en 21 archivos |
| 2026-10-02 | Mercader, personaje con su equipo y atributos (ADR-18 a ADR-20) | 2 | — |
| 2026-10-02 | Snapshot de la proyección y primeros tests con Vitest (ADR-16, ADR-17) | 1 | 231 en 13 archivos |
| 2026-10-02 | Quests complejas, plazos y encargos con quests enlazadas (ADR-13 a ADR-15) | — | — |
| 2026-10-02 | Encargos temporales con adjuntos (ADR-11, ADR-12) | — | — |
| 2026-10-02 | Objetos con rareza, drops y el cofre del botín (ADR-09, ADR-10) | — | — |
| 2026-10-01 | **Fase 1**: tablón, animaciones, SQLite con eventos, español y japonés, pomodoro y música | — | — |

Las cifras de tests son las que se apuntaron en la documentación de cada momento; un «—» es que no se apuntó. La actual la da `pnpm test`.

## Versiones de la proyección

`PROJECTION_VERSION` sube cada vez que cambia el resultado de `project()` para eventos ya guardados; un snapshot de otra versión se descarta y se recalcula todo una vez.

| Versión | Por qué subió |
|---|---|
| 13 | El acumulador gana los estilos de los personajes (`character_style_*`) y el compañero de Mi día (`companion_*`); quitar un personaje se lleva los dos |
| 12 | Los acumuladores ganan las frases de los personajes del menú (`voice_line_*`) y las ilustraciones de «Encargo cumplido» del jugador (`temporal_art_*`) |
| 11 | El acumulador gana los personajes del menú (`character_added`, `character_removed`) |
| 10 | Editar quests, deshacer, fallos y repetición por días de la semana |
| 9 | El acumulador gana la agenda |
| 8 | Cada encargo guarda cuándo se aceptó (`acceptedAt`); las quests de los no aceptados quedan en reserva |
| 7 | Coleccionables únicos (un repetido de cofre se quema), tipos fijos de objeto y cuándo se compró cada coleccionable. La 6 fue un paso intermedio de la misma tarea (solo los coleccionables únicos) |
| 5 | La recompensa de quests y encargos pasa a calcularse en la proyección |
| 4 | Lápida de las quests retiradas (`deletedQuests`) para la sincronización |
| 3 | Rachas, crónica y objetivo de tipo lista |
| 2 | Mercader y equipo (y los atributos, calculados de `quest_completed`) |
| 1 | Nace con el snapshot |

`EVENT_VERSION` es 1 desde la fase 1.5: los eventos anteriores no llevan `v` y cuentan como 0 (el paso de 0 a 1 no cambia el formato).

## Deuda resuelta

| Prioridad | Problema | Riesgo | Solución |
| --- | --- | --- | --- |
| Baja | Resuelto: los eventos no tenían versión | Ninguno ya | Hecho: campo `v`, `EVENT_VERSION` y `UPCASTERS` (ADR-24) |
| Baja | Resuelto: orden por reloj local | Ninguno ya; con más de 1 minuto de deriva se recalcula todo | Hecho: reloj lógico híbrido (ADR-25) |
| Baja | Resuelto: sin error boundary en React | Ninguno ya | Hecho: `features/recovery` (ADR-27) |
| Baja | Resuelto: tokens OAuth sin destino seguro | Ninguno ya | Hecho: refresh token en el llavero (crate `keyring`), access token solo en la memoria de Rust; el JavaScript nunca ve un token (ADR-28) |
| Baja | Resuelto: CSP desactivada | Ninguno ya; falta verla a simple vista en la app nativa | Hecho: CSP estricta en `tauri.conf.json` (ADR-26) |
| Baja | Resuelto: los textos estaban fijos en español | Ninguno ya | Hecho: i18next con español y japonés en `src/i18n/`, diccionarios tipados |
| Baja | Resuelto: no se podían editar quests | Ninguno ya | Hecho: `quest_updated` (ADR-42) |

Después, también se resolvieron el icono por defecto (ahora es el emblema del Quest Board) y la sincronización de los binarios (ADR-29).

## Fallos encontrados y corregidos

| Síntoma | Causa | Solución |
|---|---|---|
| Hu Tao quieta en la app de macOS (visto por el propietario, 2026-10-02) | «Reducir movimiento» la dejaba quieta a propósito; el WebView de macOS pide el vídeo por trozos (`Range`) y la app empaquetada puede no atenderlos; WebKit no arranca solo un vídeo sin el atributo `muted` | Vídeo en memoria (`blob:`), mudo antes de la fuente, `play()` al poder y con el primer clic, y se mueve también con «reducir movimiento». Sin verificar aún en la app nativa de macOS |
| La primera pista de música desapareció tras un build | Se dejó en `dist/assets/Musica/`, que se borra en cada build | Las pistas van en `public/music/` (norma: nada en `dist/`) |
| Los días hasta el cambio del escaparate daban 8 el lunes a primera hora de la semana del cambio de hora | Se contaban milisegundos | Se cuentan medianoches (lo encontró un test del menú) |
| Quests de ejemplo duplicadas | El modo estricto de React llamaba a `init()` dos veces a la vez | Memorizar la promesa (`initOnce`) |
| Trocitos de grieta visibles en tarjetas no aceptadas | El truco del `dasharray` deja asomar puntos con algunos renderizados | Ocultar el SVG entero (`opacity: 0`) hasta aceptar |
| Repetible en espera con el sello «EN CURSO» | Al limpiar el efecto, `tl.progress(1)` volvía a dejar el sello visible justo después de que React lo ocultara | Que GSAP controle siempre la visibilidad; la limpieza solo hace `tl.kill()` |
| Ventana en negro tras «Quest Clear» en la app nativa | Al cerrar, GSAP revertía el contador y su `onUpdate` usaba una referencia de React que ya era `null` | Capturar el elemento en una constante (`const el = root.current`) |
| El aviso «aceptada» se quedaba para siempre | No había caducidad | Borrado automático a los 4,5 s |
| Build de 27 MB | Subconjuntos japoneses de la fuente | Solo subconjunto latino |
| Los atributos salían en español con la interfaz en japonés | Las áreas son texto del usuario y las de ejemplo se escriben en el idioma del primer arranque | Áreas conocidas con su traducción (`KNOWN_AREAS`); «Salud» y «健康» son el mismo atributo |
| En japonés, la última línea de una página de la crónica se cortaba | Las páginas se llenaban estimando por la longitud del título, y el japonés ocupa el doble | Medir el libro y pesar cada entrada por su texto ya escrito (`textUnits`) |
| El color del cofre no subía de rareza | `gsap.set(el, { "--rc": "var(--r-epic)" })` no aplica un valor `var(...)` a una variable CSS | `el.style.setProperty("--rc", …)` |
| Imágenes del almanaque en negro | El estilo de «no conseguido» era una silueta (`brightness(0)`) | Color apagado (`saturate` + `opacity`) |
| Con el selector de tablón, toda la ventana se ensanchaba y se cortaba por la derecha | La cabecera no cabía y la columna implícita de la rejilla de `.app` crecía hasta su contenido | `grid-template-columns: minmax(0, 1fr)` y una cabecera más compacta por debajo de 1.180 px (ya se desbordaba a 1.024 px antes) |
| Los recordatorios no se veían con el tablón de quests vacío | El aviso (`Toast`) solo se pintaba con una quest seleccionada | Pintarlo también en el estado vacío |
| La campana del recordatorio al abrir la app daba avisos de autoplay | El WebView bloquea el audio antes de la primera interacción | Sin interacción previa (`navigator.userActivation`), solo el aviso |
| Eventos del mismo milisegundo en orden inverso: un `quest_completed` antes de su `quest_accepted` se ignoraba (lo destaparon los tests del store) | El desempate de `ts` es el `id`, un UUID aleatorio; las acciones que emiten varios eventos seguidos los producían en el mismo milisegundo | `nextTs`: cada evento nuevo va al menos 1 ms después del último aplicado |
| El pie se desbordaba en la ventana mínima (1.024 px) al añadir las teclas `C` y `P` | La regla estrecha de `.ft` estaba antes que la base en `app.css`: con la misma especificidad gana la última, así que **nunca se había aplicado** | Moverla detrás de la regla base; en ventana estrecha, las teclas de las ventanas (objetos, mercader, personaje) quedan con su icono |
| La cabecera se desbordaba entre 1.181 y 1.249 px con los botones del mercader y del personaje | El ajuste compacto empezaba en 1.180 px | Empieza en 1.260 px |
| Tras cerrar una ventana (mercader, personaje…), el clic siguiente no hacía nada; en el teléfono, el primer toque en la barra | El fondo, ya invisible, seguía encima hasta 1,4 s, mientras terminaban las animaciones de dentro (la escala con muelle, el muñeco, Hu Tao) | `BACKDROP_EXIT` (`src/lib/motion.ts`): el fondo deja de recibir clics en cuanto empieza a irse; la ventana sale con duración fija |

## Cómo se construyó la fase 1

Este fue el orden de trabajo, y el motivo de cada paso:

1. **Analizar el vídeo de referencia.** Con `ffmpeg` se extrajeron fotogramas en una cuadrícula para estudiar el diseño: fondo oscuro, acentos dorados, un color por categoría, el sello «受注中» con destello y las grietas sobre las tarjetas aceptadas.
2. **Crear el proyecto.** `pnpm create tauri-app` con la plantilla `react-ts`. Se quitó el plugin `opener`, que entonces no se usaba (volvió con los contactos), y se añadió `tauri-plugin-sql` con SQLite.
3. **Dominio primero** (`src/domain/`): tipos, eventos, proyección y niveles, sin ninguna interfaz. Es la parte que más importa que sea correcta.
4. **Almacenamiento** (`src/storage/`): una interfaz `EventStore` y dos implementaciones.
5. **Store y acciones** (`src/store/`): conectan el dominio con React.
6. **Interfaz** (`src/components/`): primero estructura y estilos, después las animaciones.
7. **Verificación**: primero en el navegador integrado (más rápido de inspeccionar) y luego en la app nativa con SQLite. Aparecieron varios fallos, que están en la tabla [«Fallos encontrados y corregidos»](#fallos-encontrados-y-corregidos).

El backend de Rust se compiló en segundo plano mientras se escribía el frontend, porque la primera compilación tarda.

## La fase 1 en cifras

Unas 1.930 líneas de TypeScript y 1.160 de CSS. La estructura de entonces:

Las dependencias van en un solo sentido: `components` → `store` → `domain` ← `storage`. El dominio no importa nada de React, Zustand ni Tauri; es la regla que hay que proteger al crecer.

| Módulo | Archivos | Líneas | Responsabilidad |
| --- | --- | --- | --- |
| `src/domain/` | types, events, projection, leveling, seed | 332 | Reglas del juego puras: tipos, eventos, proyección, curva de XP, rangos, datos de ejemplo |
| `src/storage/` | eventStore | 127 | Interfaz `EventStore` y sus dos implementaciones (SQLite y localStorage) |
| `src/store/` | game, actions | 158 | Store Zustand (eventos + estado + UI) y casos de uso (aceptar, progresar, reportar, abandonar) |
| `src/components/` | Header, Tabs, QuestCard, QuestDetail, CreateQuestModal, ClearOverlay, Footer | 1.041 | Interfaz y animaciones |
| `src/lib/` | sfx, id, time | 124 | Utilidades: sonido, UUID, PRNG con semilla, formato de tiempo |
| `src/App.tsx`, `main.tsx` | — | 152 | Composición, filtrado del tablón y navegación por teclado |
| `src/styles/` | theme, app | 1.164 | Tokens de color y tipografía; estilos de componentes |
| `src-tauri/` | lib.rs, tauri.conf.json, capabilities | ~40 | Ventana, plugin SQL y permisos mínimos (`sql:default`, `sql:allow-execute`) |

Convenciones a mantener:

- Toda escritura pasa por `dispatch(evento)`; ningún componente modifica el estado directamente.
- La lógica que decide (¿se puede aceptar?, ¿está completa?) vive en `domain/` o `store/actions.ts`, nunca en un componente.
- Las animaciones leen el cambio de estado; no lo provocan.

**Una carpeta por funcionalidad.** Cada funcionalidad nueva vive en `src/features/<nombre>/` con su modelo, eventos, acciones, componentes, textos y un `README.md` de diseño. Ya existen `pomodoro` (dominio, con eventos), `music` (servicio local, sin eventos), `items` (entidades propias, azar e imágenes), `temporal` (sección propia, estado de UI propio, archivos adjuntos y quests enlazadas), `complex` (repetición y requisitos, sin eventos propios) y `horizon` (plazos calculados, sin eventos); después, `snapshot` (infraestructura), `merchant` (el mercader: catálogo, precios, escaparate semanal y compras), `equipment` (el muñeco, el armario y la decoración del menú) y `attributes` (un nivel por área de las quests, sin eventos). El dominio importa solo el `model.ts` de cada funcionalidad, nunca su `index.ts`, para no crear ciclos con el store.

## Estado del proyecto según el informe, hasta el 2026-10-07

La tabla de estado que tenía el informe técnico antes de pasar el estado de cada funcionalidad a su README:

Todas las funciones de la fase 1 están hechas; la verificación ha sido manual (navegador integrado y app nativa en macOS).

| Funcionalidad | Estado | Cómo se verificó |
| --- | --- | --- |
| Tablón con pestañas por categoría (Élite, Repetible, Encargo) | Hecho | Prueba manual en navegador |
| Crear quest con objetivos, recompensa y tiempo de reaparición | Hecho | Prueba manual: formulario completo publicado |
| Aceptar: sello «EN CURSO», destello, temblor y grietas | Hecho | Capturas durante la animación |
| Progreso por objetivo con botones +/− | Hecho | Prueba manual |
| Reportar: tarjeta rota, «Quest Clear», contadores, «Level Up!» | Hecho | Capturas de la secuencia completa |
| Repetibles con espera («Vuelve en 20 h») | Hecho | Prueba manual tras corregir un fallo del sello |
| Abandonar y retirar quests | Hecho | Prueba manual |
| Niveles, rangos F–S y oro (sin límite de quests en curso desde la app de iPhone) | Hecho | Comprobado: 400 XP → nivel 3, 1.150 XP → nivel 4 |
| Persistencia SQLite en la app nativa | Hecho | Base `quests.db` inspeccionada con `sqlite3` |
| Atajos de teclado | Hecho | Flechas, Enter y X probados; la tecla `+` no se pudo probar |
| Sonidos sintetizados con botón de silencio | Hecho | Sin verificación auditiva |
| Quests complejas: repetición en cualquier categoría (también «cada 3 días») y requisitos con candado | Hecho | Comprobaciones del dominio con marcas de tiempo fijas en tres zonas horarias y prueba en navegador (Playwright) |
| Plazos: filtro de 1 día, 7 días, 2 semanas, 1 mes y más de un mes en los dos tablones; fecha límite de las quests | Hecho | Bordes de cada plazo, cambio de hora y prueba en navegador, también en japonés y a 1.024 px |
| Encargos con quests enlazadas: se crean en el Quest Board y hay que terminarlas para cumplir el encargo | Hecho | Guardas de la proyección, datos antiguos proyectados idénticos y flujo completo en navegador |
| Snapshot de la proyección: cada acción aplica solo su evento y el arranque parte del último snapshot | Hecho | Tests con 25 historiales aleatorios cortados en 10 puntos y prueba en navegador (snapshot falseado, evento antiguo, reloj atrasado); app nativa: arranque, cola, evento antiguo y snapshot falseado sobre la base real |
| Mercader (Hu Tao) con escaparate semanal, personaje con su equipo y decoración del menú, y atributos por área con radar | Hecho | Tests del dominio y del store (compras, doble gasto entre dispositivos, escaparate con cambios de hora, equipo, atributos) y prueba en navegador con Playwright: crear piezas, comprar, equiparlas, fondo y emblema, japonés y de 1.024 a 1.440 px. Sin probar en la app nativa |
| 69 piezas de serie del mercader (Mushoku Tensei, Re:Zero, Konosuba, JRPG) con precio por ranura, rachas de las repetibles, objetivo de tipo lista, crónica del aventurero y áreas traducidas | Hecho | 302 tests en 21 archivos; prueba en navegador con un historial de 14 días, en español y japonés, de 1.024 a 1.300 px; un snapshot de la versión 2 se descarta y se recalcula. Sin probar en la app nativa (tampoco el arreglo del vídeo de Hu Tao) |
| Eventos versionados (`v`, `EVENT_VERSION`, `upcastEvent`) | Hecho | Tests: sin `v`, actual y futura dan el estado esperado; los de una versión futura se ignoran (prueba de mutación: quitar la guarda la detectan 2 tests) |
| Reloj lógico híbrido (`nextTs` con deriva máxima de 1 minuto) | Hecho | Tests con dos equipos desfasados y con el store (fusionar eventos de un equipo adelantado 30 s); con la regla anterior de 1 s fallan 2 tests |
| Error boundary con pantalla de recuperación | Hecho | Fallo forzado en el navegador: sale la pantalla y «Volver a intentarlo» devuelve el tablón |
| CSP estricta | Hecho | La misma política como cabecera en Chromium (build de producción): sin bloqueos en el tablón, el mercader con su vídeo, el personaje, la música y un PDF en `blob:`. App nativa de macOS: arranca y abre la base de datos con la CSP; sin revisar la ventana a simple vista |
| CI en macOS y Windows | Hecho | `.github/workflows/ci.yml`: tipos, tests y build con `tauri-action` en los dos sistemas |
| Prueba a mano en Windows | Pendiente | La CI deja el instalador como artefacto |
| Tests automáticos | Hecho | 332 tests en 24 archivos (dominio, store y sincronización); prueba de mutación: detectan 19 de 20 errores introducidos, y 11 de 11 en el mercader, el equipo y los atributos. Sin tests del almacén de binarios ni de la interfaz |
| App de iPhone: Tauri para iOS e interfaz de teléfono (barra de abajo, detalle y ventanas a pantalla completa, deslizar para pasar página) | Hecho | 4 tests nuevos (336 en 25 archivos). En el navegador a 402 × 874: todas las pantallas y animaciones, en español; escritorio sin cambios. En el simulador de iOS 27: arranca, guarda en SQLite y lo conserva al reinstalar, toques de verdad en el tablón y el detalle. Sin probar en un iPhone de verdad, ni el sonido, los PDF o el iPad |
| Inicio de sesión de Google en iOS (plugin `web-auth` con `ASWebAuthenticationSession`) | Hecho, a falta de iniciar sesión | En el simulador con un id falso: el llavero responde, se abre la hoja con la página de Google (que rechaza el id) y cerrarla no da error. Con el cliente iOS de verdad (creado en el mismo proyecto), Google enseña su página de inicio de sesión. Falta iniciar sesión para probar el canje y la sincronización iPhone ↔ Mac |
| Encargos aceptados y sin aceptar: sello «ACCEPTED», quests en reserva hasta aceptarlo, aplazar y filtro Todos · Aceptados · Sin aceptar | Hecho | 375 tests (guardas, datos antiguos, invariante de la reserva y flujo con el store; prueba de mutación 2 de 2). En el navegador a 800 × 600 y 402 × 874, en español y japonés. Sin probar en la app nativa |
| Contactos en quests y encargos: desplegable con teléfono, correo, WhatsApp, enlace o dirección, y botones Llamar, Escribir, Abrir, Cómo llegar y Copiar | Hecho | Tests de validación, enlaces (solo `tel:`, `mailto:` y `https:`), limpieza y proyección; `cargo check` con el plugin. En el navegador a 800 × 600 y 402 × 874. Sin abrir de verdad Teléfono, Mail o Mapas en la app nativa ni en el iPhone |
| Calendario (semana y día por horas) y agenda personal con bloques que se repiten; añadir bloques, quests o encargos desde un día | Hecho | 394 tests (días y cambio de hora, repetición, guardas, reparto en columnas y acciones con el store). En el navegador a 1024 × 768 y 402 × 874, en español y japonés. Sin probar en la app nativa ni en el iPhone |
| Editar quests (`quest_updated`), deshacer (`event_undone`, ⌘Z) y alta rápida de una línea | Hecho | 447 tests en 38 archivos (parches, guardas, círculos, ventana de deshacer, deshacer con snapshot y al volver a abrir la app, marcas del alta rápida). En el navegador a 1280 × 820 y 402 × 874. Sin probar en la app nativa |
| Fallos: la quest se fractura y el cartel del encargo se quema al acabar el día de su fecha; volver a clavar | Hecho | Tests de plazos (cambio de hora), guardas, quests de un encargo, perdón y store. En el navegador con el reloj adelantado: las dos animaciones, la crónica, el cartel quemado y las copias. Sin probar en la app nativa ni escuchar el sonido |
| Repetición por días de la semana, «Mi día» en el calendario y búsqueda | Hecho | Tests (siguiente día, racha, calendario, plan del día, búsqueda sin tildes y con kana). En el navegador en español y japonés, escritorio y teléfono |
| Avisos del sistema (`tauri-plugin-notification`) | Hecho, sin ver un aviso de verdad | Tests del plan; `cargo check` y compilación para el simulador de iOS con el plugin; en el navegador, el temporizador avisa a su hora. Sin ver un aviso del sistema en macOS, Windows ni el iPhone |
| Menú de opciones: pestaña «MENU» (tecla `O`) con barrido, Kazuma, tarjetas de cada sección en 3D, coleccionable de la semana y ajustes; barra del teléfono a cuatro botones | Hecho | 452 tests en 39 archivos (partes del día, quest actual y días hasta el escaparate con cambio de hora). En el navegador a 1280 × 800, 1024 × 680 y 402 × 874, en español y japonés: barrido, paralaje, ventanas encima del menú y Escape, secciones y búsqueda. Sin probar en la app nativa ni en el iPhone, ni el sonido del barrido |
| Personajes del menú: rotación diaria sin repetir, elegir otro para hoy y añadir o quitar personajes con su imagen (sincronizados) | Hecho | 464 tests (eventos y guardas, rotación en 2.000 días con 5, 3 y 2 personajes, cambio de hora, elección del día; prueba de mutación). En el navegador a 1280 × 800 y 402 × 874: los cinco de `public/menu/`, elegir, volver a la rotación, añadir un PNG y quitarlo (con su imagen). Sin probar la llegada a otro equipo por Drive ni en la app nativa |
| Personalización: ventana Customize del menú para añadir personajes con sus frases por hora (sin límite) e ilustraciones de «Encargo cumplido» por tipo de encargo (sincronizadas); ilustraciones de serie en `public/temporal/<tipo>/` | Hecho | 475 tests (frases e ilustraciones: eventos, guardas, sin límite y azar; en `randomStream`). En el navegador a 1.280 × 800, 1.024 × 700 y 402 × 874, en español y japonés. Sin probar en la app nativa ni la llegada a otro equipo por Drive |
| Sincronización con Google Drive (fase 2) | Hecho | 18 tests con dos y tres equipos en memoria y un Drive falso (la puerta de la fase: el mismo estado en cualquier orden). En la app nativa de macOS con Google Drive de verdad, dos copias con bases distintas: inicio de sesión, ejemplos juntados y acciones en las dos con los mismos 37 eventos. Sin probar en Windows, con dos equipos físicos ni los adjuntos con Drive de verdad |

La base de datos de la app nativa está en `~/Library/Application Support/com.quests.app/quests.db` (macOS) y en `%APPDATA%\com.quests.app\` (Windows).
