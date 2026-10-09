---
funcionalidad: menu
titulo: Menú de opciones
resumen: Pantalla de opciones (tecla O) al estilo del menú principal de un gacha, con el personaje del día, las tarjetas de cada sección en 3D y los ajustes.
tipo: presentación
eventos: [character_added, character_removed, voice_line_added, voice_line_updated, voice_line_removed]
preferencias: [quests.menuCharacter]
adr: [ADR-49, ADR-50, ADR-51, ADR-52]
---

# Menú de opciones

La cabecera se queda con el tablón, el rango, la XP, el oro, la lupa y la pestaña «MENU». Todo lo demás está en esta pantalla, que entra con un **barrido** al estilo del menú principal de un gacha (la referencia del propietario es el de Arknights): **el personaje del día** a un lado y, al otro, las **tarjetas de cada sección en perspectiva**, con su logo y el rótulo en relieve. Se abre con la pestaña «MENU», la tecla `O`, el botón del pie o «Menú» en la barra del teléfono.

La pantalla es solo presentación: lee el estado y llama a las acciones de cada funcionalidad. Lo único que guarda datos son los **personajes que añade el jugador** (con su imagen en el almacén de binarios) y **lo que dice cada personaje según la hora**: eventos, para que se sincronicen. Se añaden desde la ventana de [personalización](../customize/README.md) (tarjeta Customize).

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
| R10 | También en el iPhone, como la pantalla de inicio de un gacha (referencia del propietario) | `MenuPhone`: el personaje a toda pantalla, botones redondos a los lados y «Quests» grande abajo; la barra de abajo flota encima, con su selector en «Menú» |
| R11 | Frases del personaje según la hora, sin límite | `VoiceLine` por personaje y parte del día; con alguna, dice una al azar en lugar de la de serie. Se escriben en la [personalización](../customize/README.md) |

## Reglas y decisiones

### La pantalla

| Zona | Qué hay |
|---|---|
| Arriba a la izquierda | «‹ Volver» (Escape) y los ajustes: idioma, música, silencio, avisos y Google Drive |
| Arriba a la derecha | Fecha y hora, el oro y los objetos, cada uno con su «+» (abren el mercader y el inventario) |
| Izquierda | El nivel en un anillo, el rango en su rombo y lo que dice el personaje según la hora, con el botón para cambiarlo |
| Abajo a la izquierda | **Weekly Rarity**: el coleccionable que vende Hu Tao esta semana; abre su pestaña en la tienda |
| Centro | El personaje del día, vivo ([living](../living/README.md)), con el sello del gremio girando detrás, polvo dorado y «Quest Board» en contorno |
| Derecha | Las tarjetas |

| Fila | Tarjetas | Qué hace |
|---|---|---|
| 1 | **Quests** (grande, en pergamino): las que hay en curso y la última aceptada | Vuelve al tablón |
| 2 | **Character** · **Bounties** (con el aviso rojo de los encargos de hoy) | Personaje (`P`) · tablón de encargos |
| 3 | **Merchant** (con Hu Tao asomando y los días hasta el cambio del escaparate) · **Collection** | Mercader (`C`) · objetos (`I`) o almanaque |
| 4 | **Chronicle** · **Calendar** · **Search** · **Customize** | Crónica (`J`) · calendario · búsqueda (`/`) · [personalización](../customize/README.md) |

Los **rótulos grandes van en inglés**, como ELITE o QUEST CLEAR: son decorativos; debajo va su nombre traducido. Su tamaño sigue al ancho de la rejilla (`cqi`), para que quepan de 1.024 a 1.440 px; en la fila de cuatro, el nombre puede ocupar dos líneas.

### En el teléfono

Otra distribución (`MenuPhone`, que `Screen` monta en lugar de los paneles y las tarjetas cuando `useIsPhone()`), al estilo de la pantalla de inicio de un gacha. El fondo, el sello, el personaje vivo, el barrido y el selector son los mismos.

| Zona | Qué hay |
|---|---|
| Arriba | El nivel en un círculo, el rango y la barra de XP; a la derecha, el oro y los objetos con su «+» |
| Izquierda | Cambiar de personaje (abre el selector) · Buscar · Ajustes (una hoja que sube desde abajo con las filas de `MenuSettings`; se cierra con ✕, tocando fuera o arrastrando su asa) |
| Derecha | Personaje · Inventario · Almanaque · Crónica · Personalizar |
| Centro | El personaje del día, grande; lo de abajo pasa por delante |
| Abajo | Lo que dice el personaje, en un bocadillo; **Quests** (las que hay en curso y la actual; vuelve al tablón) y, a los lados, la rareza de la semana y la tienda de Hu Tao, con los días que faltan para el cambio |

- **La barra de abajo flota encima** (el menú, capa 39; la barra, 40), con su selector en «Menú»: es la misma en todas las pantallas ([mobile](../mobile/README.md#el-armazón)).
- **Sin «Volver»**: se sale con la barra de abajo o con «Quests».
- Las tarjetas Bounties y Calendar no están: van en la barra.

### Las ventanas se abren encima del menú

El mercader, el personaje, los objetos, la crónica y la personalización se abren **encima** (capa 50 sobre 47) y, al cerrarlas, se vuelve al menú. Las tres secciones (Quests, Bounties, Calendar) **cierran** el menú y llevan a la sección; la **búsqueda** también lo cierra antes, porque lleva a otro sitio. Si algo cambia de sección por debajo, el menú se aparta solo (`MenuScreen` escucha `section`). Por qué una pantalla y no un desplegable u otra ventana: [ADR-49](../../../docs/decisions/ADR-49-menu-de-opciones.md).

### Personajes

- **De serie:** los `.webp` de `public/menu/`. Para añadir uno basta con dejar el archivo ahí: su id es `builtin:<archivo>` y su nombre traducido va en `menu.cast.names` (sin traducción, el del archivo: «mihari_mahiro» → «Mihari Mahiro»). Como `import.meta.glob` no ve `public/`, el plugin `menuCharacters` de `vite.config.ts` lista la carpeta como el módulo virtual `virtual:menu-characters`; con `pnpm dev`, añadir o quitar un archivo recarga la app.
- **Rotación** (`characterOfDay`, pura): los días (`dayNumber`, días de calendario en hora local) se agrupan en vueltas de tantos días como personajes, cada una barajada con su número como semilla. Si el primero de una vuelta es el último de la anterior, se cambia por el segundo (con tres o más); con dos, se alternan. **Añadir o quitar un personaje cambia el tamaño de la vuelta** y la rotación se baraja de nuevo desde ese día ([ADR-50](../../../docs/decisions/ADR-50-personajes-del-menu.md)).
- **Elegir uno para hoy** (`pickCharacter`): se guarda en este equipo (`quests.menuCharacter`: el día y el id) y solo vale ese día; no se sincroniza y la rotación no se entera. Elegir el de la rotación (o «Seguir la rotación») borra la elección.
- **Añadir** (`addCharacter`): un WebP, PNG o AVIF de hasta 5 MB se guarda tal cual (sin perder la transparencia); uno mayor se reduce a 1.800 px en WebP o PNG (nunca JPEG). Una **imagen animada** (GIF, APNG, WebP o AVIF animados, que `isAnimatedImage` reconoce por su cabecera) o un **vídeo** (WebM, MP4 o MOV) se guarda tal cual, hasta 30 MB: un canvas se quedaría con el primer fotograma. Va al almacén de binarios por su SHA-256, y `character_added` lleva su referencia (con `animated` si se mueve solo) y una miniatura de 160 px (de un vídeo, su primer fotograma). Queda elegido para hoy. Un vídeo se reproduce en bucle y sin sonido; si tiene transparencia depende del equipo (WebM con alfa en Chromium y Windows; en Safari, HEVC con alfa), y uno con fondo queda mejor con los «bordes suaves» de [living](../living/README.md).
- **Quitar** (`removeCharacter`): segundo toque («¿Quitar?»); borra la imagen si ya no la usa nadie (`blobsInUse`, en `src/domain/blobs.ts`, que junta los binarios de encargos, mercader y personajes para la limpieza y la sincronización). Sus frases se van con él. Quitar no se deshace (la imagen ya se habría borrado). Los de serie no se quitan desde la app.
- **Añadir y quitar** se hace en el selector del menú o en la [personalización](../customize/README.md); son las mismas acciones.
- En otro equipo, la referencia puede llegar antes que la imagen: mientras, se pinta la miniatura, borrosa.

### Lo que dice cada personaje

- **Frases del jugador** (`VoiceLine`): para cualquier personaje, también los de serie (su id es `builtin:<archivo>`), y para una de las cuatro partes del día (`daypart`). **Sin límite de frases**; cada una, de hasta 240 caracteres, sin saltos de línea ni espacios repetidos (`cleanVoice`).
- **Qué dice** (`voiceLine`): si tiene alguna para la parte del día, una de ellas al azar, elegida cada vez que se abre el menú (`MenuVoice`); si no, la de serie del diccionario (`menu.voice.*`). Las suyas **sustituyen** a la de serie, no se mezclan: así el personaje habla como el jugador quiere.
- **Se escriben, editan y quitan** en la [personalización](../customize/README.md) (`addVoiceLine`, `updateVoiceLine`, `removeVoiceLine`). Lo que escribe el jugador no se traduce.

### Los ajustes

Son los componentes de cada funcionalidad (`LangSwitch`, `MusicControl`, `SyncControl`, `NotifyButton` / `NotifyMenuToggle`) y el silencio general; en el teléfono, también la **vibración** (`src/lib/haptics.ts`, solo donde puede vibrar; [mobile](../mobile/README.md#vibración)). En el escritorio, iconos en la barra de arriba con su desplegable al pasar el ratón; en el teléfono, filas con su nombre y los desplegables abiertos. Como `MusicControl` solo se monta con el menú abierto, `MenuScreen` (siempre montado) llama a `music.armAutoplay()` al arrancar. El aviso (toast) del escritorio vive en el detalle de la quest, que el menú tapa: el menú pinta otro abajo, en el centro.

## Modelo

`CharacterDef { id, name, art: CharacterArt (blobId, mime, size, animated?), thumb?, createdAt }` en `GameState.characters` y `VoiceLine { id, characterId, part: Daypart, text, createdAt }` en `GameState.voiceLines`; no tocan al jugador. `CharactersAcc { list, deleted, lines, linesDeleted }` en `ProjectionAcc.characters`. Funciones puras de `model.ts`: `daypart`, `activeQuests`, `daysUntil`, `applyCharacterEvent`, `characterBlobIds`, `cleanVoice`, `linesOf`, `voiceLine`, `dayNumber`, `rotationOrder`, `characterOfDay`, `shownCharacter`.

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `character_added` | `character: CharacterDef` | Lo añade a `GameState.characters` (nombre recortado; vacío, «?») | Se ignora si el id existe o se quitó, empieza por `builtin:` o no trae `art.blobId` |
| `character_removed` | `characterId` | Lo quita, con sus frases; el id queda retirado | Si existe |
| `voice_line_added` | `line: VoiceLine` | La añade a `GameState.voiceLines` (texto limpio y recortado) | Se ignora si el id existe o se quitó, el texto queda vacío, la parte del día no existe o su personaje se quitó |
| `voice_line_updated` | `lineId`, `text` | Cambia el texto | Si existe y el texto no queda vacío |
| `voice_line_removed` | `lineId` | La quita; el id queda retirado | Si existe |

Los acumuladores ganaron las frases, así que `PROJECTION_VERSION` pasó a 12. Un equipo sin actualizar ignora los eventos de frases (no los conoce) y su personaje dice la de serie.

## Interfaz

| Dónde | Tecla | Qué hace |
|---|---|---|
| Tablón, encargos y calendario | `O` | Abre el menú |
| Menú | `Esc` u `O` | Lo cierra |
| Menú | `I` `C` `P` `J` `/` `L` `M` | Las mismas que en el tablón |

- **Teclado en captura.** Con el menú abierto, el teclado del tablón espera (`menuBusy`). El del menú escucha **en captura**: corre antes que el de las ventanas y, si hay una abierta encima (`windowOpen`), no hace nada. Así `Escape` cierra primero la ventana y luego el menú.
- **El barrido.** Un borde inclinado (`clip-path: polygon(…)`) cruza la pantalla de derecha a izquierda en 0,5 s, con una línea dorada (un `path` SVG) y seis rayas de velocidad; suena `sfx.menuOpen`. Detrás, el personaje entra desde la izquierda y las tarjetas llegan una a una girando. Al cerrar, el borde vuelve a la derecha en 0,34 s (`sfx.menuClose`). Con «reducir movimiento», solo aparece y desaparece.
- **Profundidad.** La perspectiva va en `.mn-tiles` y el giro (`rotateY(-13°) rotateX(3°)` más el paralaje) en `.mn-tilt`, con `preserve-3d` hasta los textos. Cada tarjeta tiene tres planos: fondo con marca de agua (z 0), logo (z 28 px) y rótulo (z 40 px); al pasar el ratón, la tarjeta sube 20 px y el rótulo 58. **Nada entre `.mn-tilt` y los textos puede llevar `overflow`, `opacity` menor que 1, `filter` ni `clip-path`**: aplanarían el 3D (por eso el recorte va en la capa de fondo de cada tarjeta). La entrada de cada tarjeta anima su opacidad, así que esa parte dura solo 0,1 s, al principio del giro: si durase todo el muelle, el logo y el rótulo se pintarían aplanados (más pequeños) y, al llegar a 1, saltarían hacia delante.
- **El personaje**, en tres capas para no pisar animaciones: `.mn-hero` (paralaje, CSS), `.mn-hero-in` (entrada y cambio, Motion) y, dentro, el personaje vivo (`LivingCharacter` de [living](../living/README.md): malla, aura, partículas y la entrada gacha). Con la entrada gacha, `.mn-hero-in` no se desliza: solo aparece, y el personaje se revela en su sitio tras el barrido. Cabe entero y de pie. Lo que dice cambia según la hora (`daypart`: mañana, tarde, noche y madrugada).
- **Teléfono:** el menú ocupa la pantalla encima de la barra (capa 39, debajo de la barra, 40) y se desplaza: arriba el aventurero y el personaje (quieto a la derecha; las tarjetas pasan por encima al bajar), luego las tarjetas a lo ancho, el coleccionable y los ajustes. Sin paralaje; la rejilla gira menos (−5°). El selector de personajes ocupa la pantalla, a dos columnas.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | Puro: `daypart`, `activeQuests`, `daysUntil`; personajes (`CharacterDef`, `applyCharacterEvent`), sus frases (`VoiceLine`, `voiceLine`) y rotación (`characterOfDay`, `shownCharacter`) |
| `events.ts` | `character_added`, `character_removed` y los tres de las frases |
| `characters.ts` | Lista de personajes: los de serie (`virtual:menu-characters`) y los del jugador |
| `image.ts` | Imagen (o vídeo) y miniatura de un personaje añadido (canvas) |
| `media.ts` | Puro: si un archivo es un vídeo aceptado o una imagen animada (por su cabecera) |
| `ui.ts` | Menú abierto, selector abierto y lo elegido para hoy (en este equipo); `menuBusy` |
| `actions.ts` | `openMenu`, `closeMenu`, `toggleMenu`, `goTo`, `openOver`, `searchFromMenu`, `windowOpen`, `pickCharacter`, `addCharacter`, `removeCharacter`, `addVoiceLine`, `updateVoiceLine`, `removeVoiceLine` |
| `components/MenuButton.tsx` | Pestaña «MENU» de la cabecera y botón del pie |
| `components/MenuScreen.tsx` | La pantalla: barrido, personaje, decoración, teclado y paralaje |
| `components/MenuTiles.tsx` | Las tarjetas en perspectiva |
| `components/MenuPhone.tsx` | El menú del teléfono: botones redondos, «Quests», la voz y la hoja de ajustes |
| `components/MenuPanels.tsx` | Volver, monedas, aventurero, lo que dice el personaje (sus frases o la de serie) y el coleccionable |
| `components/MenuCast.tsx` | Selector de personajes, `useCast`, `CharacterImage` (imagen o vídeo), `CHARACTER_ACCEPT` |
| `components/MenuSettings.tsx` | Idioma, música, sonido, avisos y Google Drive |
| `components/MenuIcons.tsx` | Rombos del menú, almanaque, reloj, volver y el sello del gremio |
| `menu.css`, `i18n.ts` | Pestaña, pantalla, barrido, tarjetas en 3D, ajustes y teléfono; textos es + ja |
| `media.test.ts` | PNG y APNG, WebP fijo y animado, GIF, AVIF y archivos cortos; tipos de vídeo |
| `model.test.ts` | Personajes y sus frases, rotación (2.000 días con 5, 3 y 2 personajes, cambio de hora), partes del día, quest actual y días hasta el escaparate |

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
| Menú del teléfono | [`MenuPhone`](components/MenuPhone.tsx), con [`PhoneTop`](components/MenuPhone.tsx) y [`PhoneBottom`](components/MenuPhone.tsx) |
| Selector de personajes | [`MenuCast`](components/MenuCast.tsx) y [`CharacterImage`](components/MenuCast.tsx) |
| Rotación diaria y elección del día | [`characterOfDay`](model.ts), [`shownCharacter`](model.ts) y [`pickCharacter`](actions.ts) |
| Imagen animada o vídeo al añadir | [`prepareCharacter`](image.ts) e [`isAnimatedImage`](media.ts) |
| Personajes de serie | [`BUILTIN_CHARACTERS`](characters.ts), que lista el plugin [`menuCharacters`](../../../vite.config.ts) |
| Lo que dice el personaje: sus frases o la de serie | [`voiceLine`](model.ts) y [`MenuVoice`](components/MenuPanels.tsx); las guardas, en [`applyCharacterEvent`](model.ts) |
| Escribir, editar y quitar frases | [`addVoiceLine`](actions.ts), [`updateVoiceLine`](actions.ts) y [`removeVoiceLine`](actions.ts) |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/App.tsx` | `<MenuScreen />`, `menuBusy()` en el teclado y la tecla `O` |
| `src/components/Header.tsx` | `<MenuButton />`; solo quedan el emblema, el selector de sección, el rango, la XP, el oro y la lupa |
| `src/components/Footer.tsx` | `<MenuFooterButton />` (tecla `O`) |
| `src/lib/sfx.ts` | `menuOpen` y `menuClose` |
| `src/domain/events.ts` | `MenuEventBody` en la unión |
| `src/domain/projection.ts` | `ProjectionAcc.characters` (`CharactersAcc`), los cinco `case`, `GameState.characters` y `GameState.voiceLines` |
| `src/domain/types.ts` | `GameState.characters: Map<string, CharacterDef>` y `GameState.voiceLines: Map<string, VoiceLine>` |
| `vite.config.ts`, `src/vite-env.d.ts` | Plugin `menuCharacters` y el tipo de `virtual:menu-characters` |
| `src/domain/blobs.ts` | `characterBlobIds` en los binarios en uso (`blobsInUse`: limpieza y subida a Drive) |
| `src/features/mobile/components/MobileNav.tsx` | La barra, a cuatro botones (`toggleMenu`) |
| `public/menu/` | Los personajes de serie |
| `src/i18n/locales/{es,ja}.ts` | `menu: menuEs` / `menuJa` |
| `src/test/streams.ts` | `characterDef`, `voiceLine` y los eventos de personajes y frases en `randomStream` |

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
- **features/customize** (`ui.ts`, `CustomizeIcons`): la tarjeta Customize y que `windowOpen` espere con la ventana abierta. Para cambiar la ventana, lee su README.
- **features/living** (`index`: `LivingCharacter`, `useCharacterStyle`): el personaje vivo del centro. Para cambiar cómo se mueve, lee su README.
- **La usan:** `customize` (personajes, frases y sus acciones), `living` (el personaje que se pinta y `media.ts`), `companion` (personajes, el de hoy y `cleanVoice`), `mobile` (barra) y `temporal` (`image.ts` y `prettyName` para sus ilustraciones).

## Estado actual

- **Última verificación:** 2026-10-09, el menú del teléfono (`MenuPhone`) en el navegador a 402 × 874, en español y japonés: la barra flotante encima, «Quests» al tablón, la crónica se abre encima y los ajustes en su hoja; el escritorio, igual que antes. Y en el simulador de iOS (iPhone 17). El 2026-10-08, el personaje vivo y un personaje en vídeo (WebM generado en el navegador) a 1.280 × 800, 1.024 × 700 y 402 × 874. Antes, el mismo día, frases y la tarjeta Customize: tests y navegador a 1.280 × 800 y 402 × 874 (la fila de cuatro tarjetas cabe; con Kazuma elegido, dice su frase de mañana). El resto, el 2026-10-07: tests y navegador a 1.280 × 800, 1.024 × 680 y 402 × 874, en español y japonés (barrido, paralaje, ventanas encima y Escape, secciones, búsqueda, los personajes de `public/menu/`, elegir, añadir un PNG y quitarlo).
- **Tests:** `model.test.ts`.
- **Sin verificar:** un GIF o APNG real y un vídeo con transparencia en Safari; un personaje añadido o sus frases llegando a otro equipo por Drive; el sonido del barrido; la app nativa de macOS y Windows y un iPhone real; teléfonos más estrechos que 402 px; el rendimiento del 3D en un equipo lento.
- **Historial:** [docs/history/verificacion/menu.md](../../../docs/history/verificacion/menu.md).
