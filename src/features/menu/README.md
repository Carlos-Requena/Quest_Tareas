# Menú de opciones

La interfaz se había llenado de botones: la cabecera llevaba el mercader, el personaje, los objetos, la crónica, el idioma, la música, el silencio, los avisos y Google Drive, y el pie, una tecla por ventana. Todo eso pasa a **una pestaña de opciones** («MENU», en la cabecera), que abre con un **barrido** una pantalla al estilo del menú principal de un gacha (la referencia del propietario es el de Arknights): **el personaje del día** a un lado y, al otro, las **tarjetas de cada sección en perspectiva**, con su logo y el rótulo en relieve.

La pantalla es solo presentación. Lo único que guarda datos son los **personajes que añade el jugador**: dos eventos (`character_added`, `character_removed`) y su imagen en el almacén de binarios, para que se sincronicen. Los de serie son los `.webp` de `public/menu/`; la rotación diaria y la elección del día se calculan, sin eventos.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Que la interfaz no abrume | La cabecera se queda con el tablón, el rango, la XP, el oro, la lupa y la pestaña «MENU»; el pie, con una sola tecla (`O`) en lugar de una por ventana |
| R2 | La tienda, el diario, la colección «y demás» en una pestaña de opciones | Mercader, personaje, objetos y almanaque, crónica, búsqueda, las tres secciones y los ajustes del equipo, en la pantalla del menú |
| R3 | Que entre con un efecto rápido («swift») | Barrido en diagonal de derecha a izquierda con un filo dorado y rayas de velocidad, en medio segundo; al cerrar, vuelve a la derecha |
| R4 | Profundidad en los textos de cada sección, con su logo | Rejilla girada en 3D (`perspective` + `preserve-3d`): el logo en su rombo y el rótulo flotan delante de la tarjeta (`translateZ`), con relieve de sombras en capas; el logo en grande, como marca de agua, en el plano de la tarjeta. El ratón inclina la rejilla (paralaje) y al pasar por encima la tarjeta se acerca |
| R5 | Fiel al estilo de la app | Fondo oscuro con grano, oro, rombos, Cinzel y Cormorant; cada tarjeta con el color de su funcionalidad (pergamino, rojo de la funeraria, calaveras, cuero de la crónica); el fondo comprado al mercader se ve detrás |
| R6 | Un personaje en lugar del de la referencia | Los `.webp` de `public/menu/` (Kazuma, Aqua, Azusa, Mio, Mihari y Mahiro; las imágenes que dio el propietario, con fondo transparente) y los que añada el jugador |
| R6b | Rota cada día, al azar pero sin repetir hasta que salgan todos | `characterOfDay`: vueltas de tantos días como personajes, cada una barajada con su número como semilla (el mismo orden en todos los equipos) |
| R6c | Elegir otro para hoy sin cambiar la rotación | `pickCharacter`: se guarda en este equipo con el día; mañana sale el que tocaba |
| R6d | Añadir personajes desde el menú | «Añadir personaje» en el selector: la imagen va al almacén de binarios y el evento `character_added`, a todos los equipos |
| R7 | No tocar la lógica del juego | La pantalla solo lee el estado y llama a las mismas acciones que antes. Los personajes añadidos sí son eventos (lo pidió el propietario, para que se sincronicen), pero no tocan al jugador: ni XP ni oro |
| R8 | También en el iPhone | La barra de abajo pasa a Tablón · Encargos · Calendario · Menú; el menú ocupa la pantalla encima de la barra y se desplaza |

---

## Decisiones de diseño

### La pantalla

| Zona | Qué hay | Equivale en la referencia a |
|---|---|---|
| Arriba a la izquierda | «‹ Volver» (Escape) y los ajustes: idioma, música, silencio, avisos y Google Drive | Ajustes, avisos, correo |
| Arriba a la derecha | Fecha y hora, el oro y los objetos, cada uno con su «+» (abren el mercader y el inventario) | Las monedas |
| Izquierda | El nivel en un anillo que se llena con la XP del nivel, el rango en su rombo y lo que dice el personaje según la hora, con el botón para cambiarlo | Nivel, nombre y el saludo |
| Abajo a la izquierda | **Weekly Rarity**: el coleccionable que vende Hu Tao esta semana, del color de su rareza; abre su pestaña en la tienda | Las noticias |
| Centro | El personaje del día, con el sello del gremio girando detrás, polvo dorado y «Quest Board» en contorno | El personaje y el logo |
| Derecha | Las tarjetas | Los botones del menú |

Las tarjetas, como en la referencia:

| Fila | Tarjetas | Qué hace |
|---|---|---|
| 1 | **Quests** (grande, en pergamino claro): cuántas hay en curso y la última aceptada («Actual») | Vuelve al tablón |
| 2 | **Character** · **Bounties** (con el aviso rojo de los encargos de hoy) | Personaje (`P`) · tablón de encargos |
| 3 | **Merchant** (rojo, con Hu Tao asomando y los días que faltan para cambiar el escaparate) · **Collection** (Inventory · Almanac, en oro) | Mercader (`C`) · objetos (`I`) o almanaque |
| 4 | **Chronicle** · **Calendar** · **Search** | Crónica (`J`) · calendario · búsqueda (`/`) |

Los **rótulos grandes van en inglés**, como ELITE, QUEST CLEAR o los títulos de las ventanas (Merchant, Chronicle…): son decorativos. Debajo de cada uno va su nombre traducido. El tamaño de los rótulos sigue al ancho de la rejilla (`cqi`, unidades de contenedor), para que quepan de 1.024 a 1.440 px.

### Las ventanas se abren encima del menú

El mercader, el personaje, los objetos y la crónica se abren **encima** del menú (capa 50 sobre 47): al cerrarlas se vuelve a él, como en el menú principal de un gacha. Las tres secciones (Quests, Bounties, Calendar) **cierran** el menú y llevan a la sección. La **búsqueda** también lo cierra antes de abrirse, porque lleva a otro sitio (una quest, un encargo, un día) que el menú taparía.

Si algo cambia de sección por debajo (un enlace, la barra del teléfono), el menú se aparta solo (`MenuScreen` escucha `section`).

### Teclado

| Dónde | Tecla | Qué hace |
|---|---|---|
| Tablón, encargos y calendario | `O` | Abre el menú (también el botón «MENU» y el del pie) |
| Menú | `Esc` u `O` | Lo cierra |
| Menú | `I` `C` `P` `J` `/` `L` `M` | Las mismas que en el tablón: objetos, mercader, personaje, crónica, búsqueda, idioma y música |

Con el menú abierto, el teclado del tablón espera (`menuBusy` en `App.tsx`). El del menú escucha **en captura**: corre antes que el de las ventanas y, si hay una abierta encima (`windowOpen`), no hace nada. Así, `Escape` cierra primero la ventana y luego el menú, nunca los dos de golpe. Las teclas `I`, `C`, `P` y `J` siguen funcionando desde el tablón.

### El barrido

El menú entra recortado por un borde inclinado (`clip-path: polygon(…)`) que cruza la pantalla de derecha a izquierda en 0,5 s; encima va una línea dorada (un `path` de SVG que se mueve igual) y seis rayas de velocidad. A la vez suena un silbido que sube con un destello metálico (`sfx.menuOpen`). Detrás del barrido, el personaje entra desde la izquierda, los paneles se deslizan y las tarjetas llegan una a una desde la derecha girando hasta su sitio. Al cerrar, el borde vuelve a la derecha en 0,34 s (`sfx.menuClose`).

Con «reducir movimiento», el menú solo aparece y desaparece: sin barrido, sin paralaje, sin giro del sello ni respiración del personaje.

### Profundidad

La perspectiva va en `.mn-tiles` y el giro (`rotateY(-13°) rotateX(3°)`, más el paralaje del ratón) en `.mn-tilt`, con `transform-style: preserve-3d` hasta los textos. Cada tarjeta tiene tres planos: el fondo con la marca de agua (z 0), el logo en su rombo (z 28 px) y el rótulo con el nombre (z 40 px); al pasar el ratón, la tarjeta sube 20 px y el rótulo, 58. **Ningún elemento entre `.mn-tilt` y los textos puede llevar `overflow`, `opacity` menor que 1, `filter` ni `clip-path`**: aplanarían el 3D. Por eso el recorte (`overflow: hidden`) va en la capa de fondo de cada tarjeta y no en la tarjeta.

El relieve de los rótulos son cuatro sombras de 1 px que bajan del oro a la sombra, y una difusa debajo.

### El personaje del día

Tres capas para no pisar animaciones: `.mn-hero` lleva el paralaje (CSS), `.mn-hero-in` la entrada y el cambio de personaje (Motion) y `.mn-breathe` la respiración (CSS). Cada imagen trae su proporción: cabe entera y de pie sobre el suelo (`object-fit: contain`, abajo). Lo que dice cambia según la hora (`daypart`: mañana, tarde, noche y madrugada), con su nombre, y se escribe de izquierda a derecha al abrir el menú. Las frases sirven para cualquier personaje.

**De dónde salen.** Los de serie son los `.webp` de `public/menu/`: para añadir uno a la app basta con dejar el archivo ahí (el nombre del archivo es su id, `builtin:<nombre>`, y su nombre traducido va en `menu.cast.names`; sin traducción, el del archivo: «mihari_mahiro» → «Mihari Mahiro»). JavaScript no puede listar una carpeta, y `import.meta.glob` no ve `public/`, así que un plugin de `vite.config.ts` (`menuCharacters`) la lee al compilar y la ofrece como el módulo virtual `virtual:menu-characters`; con `pnpm dev`, añadir o quitar un archivo recarga la app. Los que añade el jugador son eventos (abajo).

**Rotación** (`characterOfDay`, pura). Los días (`dayNumber`: días de calendario en la hora local, cambia a medianoche) se agrupan en vueltas de tantos días como personajes. Cada vuelta baraja los personajes con su número como semilla: sale cada uno una vez, en un orden al azar, el mismo en todos los equipos. Para que no se repita el mismo dos días seguidos al pasar de una vuelta a otra, si el primero de una vuelta es el último de la anterior, se cambia por el segundo (con tres o más; eso nunca toca el último, así que la vuelta anterior no cambia). Con dos, se alternan. **Añadir o quitar un personaje cambia el tamaño de la vuelta**: desde ese día la rotación se baraja de nuevo, y alguno puede repetirse antes de tiempo. Recordar lo que ya ha salido evitaría eso, pero sería estado guardado y sincronizado para algo que se calcula.

**Elegir uno para hoy** (`pickCharacter`). Se guarda en este equipo, como el idioma (`quests.menuCharacter`: el día y el id), y solo vale ese día: `shownCharacter` lo enseña si es de hoy y, si no, el de la rotación. La rotación no se entera: mañana sale el que tocaba. Elegir el de la rotación (o «Seguir la rotación») borra la elección. No se sincroniza: elegir uno en el Mac no lo cambia en el iPhone.

**Añadir y quitar** (`addCharacter`, `removeCharacter`). En el selector, «Añadir personaje» pide una imagen. Un WebP, PNG o AVIF de hasta 5 MB se guarda tal cual (sin recomprimir, para no perder la transparencia); uno más grande se reduce a 1.800 px y se guarda en WebP o, si el WebView no sabe codificarlo, en PNG (nunca en JPEG). Va al almacén de binarios por su SHA-256 y el evento `character_added` lleva su referencia y una miniatura de 160 px; queda elegido para hoy. Quitar pide un segundo toque («¿Quitar?») y borra la imagen si ya no la usa nadie: el almacén lo comparten los encargos, el mercader y los personajes (`characterBlobIds` se suma a `liveBlobIds` y `gearBlobIds` en la limpieza y en la sincronización). Los de serie no se quitan desde la app: están en la carpeta.

En otro equipo, la referencia puede llegar antes que la imagen: mientras tanto se pinta la miniatura, borrosa. Quitar no se puede deshacer (features/undo): la imagen ya se habría borrado.

### Los ajustes

Son los mismos componentes de antes (`LangSwitch`, `MusicControl`, `SyncControl`, `NotifyButton`). En el escritorio van en la barra de arriba, como iconos con su desplegable al pasar el ratón. En el teléfono, que no tiene ratón, en filas con su nombre y los desplegables abiertos, como en el antiguo menú «Más» (que desaparece: este menú lo sustituye).

`MusicControl` armaba la música al montarse en la cabecera; ahora solo se monta con el menú abierto, así que `MenuScreen` (siempre montado) llama a `music.armAutoplay()` al arrancar.

El aviso (toast) del escritorio vive en el detalle de la quest, que el menú tapa: el menú pinta otro abajo, en el centro.

### En el teléfono

- La barra de abajo pasa de seis botones a cuatro: **Tablón · Encargos · Calendario · Menú**. El mercader y el personaje están en el menú.
- El menú ocupa la pantalla encima de la barra (capa 39, debajo de la barra, 40) y se desplaza: arriba el aventurero y el personaje, luego las tarjetas a lo ancho, el coleccionable de la semana y los ajustes.
- El personaje se queda quieto arriba a la derecha; las tarjetas pasan por encima al bajar. El selector de personajes ocupa la pantalla, a dos columnas.
- Sin ratón no hay paralaje; la rejilla tiene un giro menor (−5°).

### Descartado

- **Una ventana más (como el mercader)** en lugar de una pantalla: no daría la sensación de «menú principal» ni dejaría sitio para el personaje.
- **Un menú desplegable** en la cabecera: ordena, pero no es lo que pidió el propietario.
- **Rótulos traducidos en grande**: en japonés y en español quedarían mucho más largos; la app ya deja en inglés los rótulos decorativos.

---

## Archivos

```
src/features/menu/
├── README.md
├── index.ts              API pública
├── model.ts              Puro: daypart, activeQuests, daysUntil; personajes (CharacterDef, applyCharacterEvent) y rotación (characterOfDay, shownCharacter)
├── model.test.ts
├── events.ts             character_added, character_removed
├── characters.ts         Lista de personajes: los de serie (virtual:menu-characters) y los del jugador
├── image.ts              Imagen y miniatura de un personaje añadido (canvas)
├── ui.ts                 Store de UI: menú abierto, selector abierto y lo elegido para hoy (en este equipo)
├── actions.ts            openMenu, closeMenu, toggleMenu, goTo, openOver, searchFromMenu, windowOpen, pickCharacter, addCharacter, removeCharacter
├── i18n.ts               Textos es + ja
├── menu.css              Pestaña, pantalla, barrido, tarjetas en 3D, ajustes y teléfono
└── components/
    ├── MenuButton.tsx    Pestaña «MENU» de la cabecera y botón del pie
    ├── MenuScreen.tsx    La pantalla: barrido, personaje, decoración, teclado y paralaje
    ├── MenuTiles.tsx     Las tarjetas en perspectiva
    ├── MenuPanels.tsx    Volver, monedas, aventurero, lo que dice el personaje y el coleccionable
    ├── MenuCast.tsx      Selector de personajes, useCast, CharacterImage
    ├── MenuSettings.tsx  Idioma, música, sonido, avisos y Google Drive
    └── MenuIcons.tsx     Rombos del menú, almanaque, reloj, volver y el sello del gremio
public/menu/*.webp        Los personajes de serie, con fondo transparente
```

## Puntos de integración

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | `<MenuScreen />` (sustituye a `MobileMenu`), `menuBusy()` en el teclado y la tecla `O` |
| `src/components/Header.tsx` | Fuera los botones de objetos, mercader, personaje y crónica, el idioma, la música, el silencio, los avisos y Google Drive; dentro, `<MenuButton />` |
| `src/components/Footer.tsx` | `<MenuFooterButton />` (tecla `O`) en lugar de los botones de cada ventana |
| `src/lib/sfx.ts` | `menuOpen` y `menuClose` |
| `src/domain/events.ts` | `MenuEventBody` en la unión (42 tipos) |
| `src/domain/projection.ts` | `ProjectionAcc.characters` (`CharactersAcc`), los dos `case` y `GameState.characters`; `PROJECTION_VERSION` pasa a 11 |
| `src/domain/types.ts` | `GameState.characters: Map<string, CharacterDef>` |
| `vite.config.ts`, `src/vite-env.d.ts` | Plugin `menuCharacters` y el tipo de `virtual:menu-characters` |
| `features/temporal`, `merchant`, `sync` (`actions.ts`) | `characterBlobIds` en los binarios en uso (limpieza y subida a Drive) |
| `src/test/streams.ts` | `characterDef` y los eventos de personajes en `randomStream` (repetidos, quitados, de serie y sin imagen) |
| `src/i18n/locales/{es,ja}.ts` | `menu: menuEs` / `menuJa` |
| `features/mobile` | La barra, a cuatro botones (`MenuIcon`, `toggleMenu`); fuera `MobileMenu`, `useMobileUi.menu` y sus textos y estilos |
| `features/notifications` | `NotifyMenuToggle` se usa en los ajustes del menú (su clase `.mmenu-toggle` está ahora en `menu.css`) |
| `features/items`, `merchant`, `equipment`, `chronicle` | Fuera los botones de la cabecera (`ItemsButton`, `MerchantButton`, `CharacterButton`, `ChronicleButton`) y su CSS; los iconos se quedan, en archivos con su nombre (`BagIcon.tsx`, `LanternIcon.tsx`, `HelmetIcon.tsx`, `DiaryIcon.tsx`) |

---

## Verificación

- **Tests** (`model.test.ts`, 16): los personajes añadidos (una vez, quitados sin resucitar, sin los de serie ni los que no traen imagen, sin tocar al jugador, sus imágenes cuentan como usadas); la rotación (todos una vez por vuelta, el orden cambia de vuelta en vuelta, nunca dos días seguidos el mismo con 5, 3 y 2 personajes en 2.000 días, igual sea cual sea el orden de la lista, medianoche y cambio de hora); elegir para hoy no cambia el de mañana y uno quitado vuelve a la rotación. Prueba de mutación: sin el arreglo entre vueltas, falla el test de los días seguidos. Además: las cuatro partes del día en sus bordes; la quest actual es la última aceptada y no cuentan las abandonadas; los días hasta el cambio del escaparate, también la semana del cambio de hora (encontró un fallo: contando milisegundos, el lunes a primera hora de esa semana salían 8 días; ahora se cuentan medianoches).
- **Navegador** (`pnpm dev`), en español y en japonés:
  - Escritorio a 1.280 × 800 y a 1.024 × 680: la pantalla entera, el paralaje y el acercamiento al pasar el ratón; un fotograma del barrido a mitad; la tarjeta grande con tres quests en curso (cambiando el estado solo en memoria, sin escribir eventos); el pie cabe a 1.024 px (con los cuatro botones de ventana de antes ya se salía por la derecha).
  - Flujos: mercader y almanaque encima del menú y `Escape` vuelve a él; `J` abre la crónica y dos `Escape` cierran la crónica y luego el menú; Bounties, Calendar y Quests cambian de sección y cierran el menú; Search cierra el menú y abre la búsqueda; con el menú abierto, `T` no cambia de sección.
  - Personajes (escritorio y teléfono, en japonés): los cinco `.webp` de `public/menu/` salen en el selector; hoy, el de la rotación con «今日»; elegir otro lo marca «選択中», lo pone en pantalla y no cambia el de mañana; «Seguir la rotación» lo quita; añadir un PNG transparente lo guarda en IndexedDB y lo elige para hoy; quitarlo (dos toques) borra su imagen del almacén; Escape cierra el selector sin cerrar el menú.
  - Teléfono a 402 × 874: la barra de cuatro botones, el menú entero desplazándose (tarjetas, coleccionable y ajustes en filas) y sin desplazamiento horizontal.
- **Sin probar**: un personaje añadido llegando a otro equipo por Drive (la imagen sigue el mismo camino que el fondo del mercader), el sonido del barrido (no se ha escuchado), la app nativa de macOS y Windows, el simulador de iOS y un iPhone de verdad, y el rendimiento del 3D en un equipo lento.
