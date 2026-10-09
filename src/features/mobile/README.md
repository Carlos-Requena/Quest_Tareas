---
funcionalidad: mobile
titulo: Interfaz de teléfono
resumen: La app en el iPhone con interfaz de teléfono: barra de abajo, ventanas a pantalla completa, gestos de iOS (volver desde el borde, bajar las hojas, deslizar tarjetas) y vibración.
tipo: presentación
eventos: []
preferencias: [quests.haptics]
adr: [ADR-31, ADR-32, ADR-34, ADR-49, ADR-53]
---

# Interfaz de teléfono

Quests funciona en el **iPhone** como app nativa: el mismo proyecto de Tauri 2 compilado para iOS (`src-tauri/gen/apple`), con el mismo dominio, los mismos eventos, el mismo SQLite y la misma sincronización. Esta carpeta adapta la **interfaz** a una pantalla de unos 400 pt de ancho y táctil. Lo nativo de iOS (el inicio de sesión de Google) está en [sync](../sync/README.md); compilar e instalar, en [docs/runbooks/compilar-ios.md](../../../docs/runbooks/compilar-ios.md).

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | Usar Quests en el iPhone | Tauri 2 para iOS (`pnpm tauri ios …`) |
| R2 | Todo lo del Mac, no solo el día a día | Cada pantalla tiene su diseño de teléfono: tablón, detalle, encargos, calendario, menú, mercader, personaje, objetos y almanaque, crónica, «Quest Clear» y el cofre |
| R3 | Sincronizar con el Mac | La misma sincronización con Google Drive; en iOS se inicia sesión con la hoja del sistema |
| R4 | Que no se rompa el escritorio | Todo va en `@media (max-width: 760px)`; en el escritorio los componentes del teléfono no se ven (`display: none` / `display: contents`) |
| R5 | Sin teclado | Barra de abajo, rombo de crear, toques y deslizar el dedo; «Pulsa Enter» pasa a «Toca» |

## Reglas y decisiones

### CSS primero, JavaScript solo donde hace falta

El punto de corte es **760 px** (`PHONE_MAX_WIDTH`, en `phone.ts`, repetido a mano en cada `@media`). Cada funcionalidad pone su bloque de teléfono **al final de su CSS** ([AGENTES.md](../../../docs/AGENTES.md#7-interfaz-animaciones-y-estilos)). JavaScript (`isPhone()` / `useIsPhone()`) solo decide lo que el CSS no puede:

| Qué | Dónde |
|---|---|
| Al tocar una tarjeta, abrir su detalle a pantalla completa | `src/App.tsx` (`isPhone()` → `openDetail`) |
| Aceptar cierra antes el detalle | `actions.ts` (`detailPrimaryAction`) |
| Un toque abre el cartel de un encargo (en el escritorio, el primero lo elige) | `temporal/components/Poster.tsx` |
| La crónica enseña una página cada vez | `chronicle/components/ChronicleModal.tsx` (`per`) |
| Los ajustes del menú en filas | `menu/components/MenuSettings.tsx` |
| «Toca para continuar» en vez de «Pulsa Enter» | `KeyHint` |

Una app móvil aparte duplicaría las pantallas, y una PWA no podría guardar el token en el llavero ni hablar con Drive sin abrir la CSP ([ADR-31](../../../docs/decisions/ADR-31-iphone-con-tauri.md)).

### El armazón

- **Cabecera en dos filas**: emblema, «Quest Board» y oro con las quests en curso; debajo, rango, nivel y la barra de XP. La lupa y la pestaña «MENU» no se ven: están en la barra.
- **Barra de abajo** (`MobileNav`): una **cápsula de cristal** que flota en todas las pantallas, también sobre el menú, con cuatro columnas: **Tablón · Encargos** (con el aviso rojo de los de hoy) **· Calendario · Menú**. El **selector** es una sola lente que va con un muelle hasta la sección activa y se queda ahí. Como la barra de iOS, **se mantiene y se arrastra**: al poner el dedo crece y se aclara (un cristal levantado), sigue al dedo de pestaña en pestaña estirándose con la velocidad (`useVelocity`: más ancha y más plana cuanto más rápido) y ampliando lo que tiene debajo, con un toque de vibración en cada pestaña; al soltar, lleva a la que queda debajo. Un toque corto va directo a esa pestaña. Con el ratón, los botones de siempre (el clic que llega tras soltar el dedo se descarta). Con «reducir movimiento», la lente salta sin crecer ni estirarse. La barra lleva `touch-action: none` y sin el menú de mantener pulsado de iOS. Es CSS (`backdrop-filter`), no el Liquid Glass nativo de iOS: así es igual en el iPhone, el Mac y el navegador, y no queda por encima de las ventanas de la web. Sustituye al pie con las teclas.
- **Menú**: su propia distribución, como la pantalla de inicio de un gacha, con la barra de abajo flotando encima ([menu](../menu/README.md#en-el-teléfono), [ADR-49](../../../docs/decisions/ADR-49-menu-de-opciones.md)).
- **Rombo de crear** (`MobileCreate`): dorado, girado 45°. En el tablón abre la hoja del alta rápida ([quickadd](../quickadd/README.md); desde ella, «Más detalles» abre el formulario completo); en el de encargos, un encargo; en el calendario, un bloque.
- **Avisos** encima de la barra (`.m-toast`), para que se vean con el detalle cerrado. El botón «Deshacer» del aviso sí recibe el toque, aunque el aviso deje pasar los demás.
- **Editar** va en el detalle con su nombre; en el escritorio, solo el icono ✎.

### El detalle, una hoja a pantalla completa

En el teléfono el detalle es una **hoja que entra por la derecha** (`.m-sheet`) con «‹ Volver al tablón»; en el escritorio, `.m-sheet` tiene `display: contents`. El estado guarda **el id de la quest abierta** (`useMobileUi.detail`): si esa quest deja el tablón (completada, retirada, otra pestaña o plazo), `App` cierra la hoja en lugar de enseñar otra.

**Aceptar cierra antes la hoja**: el sello «EN CURSO» cae sobre la **tarjeta** del tablón, que la hoja taparía. `detailPrimaryAction` cierra la hoja, espera `SHEET_MS` y entonces acepta. Reportar no lo necesita: «Quest Clear» ya ocupa la pantalla.

### Ventanas a pantalla completa

Todas las ventanas usan `.modal`, y una regla de `mobile.css` las pone a pantalla completa; cada funcionalidad recoloca lo suyo en su CSS (ver su README, sección «Interfaz»).

### Pasar página deslizando el dedo

`useSwipe` (`swipe.ts`): 50 px como mínimo y más horizontal que vertical. Usa eventos de puntero (también vale arrastrando con el ratón). La zona lleva `.m-swipe` (`touch-action: pan-y`). Lo usan la crónica, el almanaque y el calendario.

### Fichas pegadas abajo

En el mercader y en el inventario, la ficha de lo elegido sube **pegada abajo** y tapa media pantalla. Se cierra con su ✕ (`SheetClose`) o **volviendo a tocar** la fila o el objeto; sin nada elegido, no ocupa sitio (no se ve el «Elige…» del escritorio).

### Gestos de iOS

Un solo gesto, `useDragDismiss` (`drag.ts`), con eventos de puntero y solo en el teléfono (con el ratón no hace nada): el elemento sigue al dedo y, al soltar, sale (pasó del umbral o fue un golpe rápido, con al menos la mitad del recorrido) o vuelve con un muelle. Se decide de quién es el gesto a los 8 px: si el dedo va más en el otro eje, es un desplazamiento normal. El clic que llega justo al soltar (menos de 400 ms) se descarta, para no abrir lo que había debajo ([ADR-53](../../../docs/decisions/ADR-53-gestos-y-vibracion-en-el-telefono.md)).

| Gesto | Dónde | Detalles |
|---|---|---|
| **Volver desde el borde** | El detalle (`.m-sheet`, en `App.tsx`) | Empieza a menos de 28 px del borde izquierdo; sale al 30 % del ancho. `.m-sheet` lleva `touch-action: pan-y` |
| **Bajar para cerrar** | Alta rápida, ajustes del menú, ficha del mercader y del inventario | Solo desde el **asa** (`SheetGrip`, `data-drag-handle`, `touch-action: none`), para no pelear con el desplazamiento de dentro. Las hojas que anima Motion se arrastran por su capa de fuera (`.qa-sheet-pos`, `.mnp-sheet-pos`): así su salida no salta |
| **Deslizar una tarjeta** | El tablón (`QuestCard`) | A la derecha, su acción principal (`swipeAction`: aceptar una disponible sin requisitos pendientes, reportar una en curso con los objetivos cumplidos; si no, no se desliza). La tarjeta no se mueve —la animan Motion y GSAP—: se llena una franja dorada con «Aceptar →» o «Reportar →» (`--swipe`, `data-swipe`). Umbral, el 45 % del ancho. Se deshace con el aviso de siempre |

### Vibración

`src/lib/haptics.ts`, con el plugin `haptics` de Tauri. La llama `sfx.ts` en cada efecto, con un peso según lo que pasa: **selección** al moverse (pestañas, páginas; una cada 40 ms como mucho), **golpe** ligero, medio o fuerte (progreso, sellos, el cofre) y **resultado** (éxito al completar o subir de nivel, aviso, error). Va antes del silencio: quitar el sonido no quita la vibración. Se apaga en los ajustes del menú («Vibración», `quests.haptics`, en este equipo), que solo se ve donde puede vibrar (`hapticsAvailable`: la app nativa en un teléfono). En el escritorio y en el navegador no carga el plugin.

### Teclado y ampliación

- Los campos de una línea dicen qué hace Intro (`enterKeyHint`: «done»; la búsqueda, «go»; el alta rápida, «send») y los numéricos abren el teclado de números (`inputMode="numeric"`). La búsqueda no pone mayúsculas ni corrige.
- La página no se amplía con dos dedos ni con doble toque (`user-scalable=no` en `index.html` y `touch-action: pan-x pan-y`): es una app, no una página.

### Detalles de iOS

- Campos de **16 px** como mínimo: con menos, iOS amplía la página al tocarlos. Botones de 40 px o más.
- `touch-action: manipulation` (sin la espera del doble toque), sin el resaltado gris al tocar y sin el rebote de la página.
- **Sin barras de desplazamiento** (`scrollbar-width: none` y `::-webkit-scrollbar`) y, en las zonas que solo bajan, `overflow-x: hidden`: un desbordamiento de 2 px bastaba para que el dedo arrastrara la página de lado («Mi día»).
- El WebView de Tauri ya deja libres la isla dinámica y la barra de inicio: no hace falta `env(safe-area-inset-*)`.

## Eventos

No tiene eventos: es presentación. No cambia `project()`, el modelo ni el snapshot.

## Archivos

| Archivo | Contenido |
|---|---|
| `phone.ts` | `PHONE_MAX_WIDTH`, `isPhone()`, `useIsPhone()` |
| `ui.ts` | Store de UI: detalle abierto (id) |
| `actions.ts` | `detailPrimaryAction` (aceptar cierra antes la hoja), `swipeAction` (qué hace deslizar una tarjeta) |
| `swipe.ts` | `useSwipe` |
| `drag.ts` | `useDragDismiss`: volver desde el borde, bajar las hojas y deslizar tarjetas |
| `components/SheetGrip.tsx` | Asa de las hojas que suben desde abajo |
| `components/MobileNav.tsx` | Barra de abajo y rombo de crear (`MobileCreate`) |
| `components/DetailBack.tsx` | «‹ Volver al tablón» |
| `components/SheetClose.tsx` | ✕ de la ficha que sube desde abajo en el mercader y el inventario |
| `components/KeyHint.tsx` | «Pulsa Enter…» o «Toca…» según la pantalla |
| `mobile.css`, `i18n.ts` | Armazón y ajustes de `app.css` en el teléfono; textos es + ja |
| `actions.test.ts` | Aceptar en el teléfono espera a que salga la hoja; en el escritorio, no |
| `swipe-action.test.ts` | Cuándo se desliza una tarjeta y para qué |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/App.tsx` | `.m-sheet` + `DetailBack` alrededor de `QuestDetail` (con volver desde el borde); `MobileNav`, `MobileCreate` y el aviso `.m-toast`; abrir el detalle al tocar una tarjeta |
| `src/components/QuestCard.tsx` | Deslizar la tarjeta (`swipeAction`, `useDragDismiss`) |
| `src/lib/haptics.ts`, `src/lib/sfx.ts` | La vibración y su llamada en cada efecto |
| `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json` | Plugin `haptics` y sus tres permisos (impacto, resultado y selección) |
| `index.html` | `user-scalable=no` |
| Formularios de quests, encargos, agenda, objetos, mercancía, contactos, frases y búsqueda | `enterKeyHint`, `inputMode` |
| `src/features/quickadd`, `src/features/menu` (`MenuPhone`, `MenuSettings`), `src/features/merchant`, `src/features/items` | Asa y bajar para cerrar sus hojas; la fila «Vibración» |
| `src/components/QuestDetail.tsx` | El botón principal llama a `detailPrimaryAction`; `Toast` exportado |
| `src/components/Header.tsx` | `LangSwitch` exportado (lo usa el menú) |
| `src/components/ClearOverlay.tsx` | `KeyHint` |
| `src/features/temporal/components/Poster.tsx` | Un toque abre el cartel |
| `src/features/chronicle/components/ChronicleModal.tsx` | Una página cada vez (`per`); deslizar |
| `src/features/items/components/AlmanacBook.tsx`, `src/features/items/components/LootChest.tsx` | Deslizar para pasar página; «Toca el cofre…» |
| `src/features/equipment/components/CharacterModal.tsx` | Clase `is-picking` (el armario ocupa la ventana) |
| `src/lib/motion.ts` | `BACKDROP_EXIT` / `MODAL_EXIT` en todas las ventanas |
| `src/i18n/locales/{es,ja}.ts` | `mobile: mobileEs` / `mobileJa` |

## Dependencias

- **features/menu** (`toggleMenu`, `MenuIcon`): el botón «Menú» de la barra.
- **features/calendar** (`toggleCalendar`, `CalendarIcon`): el botón «Calendario» y el rombo que añade un bloque.
- **features/temporal** (`setSection`, aviso de hoy): el botón «Encargos» y el rombo que clava uno.
- **features/quickadd** (`ui.ts`): el rombo del tablón abre la hoja del alta rápida.
- Para cambiar la barra no hace falta leer esos README.
- **La usan:** casi todas las pantallas (`phone.ts`, `swipe.ts`, `KeyHint`): `calendar`, `chronicle`, `failure`, `items`, `menu`, `temporal`; `drag.ts` y `SheetGrip`: `quickadd`, `menu`, `merchant`, `items`.

## Estado actual

- **Última verificación:** 2026-10-09, gestos en el navegador (eventos de puntero táctiles) y con el dedo en el simulador de iOS: deslizar una tarjeta la acepta sin abrir el detalle (y el desplazamiento vertical sigue), volver desde el borde, bajar la hoja de ajustes; en el navegador también el alta rápida y la ficha del mercader. La fila «Vibración» sale en la app nativa. Antes, la barra de cristal y su selector; «Mi día» sin barra ni arrastre lateral; la ficha del mercader y la del almanaque se cierran con ✕ y volviendo a tocar. La del inventario no se probó con objetos (la partida de pruebas no tenía). El propietario abrió la app en su iPhone y sincronizó con ella el 2026-10-06.
- **Tests:** `actions.test.ts`, `swipe-action.test.ts`.
- **Sin verificar:** **la vibración** (el simulador no vibra: solo se sabe que el plugin compila y la fila sale); los gestos con el dedo en un iPhone real; el sonido y la música en iOS (el interruptor de silencio puede callar los efectos); los PDF adjuntos (iOS puede enseñar solo la primera página); el teclado de iOS encima de los formularios; el giro a horizontal; el iPad.
- **Historial:** [docs/history/verificacion/mobile.md](../../../docs/history/verificacion/mobile.md).
