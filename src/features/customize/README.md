---
funcionalidad: customize
titulo: Personalización
resumen: Ventana del menú (tarjeta Customize) para añadir personajes del menú (imagen, GIF o vídeo), lo que dicen en el menú y en «Mi día», cómo se mueven e ilustraciones de «Encargo cumplido».
tipo: presentación
eventos: []
preferencias: []
adr: [ADR-51, ADR-52]
---

# Personalización

Una sola ventana para todo lo que el jugador personaliza con imágenes y textos. Se abre desde la tarjeta **Customize** del [menú de opciones](../menu/README.md) y se pone encima de él, como el mercader o la crónica. Imita la ventana de misiones de Arknights que eligió el propietario (pestañas a la izquierda, la elegida en oro y con punta de flecha, y una línea de descripción arriba) y, para las imágenes, la de las escuadras (retratos en vertical y huecos vacíos con un «+»), con el estilo de la app: fondo oscuro, oro, rombos, Cinzel y Cormorant.

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | Una pestaña de personalización en las opciones, para lo que se personaliza (el personaje del menú, las ilustraciones de los encargos «etc.») | Ventana `CustomizeWindow`, abierta con la tarjeta Customize del menú; una pestaña por cosa (Cast, Bounties) |
| R2 | Con el estilo de la ventana de misiones de la captura, pero con el de la app | Columna de pestañas con su rombo, rótulo en inglés y nombre; la elegida, dorada y apuntando al contenido; línea «· descripción»; botón de cerrar redondo en la esquina |
| R3 | Añadir imágenes como las escuadras de la segunda captura (sin nivel ni nada) | Tarjetas de retrato con franja dorada, esquina con etiquetas y banda inclinada con el nombre; huecos rayados con «+» que abren el selector de archivos |
| R4 | Frases del personaje del menú según la hora, sin límite | Al elegir un personaje, pestaña **Menú**: una por parte del día (mañana, tarde, noche, madrugada) con sus frases en filas, como las misiones: añadir, editar y quitar |
| R5 | Personalizar cómo se mueven los personajes | Pestaña **Movimiento**: respiración, balanceo, viento, aura, brillo, partículas, entrada y bordes suaves, con el personaje vivo como vista previa ([living](../living/README.md)) |
| R6 | El compañero de Mi día, también personalizable | Pestaña **Mi día**: frases por situación y «Que me acompañe en Mi día» ([companion](../companion/README.md)) |
| R7 | Subir vídeos o imágenes animadas de personajes | Los huecos «+» de Cast aceptan PNG, WebP, AVIF, GIF, WebM, MP4 y MOV; un vídeo se reproduce en su tarjeta |

## Reglas y decisiones

- **La ventana solo presenta.** Lee el estado y llama a las acciones de la funcionalidad dueña de cada dato: los personajes y sus frases son de [menu](../menu/README.md); cómo se mueven, de [living](../living/README.md); lo que dicen en Mi día y quién acompaña, de [companion](../companion/README.md); y las ilustraciones, de [temporal](../temporal/README.md). Así cada dato tiene su modelo, sus guardas y su README, y una cosa personalizable nueva es otra pestaña ([ADR-51](../../../docs/decisions/ADR-51-personalizacion.md)).
- **Todo lo que se añade aquí llega a los otros equipos**: son eventos, con la imagen en el almacén de binarios.
- **Lo de serie no se quita** desde la app (los personajes de `public/menu/` y las ilustraciones de `public/temporal/<tipo>/`); lleva la etiqueta «De serie». Lo añadido se quita con dos toques («¿Quitar?»), sin deshacer, porque la imagen se borra.
- **Huecos «+»**: los que completan la fila, y al menos dos filas, como una escuadra sin completar (`slotsFor`). Todos abren el selector; el primero dice qué se añade.
- **El personaje elegido** tiene tres pestañas (Menú · Mi día · Movimiento); la última elegida se mantiene al pasar a otro personaje. A la izquierda, el personaje **vivo**, con su estilo, como en el menú; en Movimiento crece, porque es lo que se ajusta.
- **Movimiento:** cada cambio se guarda al momento (un evento con solo lo que cambia); «Ver la entrada» la repite en la vista previa (la gacha, con su sonido) y elegir una entrada también; «Restablecer» vuelve a los valores por defecto. En un vídeo o una imagen animada, el viento sale desactivado (ya se mueven solos) y, en un vídeo, el brillo.
- **Mi día:** siete situaciones; sin frases propias se ven las tres de serie, con los huecos `{{title}}`, `{{n}}` y `{{time}}` tal cual. El botón elige a este personaje como compañero o, si ya lo es, vuelve al personaje de hoy. La etiqueta «Compañero» marca en la rejilla a quien acompaña.
- **Frases**: sin límite de frases y de hasta 240 caracteres cada una. Sin ninguna a esa hora se ve la de serie, en cursiva y atenuada, que es la que dice el personaje; con varias, dice una al azar cada vez que se abre el menú. Las reglas están en el README del menú.
- **Ilustraciones**: una rejilla por tipo de encargo, con un botón por tipo abajo (como las escuadras) y la **vista previa**: un pergamino pequeño con la elegida impresa en sepia, el mismo componente que la animación (`IllustrationArt`).
- Las tarjetas recortan la imagen por arriba (`object-fit: cover`), como los retratos de una escuadra; el editor de frases la enseña entera.

## Eventos

No tiene eventos propios: los de las frases del menú son de [menu](../menu/README.md#eventos); los del estilo, de [living](../living/README.md#eventos); los del compañero, de [companion](../companion/README.md#eventos); y los de las ilustraciones, de [temporal](../temporal/README.md#eventos).

## Interfaz

| Tecla | Qué hace |
|---|---|
| `Escape` | En el editor de frases, vuelve a la rejilla; en la rejilla, cierra la ventana (se vuelve al menú). En un campo con texto, lo borra (frase nueva) o cancela la edición |
| `Enter` | En un campo, añade o guarda la frase |

- **Teclado.** Con la ventana abierta, el del menú y el del tablón esperan (`customizeBusy`, en `windowOpen` del menú y en `App.tsx`). Los campos marcan su `Escape` como atendido (`preventDefault`) para que la ventana no lo use.
- **Animaciones.** La ventana entra desde la derecha con un leve sesgo (Motion) y sale con `BACKDROP_EXIT` / `MODAL_EXIT`; las tarjetas llegan una tras otra; las frases entran y salen de lado. Con «reducir movimiento», sin desplazamientos.
- **Ventana estrecha** (hasta 1.180 px): columna de pestañas de 210 px, vista previa de 250 px y menos columnas de tarjetas (5 personajes, 3 ilustraciones; `useGridCols`), para que quepan los nombres y los tipos de encargo.
- **Teléfono.** A pantalla completa; las dos pestañas, arriba en fila; tres columnas de tarjetas (las etiquetas pasan a una segunda línea); quitar se ve siempre (sin pasar el ratón); el personaje elegido y la pestaña de ilustraciones, en una columna que se desplaza entera (sin `min-height: 0`, para que cada bloque mida su contenido); las pestañas Menú · Mi día · Movimiento, debajo del título; en Movimiento, la vista previa de 300 px de alto y cada control debajo de su nombre; las situaciones y los tipos de encargo, deslizables. Botones de 40 px y campos de 16 px.

## Archivos

| Archivo | Contenido |
|---|---|
| `ui.ts` | Estado de interfaz (Zustand): abierta, pestaña, personaje que se edita y su pestaña, parte del día, situación, veces que se pidió ver la entrada, tipo de encargo e ilustración de la vista previa; `openCustomize`, `closeCustomize`, `customizeBusy` |
| `components/CustomizeWindow.tsx` | La ventana: columna de pestañas, contenido, cerrar y `Escape` |
| `components/Cards.tsx` | Tarjeta de retrato (`Card`), su imagen (`CardImage`), los huecos «+» (`AddSlots`) y cuántos poner (`slotsFor`) |
| `components/CastPanel.tsx` | Pestaña de personajes: la rejilla, con cuántas frases tiene cada uno y quién acompaña |
| `components/CharacterEditor.tsx` | El personaje elegido: su vista previa viva, el compañero y las pestañas Menú · Mi día · Movimiento |
| `components/VoiceEditor.tsx` | Lo que dice en el menú: partes del día y sus frases (`VoicePanel`) |
| `components/CompanionPanel.tsx` | Lo que dice en Mi día: situaciones y sus frases |
| `components/MotionPanel.tsx` | Cómo se mueve: una fila por ajuste |
| `components/Lines.tsx` | Lista de frases común (`LineList`): las de serie o las propias, editar en el sitio, quitar con dos toques y añadir |
| `components/BountyPanel.tsx` | Pestaña de ilustraciones: rejilla por tipo, vista previa y un botón por tipo |
| `components/CustomizeIcons.tsx` | Pincel (la tarjeta del menú), retrato, cartel, partes del día, situaciones de Mi día, lápiz y papelera |
| `customize.css`, `i18n.ts` | Estilos (con su bloque de teléfono) y textos es + ja |

### Dónde está cada cosa

| Concepto | Símbolo |
|---|---|
| Abrir la ventana desde el menú | [`openCustomize`](ui.ts) (tarjeta Customize de `MenuTiles`) |
| `Escape` por capas y la columna de pestañas | [`CustomizeWindow`](components/CustomizeWindow.tsx) |
| Tarjeta de retrato y huecos «+» | [`Card`](components/Cards.tsx), [`AddSlots`](components/Cards.tsx) y [`slotsFor`](components/Cards.tsx) |
| Pestañas del personaje y vista previa viva | [`CharacterEditor`](components/CharacterEditor.tsx) |
| Frases por parte del día | [`VoicePanel`](components/VoiceEditor.tsx) con [`LineList`](components/Lines.tsx); las acciones, `addVoiceLine`, `updateVoiceLine` y `removeVoiceLine` de [menu](../menu/actions.ts) |
| Frases por situación y elegir compañero | [`CompanionPanel`](components/CompanionPanel.tsx); las acciones, de [companion](../companion/actions.ts) |
| Ajustes de movimiento | [`MotionPanel`](components/MotionPanel.tsx); las acciones, `setCharacterStyle` y `resetCharacterStyle` de [living](../living/actions.ts) |
| Ilustraciones por tipo y vista previa | [`BountyPanel`](components/BountyPanel.tsx); las acciones, `addTemporalArt` y `removeTemporalArt` de [temporal](../temporal/actions.ts) |
| Columnas de las rejillas (escritorio, ventana estrecha y teléfono) | [`useGridCols`](columns.ts) |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/App.tsx` | `<CustomizeWindow />` y `customizeBusy()` en el teclado |
| `src/features/menu/components/MenuTiles.tsx` | La tarjeta Customize (`openCustomize`, `BrushIcon`) |
| `src/features/menu/menu.css` | La fila de abajo, a cuatro tarjetas; Customize, a lo ancho en el teléfono |
| `src/features/menu/actions.ts` | `customizeBusy()` en `windowOpen` |
| `src/i18n/locales/{es,ja}.ts` | `customize: customizeEs` / `customizeJa` |

## Dependencias

- **features/menu** (`characters.ts`, `model.ts`, `media.ts`, `actions.ts`, `MenuCast`: `useCast`, `characterName`, `CHARACTER_ACCEPT`; `MenuIcons`: `Sigil`, `BackIcon`): los personajes, sus frases y sus acciones. Para cambiar cómo se eligen las frases o la rotación, lee su README.
- **features/living** (`index`: `LivingCharacter`, el estilo y sus acciones): la vista previa y la pestaña Movimiento. Para cambiar cómo se mueve un personaje, lee su README.
- **features/companion** (`index` y `model.ts`): las frases de Mi día, quién acompaña y sus acciones.
- **features/temporal** (`model.ts`, `heroes.ts`, `actions.ts`, `IllustrationArt`, `quote`): las ilustraciones, sus acciones y cómo se imprimen. Para cambiar la impresión en sepia, lee su README.
- **features/equipment** (`useBlobUrl`): la imagen de lo añadido, del almacén de binarios.
- **features/mobile** (`useIsPhone`, en `columns.ts`): tres columnas en el teléfono.
- **La usan:** `menu` (la tarjeta y `windowOpen`).

## Estado actual

- **Última verificación:** 2026-10-09, navegador a 1.024 × 768 y 402 × 874: las dos pestañas con 5 y 3 columnas en la ventana estrecha (nombres, «Añadir ilustración» y «Expedición» enteros). El 2026-10-08, a 1.280 × 800, 1.024 × 700 y 402 × 874, en español y japonés: las pestañas Menú · Mi día · Movimiento, la vista previa viva, el compañero y un personaje en vídeo.
- **Tests:** los de `src/features/menu/model.test.ts`, `src/features/living/model.test.ts`, `src/features/companion/model.test.ts` y `src/features/temporal/model.test.ts` (los datos son de esas funcionalidades).
- **Sin verificar:** la app nativa de macOS y Windows, el iPhone de verdad (el selector de archivos de iOS, con vídeos), una frase, un estilo o una ilustración llegando a otro equipo por Drive.
- **Historial:** [docs/history/verificacion/customize.md](../../../docs/history/verificacion/customize.md).
