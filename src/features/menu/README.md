---
funcionalidad: menu
titulo: Menú de opciones
resumen: Pantalla de opciones (tecla O) al estilo del menú principal de un gacha, con el personaje del día, las tarjetas de cada sección en 3D y los ajustes.
tipo: presentación
eventos: [character_added, character_removed]
preferencias: [quests.menuCharacter]
adr: [ADR-49, ADR-50]
---

# Menú de opciones

La cabecera se queda con el tablón, el rango, la XP, el oro, la lupa y la pestaña «MENU». Todo lo demás está en esta pantalla, que entra con un **barrido** al estilo del menú principal de un gacha (la referencia del propietario es el de Arknights): **el personaje del día** a un lado y, al otro, las **tarjetas de cada sección en perspectiva**, con su logo y el rótulo en relieve. Se abre con la pestaña «MENU», la tecla `O`, el botón del pie o «Menú» en la barra del teléfono.

La pantalla es solo presentación: lee el estado y llama a las acciones de cada funcionalidad. Lo único que guarda datos son los **personajes que añade el jugador** (dos eventos y su imagen en el almacén de binarios, para que se sincronicen).

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | Que la interfaz no abrume | La cabecera, con lo del día a día; el pie, con una sola tecla (`O`) en lugar de una por ventana |
| R2 | La tienda, el diario, la colección «y demás» en una pestaña de opciones | Mercader, personaje, objetos y almanaque, crónica, búsqueda, las tres secciones y los ajustes del equipo |
| R3 | Que entre con un efecto rápido («swift») | Barrido en diagonal de derecha a izquierda con filo dorado y rayas de velocidad, en medio segundo |
| R4 | Profundidad en los textos de cada sección, con su logo | Rejilla girada en 3D: el logo y el rótulo flotan delante de la tarjeta (`translateZ`), con relieve; el ratón inclina la rejilla (paralaje) |
| R5 | Fiel al estilo de la app | Fondo oscuro con grano, oro, rombos, Cinzel y Cormorant; cada tarjeta con el color de su funcionalidad; el fondo comprado al mercader se ve detrás |
| R6 | Un personaje en lugar del de la referencia | Los `.webp` de `public/menu/` (Kazuma, Aqua, Azusa, Mio, Mihari y Mahiro, con fondo transparente) y los que añada el jugador |
| R7 | Rota cada día, al azar pero sin repetir hasta que salgan todos | `characterOfDay`: vueltas barajadas con su número como semilla (el mismo orden en todos los equipos) |
| R8 | Elegir otro para hoy sin cambiar la rotación | `pickCharacter`: se guarda en este equipo con el día; mañana sale el que tocaba |
| R9 | Añadir personajes desde el menú, que lleguen a todos los equipos | «Añadir personaje»: la imagen va al almacén de binarios y `character_added`, a todos los equipos |
| R10 | También en el iPhone | La barra de abajo pasa a Tablón · Encargos · Calendario · Menú; el menú ocupa la pantalla encima de la barra |

## Reglas y decisiones

### La pantalla

| Zona | Qué hay |
|---|---|
| Arriba a la izquierda | «‹ Volver» (Escape) y los ajustes: idioma, música, silencio, avisos y Google Drive |
| Arriba a la derecha | Fecha y hora, el oro y los objetos, cada uno con su «+» (abren el mercader y el inventario) |
| Izquierda | El nivel en un anillo, el rango en su rombo y lo que dice el personaje según la hora, con el botón para cambiarlo |
| Abajo a la izquierda | **Weekly Rarity**: el coleccionable que vende Hu Tao esta semana; abre su pestaña en la tienda |
| Centro | El personaje del día, con el sello del gremio girando detrás, polvo dorado y «Quest Board» en contorno |
| Derecha | Las tarjetas |

| Fila | Tarjetas | Qué hace |
|---|---|---|
| 1 | **Quests** (grande, en pergamino): las que hay en curso y la última aceptada | Vuelve al tablón |
| 2 | **Character** · **Bounties** (con el aviso rojo de los encargos de hoy) | Personaje (`P`) · tablón de encargos |
| 3 | **Merchant** (con Hu Tao asomando y los días hasta el cambio del escaparate) · **Collection** | Mercader (`C`) · objetos (`I`) o almanaque |
| 4 | **Chronicle** · **Calendar** · **Search** | Crónica (`J`) · calendario · búsqueda (`/`) |

Los **rótulos grandes van en inglés**, como ELITE o QUEST CLEAR: son decorativos; debajo va su nombre traducido. Su tamaño sigue al ancho de la rejilla (`cqi`), para que quepan de 1.024 a 1.440 px.

### Las ventanas se abren encima del menú

El mercader, el personaje, los objetos y la crónica se abren **encima** (capa 50 sobre 47) y, al cerrarlas, se vuelve al menú. Las tres secciones (Quests, Bounties, Calendar) **cierran** el menú y llevan a la sección; la **búsqueda** también lo cierra antes, porque lleva a otro sitio. Si algo cambia de sección por debajo, el menú se aparta solo (`MenuScreen` escucha `section`). Por qué una pantalla y no un desplegable u otra ventana: [ADR-49](../../../docs/decisions/ADR-49-menu-de-opciones.md).

### Personajes

- **De serie:** los `.webp` de `public/menu/`. Para añadir uno basta con dejar el archivo ahí: su id es `builtin:<archivo>` y su nombre traducido va en `menu.cast.names` (sin traducción, el del archivo: «mihari_mahiro» → «Mihari Mahiro»). Como `import.meta.glob` no ve `public/`, el plugin `menuCharacters` de `vite.config.ts` lista la carpeta como el módulo virtual `virtual:menu-characters`; con `pnpm dev`, añadir o quitar un archivo recarga la app.
- **Rotación** (`characterOfDay`, pura): los días (`dayNumber`, días de calendario en hora local) se agrupan en vueltas de tantos días como personajes, cada una barajada con su número como semilla. Si el primero de una vuelta es el último de la anterior, se cambia por el segundo (con tres o más); con dos, se alternan. **Añadir o quitar un personaje cambia el tamaño de la vuelta** y la rotación se baraja de nuevo desde ese día ([ADR-50](../../../docs/decisions/ADR-50-personajes-del-menu.md)).
- **Elegir uno para hoy** (`pickCharacter`): se guarda en este equipo (`quests.menuCharacter`: el día y el id) y solo vale ese día; no se sincroniza y la rotación no se entera. Elegir el de la rotación (o «Seguir la rotación») borra la elección.
- **Añadir** (`addCharacter`): un WebP, PNG o AVIF de hasta 5 MB se guarda tal cual (sin perder la transparencia); uno mayor se reduce a 1.800 px en WebP o PNG (nunca JPEG). Va al almacén de binarios por su SHA-256, y `character_added` lleva su referencia y una miniatura de 160 px. Queda elegido para hoy.
- **Quitar** (`removeCharacter`): segundo toque («¿Quitar?»); borra la imagen si ya no la usa nadie. El almacén lo comparten encargos, mercader y personajes: `characterBlobIds` se suma a `liveBlobIds` y `gearBlobIds` en la limpieza y en la sincronización. Quitar no se deshace (la imagen ya se habría borrado). Los de serie no se quitan desde la app.
- En otro equipo, la referencia puede llegar antes que la imagen: mientras, se pinta la miniatura, borrosa.

### Los ajustes

Son los componentes de cada funcionalidad (`LangSwitch`, `MusicControl`, `SyncControl`, `NotifyButton` / `NotifyMenuToggle`) y el silencio general. En el escritorio, iconos en la barra de arriba con su desplegable al pasar el ratón; en el teléfono, filas con su nombre y los desplegables abiertos. Como `MusicControl` solo se monta con el menú abierto, `MenuScreen` (siempre montado) llama a `music.armAutoplay()` al arrancar. El aviso (toast) del escritorio vive en el detalle de la quest, que el menú tapa: el menú pinta otro abajo, en el centro.

## Modelo

`CharacterDef { id, name, art: CharacterArt (blobId, mime, size), thumb?, createdAt }` en `GameState.characters`; no toca al jugador. `CharactersAcc { list, deleted }` en `ProjectionAcc.characters`. Funciones puras de `model.ts`: `daypart`, `activeQuests`, `daysUntil`, `applyCharacterEvent`, `characterBlobIds`, `dayNumber`, `rotationOrder`, `characterOfDay`, `shownCharacter`.

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `character_added` | `character: CharacterDef` | Lo añade a `GameState.characters` (nombre recortado; vacío, «?») | Se ignora si el id existe o se quitó, empieza por `builtin:` o no trae `art.blobId` |
| `character_removed` | `characterId` | Lo quita; el id queda retirado | Si existe |

## Interfaz

| Dónde | Tecla | Qué hace |
|---|---|---|
| Tablón, encargos y calendario | `O` | Abre el menú |
| Menú | `Esc` u `O` | Lo cierra |
| Menú | `I` `C` `P` `J` `/` `L` `M` | Las mismas que en el tablón |

- **Teclado en captura.** Con el menú abierto, el teclado del tablón espera (`menuBusy`). El del menú escucha **en captura**: corre antes que el de las ventanas y, si hay una abierta encima (`windowOpen`), no hace nada. Así `Escape` cierra primero la ventana y luego el menú.
- **El barrido.** Un borde inclinado (`clip-path: polygon(…)`) cruza la pantalla de derecha a izquierda en 0,5 s, con una línea dorada (un `path` SVG) y seis rayas de velocidad; suena `sfx.menuOpen`. Detrás, el personaje entra desde la izquierda y las tarjetas llegan una a una girando. Al cerrar, el borde vuelve a la derecha en 0,34 s (`sfx.menuClose`). Con «reducir movimiento», solo aparece y desaparece.
- **Profundidad.** La perspectiva va en `.mn-tiles` y el giro (`rotateY(-13°) rotateX(3°)` más el paralaje) en `.mn-tilt`, con `preserve-3d` hasta los textos. Cada tarjeta tiene tres planos: fondo con marca de agua (z 0), logo (z 28 px) y rótulo (z 40 px); al pasar el ratón, la tarjeta sube 20 px y el rótulo 58. **Nada entre `.mn-tilt` y los textos puede llevar `overflow`, `opacity` menor que 1, `filter` ni `clip-path`**: aplanarían el 3D (por eso el recorte va en la capa de fondo de cada tarjeta).
- **El personaje**, en tres capas para no pisar animaciones: `.mn-hero` (paralaje, CSS), `.mn-hero-in` (entrada y cambio, Motion) y `.mn-breathe` (respiración, CSS). Cabe entero y de pie (`object-fit: contain`). Lo que dice cambia según la hora (`daypart`: mañana, tarde, noche y madrugada).
- **Teléfono:** el menú ocupa la pantalla encima de la barra (capa 39, debajo de la barra, 40) y se desplaza: arriba el aventurero y el personaje (quieto a la derecha; las tarjetas pasan por encima al bajar), luego las tarjetas a lo ancho, el coleccionable y los ajustes. Sin paralaje; la rejilla gira menos (−5°). El selector de personajes ocupa la pantalla, a dos columnas.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | Puro: `daypart`, `activeQuests`, `daysUntil`; personajes (`CharacterDef`, `applyCharacterEvent`) y rotación (`characterOfDay`, `shownCharacter`) |
| `events.ts` | `character_added`, `character_removed` |
| `characters.ts` | Lista de personajes: los de serie (`virtual:menu-characters`) y los del jugador |
| `image.ts` | Imagen y miniatura de un personaje añadido (canvas) |
| `ui.ts` | Menú abierto, selector abierto y lo elegido para hoy (en este equipo); `menuBusy` |
| `actions.ts` | `openMenu`, `closeMenu`, `toggleMenu`, `goTo`, `openOver`, `searchFromMenu`, `windowOpen`, `pickCharacter`, `addCharacter`, `removeCharacter` |
| `components/MenuButton.tsx` | Pestaña «MENU» de la cabecera y botón del pie |
| `components/MenuScreen.tsx` | La pantalla: barrido, personaje, decoración, teclado y paralaje |
| `components/MenuTiles.tsx` | Las tarjetas en perspectiva |
| `components/MenuPanels.tsx` | Volver, monedas, aventurero, lo que dice el personaje y el coleccionable |
| `components/MenuCast.tsx` | Selector de personajes, `useCast`, `CharacterImage` |
| `components/MenuSettings.tsx` | Idioma, música, sonido, avisos y Google Drive |
| `components/MenuIcons.tsx` | Rombos del menú, almanaque, reloj, volver y el sello del gremio |
| `menu.css`, `i18n.ts` | Pestaña, pantalla, barrido, tarjetas en 3D, ajustes y teléfono; textos es + ja |
| `model.test.ts` | Personajes, rotación (2.000 días con 5, 3 y 2 personajes, cambio de hora), partes del día, quest actual y días hasta el escaparate |

### Dónde está cada cosa

| Concepto | Símbolo |
|---|---|
| Montaje permanente, música armada al arrancar y teclado en captura (Escape, `O`, las teclas de las ventanas) | [`MenuScreen`](components/MenuScreen.tsx) (su efecto con `window.addEventListener("keydown", onKey, true)`) |
| Si hay una ventana abierta encima, el teclado del menú no actúa | [`windowOpen`](actions.ts) |
| Cierre al cambiar de sección por debajo | suscripción `useGame.subscribe` dentro de [`MenuScreen`](components/MenuScreen.tsx) |
| Composición de la pantalla (fondo, personaje, paneles, tarjetas, barrido) | [`Screen`](components/MenuScreen.tsx) |
| Barrido diagonal: recorte, filo dorado y rayas de velocidad | [`clip`](components/MenuScreen.tsx), [`edge`](components/MenuScreen.tsx), [`STREAKS`](components/MenuScreen.tsx), con [`WIPE_IN`](components/MenuScreen.tsx) y [`WIPE_OUT`](components/MenuScreen.tsx) |
| Sonido del barrido | [`openMenu`](actions.ts) y [`closeMenu`](actions.ts) (llaman a `sfx.menuOpen` / `sfx.menuClose`) |
| Foco inicial | efecto de [`Screen`](components/MenuScreen.tsx) que llama a `root.current?.focus()` |
| Paralaje | efecto de `pointermove` en [`Screen`](components/MenuScreen.tsx), que escribe las variables CSS `--mx` y `--my` |
| Personaje actual | [`useCast`](components/MenuCast.tsx) y `hero` en [`Screen`](components/MenuScreen.tsx) |
| Movimiento reducido | [`calm`](../../lib/fx.ts) (en `Screen`, `still`: sin barrido ni paralaje) |
| Tarjetas en 3D | [`MenuTiles`](components/MenuTiles.tsx), [`Tile`](components/MenuTiles.tsx) y [`Cell`](components/MenuTiles.tsx) |
| Paneles (volver, monedas, aventurero, lo que dice el personaje, coleccionable) | [`MenuBack`](components/MenuPanels.tsx), [`MenuCurrency`](components/MenuPanels.tsx), [`MenuPlayer`](components/MenuPanels.tsx), [`MenuVoice`](components/MenuPanels.tsx), [`WeeklyNews`](components/MenuPanels.tsx) |
| Ajustes | [`MenuSettings`](components/MenuSettings.tsx) |
| Selector de personajes | [`MenuCast`](components/MenuCast.tsx) y [`CharacterImage`](components/MenuCast.tsx) |
| Rotación diaria y elección del día | [`characterOfDay`](model.ts), [`shownCharacter`](model.ts) y [`pickCharacter`](actions.ts) |
| Personajes de serie | [`BUILTIN_CHARACTERS`](characters.ts), que lista el plugin [`menuCharacters`](../../../vite.config.ts) |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/App.tsx` | `<MenuScreen />`, `menuBusy()` en el teclado y la tecla `O` |
| `src/components/Header.tsx` | `<MenuButton />`; solo quedan el emblema, el selector de sección, el rango, la XP, el oro y la lupa |
| `src/components/Footer.tsx` | `<MenuFooterButton />` (tecla `O`) |
| `src/lib/sfx.ts` | `menuOpen` y `menuClose` |
| `src/domain/events.ts` | `MenuEventBody` en la unión |
| `src/domain/projection.ts` | `ProjectionAcc.characters` (`CharactersAcc`), los dos `case` y `GameState.characters` |
| `src/domain/types.ts` | `GameState.characters: Map<string, CharacterDef>` |
| `vite.config.ts`, `src/vite-env.d.ts` | Plugin `menuCharacters` y el tipo de `virtual:menu-characters` |
| `src/features/temporal/actions.ts`, `src/features/merchant/actions.ts`, `src/features/sync/actions.ts` | `characterBlobIds` en los binarios en uso (limpieza y subida a Drive) |
| `src/features/mobile/components/MobileNav.tsx` | La barra, a cuatro botones (`toggleMenu`) |
| `public/menu/` | Los personajes de serie |
| `src/i18n/locales/{es,ja}.ts` | `menu: menuEs` / `menuJa` |
| `src/test/streams.ts` | `characterDef` y los eventos de personajes en `randomStream` |

## Dependencias

El menú abre las ventanas de otras funcionalidades y lee su estado, pero **para cambiar la pantalla del menú no hace falta leer sus README**. Solo si cambias lo que hace una tarjeta o un ajuste:

- **features/merchant** (`actions`, `ui`, `model`): abrir la tienda (tarjeta, «+» del oro) y los días hasta el cambio de escaparate (`weekKey`).
- **features/collectibles** (`model.ts`): el coleccionable de «Weekly Rarity».
- **features/items** (`index`): abrir el inventario o el almanaque; el «+» de los objetos.
- **features/equipment** (`ui`, `useBlobUrl`, `Backdrop`): abrir el personaje, el fondo comprado detrás del menú y las imágenes de los personajes añadidos.
- **features/chronicle** (`ui`): abrir la crónica.
- **features/search** (`actions`, `ui`): la tarjeta Search (cierra el menú y abre la búsqueda).
- **features/calendar** y **features/temporal** (`actions`, `model`): las tarjetas Calendar y Bounties y el aviso de encargos de hoy.
- **features/music**, **features/sync**, **features/notifications** (sus controles): los ajustes. Para cambiar un ajuste por dentro, lee el README de esa funcionalidad.
- **features/mobile** (`phone.ts`): distinguir el teléfono en los ajustes (filas en lugar de iconos). Para la barra de abajo, lee su README.
- **features/editing**, **features/failure**, **features/quickadd** (sus `ui.ts`): `windowOpen` mira si hay una ventana suya abierta encima.
- **La usan:** `mobile` (barra), y `merchant`, `sync` y `temporal` (`characterBlobIds`).

## Estado actual

- **Última verificación:** 2026-10-07, tests y navegador a 1.280 × 800, 1.024 × 680 y 402 × 874, en español y japonés (barrido, paralaje, ventanas encima y Escape, secciones, búsqueda, los personajes de `public/menu/`, elegir, añadir un PNG y quitarlo).
- **Tests:** `model.test.ts`.
- **Sin verificar:** un personaje añadido llegando a otro equipo por Drive; el sonido del barrido; la app nativa de macOS y Windows, el simulador de iOS y un iPhone; el rendimiento del 3D en un equipo lento.
- **Historial:** [docs/history/verificacion/menu.md](../../../docs/history/verificacion/menu.md).
