---
funcionalidad: living
titulo: Personajes vivos
resumen: Los personajes del menú respiran, se mecen y les da el viento (una malla de WebGL sobre su imagen), con aura, brillo, partículas y entrada gacha, a elegir para cada uno.
tipo: presentación
eventos: [character_style_set, character_style_reset]
preferencias: []
adr: [ADR-52]
---

# Personajes vivos

El personaje del [menú](../menu/README.md) no es una imagen quieta: respira, se mece desde la cadera y el viento le mueve el pelo y la ropa, con un aura detrás, un barrido de luz, partículas alrededor y, si se quiere, una entrada como la de un personaje que sale en un gacha. Cómo se mueve cada uno se elige en la pestaña **Movimiento** de la [personalización](../customize/README.md), con una vista previa en vivo.

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | Animar los personajes que ya están guardados, con su imagen | Malla de WebGL (`createStage`): deforma la imagen por zonas, sin fotogramas nuevos |
| R2 | Efectos alrededor: brillo, aura, partículas y una entrada gacha | Capas de CSS (aura, barrido, partículas) y una línea de tiempo de GSAP (entrada) |
| R3 | Poder personalizarlo en Customize | Pestaña Movimiento del personaje; cada cambio es un evento |
| R4 | Subir vídeo o imagen animada para los que se animen a mano | Lo acepta el [menú](../menu/README.md#personajes) al añadir un personaje; se reproduce tal cual, con lo demás encima |

## Reglas y decisiones

- **La malla no inventa nada.** No genera fotogramas: mueve los píxeles de la imagen con desplazamientos pequeños y suaves. Las zonas salen de la altura y de la distancia al eje, porque los personajes están de pie, centrados y con los pies abajo:

  | Movimiento | Qué se mueve | Qué no |
  |---|---|---|
  | Respiración | Lo de encima de las rodillas sube un poco y el pecho se ensancha | Los pies |
  | Balanceo | Lo de encima de la cadera se mece, más cuanto más arriba | Las piernas |
  | Viento | Lo que sobresale a los lados, arriba (mechones) y abajo (capa, falda), con ráfagas | La cara, el cuerpo y los pies |

- **Imagen animada o vídeo:** ya se mueven solos, así que van sin malla. La respiración y el balanceo los mueven enteros con CSS; el viento no se aplica, y el brillo tampoco en un vídeo (se recorta con la propia imagen).
- **Sin WebGL o con «reducir movimiento»:** la imagen, con la animación de CSS (o quieta), y sin partículas, barrido ni entrada.
- **Un estilo por personaje**, de serie o añadido, que se guarda como **parche** sobre `DEFAULT_STYLE`: lo que no se ha tocado sigue al valor por defecto aunque este cambie. Restablecer borra el parche.
- **Colores, solo tokens:** cada aura es un token de `theme.css` (`AURA_TOKEN`); los pétalos y la nieve usan `--petal`, `--petal-lo` y `--frost`.
- **Valores por defecto:** respiración normal, balanceo y viento suaves, aura dorada, brillo, destellos, entrada deslizándose y sin bordes suaves. La entrada gacha es opcional porque el menú se abre muchas veces al día.
- Descartado: generar los fotogramas con un modelo (ni hay uno en la app ni lo pidió el propietario) y Live2D (exige preparar cada personaje por capas). El porqué, en [ADR-52](../../../docs/decisions/ADR-52-personajes-vivos-y-companero.md).

## Modelo

`CharacterStyle { breath, sway, wind: Level; aura: Aura; shine: boolean; particles: Particles; entrance: Entrance; fade: boolean }`, `StylePatch = Partial<CharacterStyle>` y `StylesAcc = Map<id, StylePatch>` en `ProjectionAcc.styles` (y `GameState.characterStyles`). Funciones puras de `model.ts`: `cleanPatch`, `applyStyleEvent`, `styleOf`, `isCustomized`; `LEVEL_AMOUNT` da la amplitud de cada intensidad.

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `character_style_set` | `characterId`, `style: StylePatch` | Suma el parche al del personaje | Se ignora si el personaje no existe (los de serie siempre; los añadidos, mientras no se quiten) o si el parche, limpio, queda vacío. Los campos desconocidos o fuera de rango se descartan (`cleanPatch`) |
| `character_style_reset` | `characterId` | Quita su parche: vuelve a los valores por defecto | La misma de existencia |

Quitar un personaje (`character_removed`) se lleva su estilo. El acumulador ganó los estilos, así que `PROJECTION_VERSION` pasó a 13. Un equipo sin actualizar ignora estos eventos (no los conoce) y pinta al personaje como siempre.

## Interfaz

- **Capas** (`LivingCharacter`): `.lv` llena su caja; `.lv-place` es el rectángulo exacto de la imagen (cabe entera, de pie sobre el borde de abajo); dentro, el aura (detrás), `.lv-in` (la entrada), `.lv-frame` (sombra, filo del color del aura y bordes suaves), `.lv-body` (el movimiento de CSS cuando no hay malla), la imagen o el vídeo, el lienzo de la malla (con margen a los lados y arriba para lo que mueve el viento), el barrido, las partículas y el destello de la entrada.
- **La malla** es un recurso imperativo por personaje en pantalla: `createStage` crea un lienzo nuevo, sube la imagen ya cargada como textura (con alfa premultiplicado, sin halo) y pinta en cada fotograma; `destroy` devuelve el contexto al momento (los navegadores solo dejan unos pocos). Si el navegador retira el contexto, se vuelve a la imagen. Tope de 3 millones de píxeles en el lienzo y densidad máxima de 2.
- **Entrada gacha** (GSAP, patrón de `QuestCard`): silueta en negro que aparece, destello con `sfx.glint`, dos anillos y rayos, y el personaje se revela; GSAP controla la visibilidad de `.lv-in` y del destello y, al limpiar, `tl.kill()` y `gsap.set` al estado final. En el menú empieza tras el barrido (0,3 s) y sustituye al deslizamiento.
- **Partículas** solo con CSS, con posiciones y tiempos que salen del índice (sin azar): polvo dorado y ascuas suben, pétalos y nieve caen, destellos se encienden en su sitio.
- **Teléfono:** la mitad de partículas.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | Puro: tipos del estilo, valores por defecto, `cleanPatch`, `applyStyleEvent`, `styleOf`, `isCustomized`, `AURA_TOKEN`, `LEVEL_AMOUNT` |
| `events.ts` | `character_style_set` y `character_style_reset` |
| `actions.ts` | `setCharacterStyle` (solo viaja lo que cambia) y `resetCharacterStyle` |
| `useStyle.ts` | `useCharacterStyle`: el estilo de un personaje desde el store |
| `gl.ts` | La malla: shaders, `createStage`, `glSupported` y el margen del lienzo (`PAD`) |
| `components/LivingCharacter.tsx` | El personaje vivo: capas, malla, movimiento de CSS y entrada |
| `components/Particles.tsx` | Las partículas |
| `living.css`, `i18n.ts` | Capas, barrido, aura, entrada y partículas (con su bloque de teléfono); textos es + ja de la pestaña Movimiento |
| `model.test.ts` | Parches, restablecer, guardas y estilos de personajes quitados |

### Dónde está cada cosa

| Concepto | Símbolo |
|---|---|
| Zonas y fórmulas de la respiración, el balanceo y el viento | `FRAG` en [`createStage`](gl.ts) |
| Cuándo hay malla y cuándo CSS | `wantGl` en [`LivingCharacter`](components/LivingCharacter.tsx) |
| Rectángulo de la imagen dentro de su caja | [`fit`](components/LivingCharacter.tsx) |
| Línea de tiempo de la entrada gacha | efecto con `gsap.timeline` en [`LivingCharacter`](components/LivingCharacter.tsx) |
| Guardas de los eventos | [`applyStyleEvent`](model.ts) y [`cleanPatch`](model.ts) |
| Qué se envía al cambiar algo | [`setCharacterStyle`](actions.ts) |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/events.ts` | `LivingEventBody` en la unión |
| `src/domain/projection.ts` | `ProjectionAcc.styles`, los dos `case`, el estilo que se va con `character_removed` y `GameState.characterStyles` |
| `src/domain/types.ts` | `GameState.characterStyles: Map<string, StylePatch>` |
| `src/features/menu/components/MenuScreen.tsx` | `<LivingCharacter>` en lugar de la imagen; la entrada «deslizarse» o «gacha» según el estilo |
| `src/styles/theme.css` | `--petal`, `--petal-lo` y `--frost` |
| `src/i18n/locales/{es,ja}.ts` | `living: livingEs` / `livingJa` |
| `src/test/streams.ts` | Los dos eventos en `randomStream` |

## Dependencias

- **features/menu** (`characters.ts`, `media.ts`): el personaje que se pinta (de serie o añadido, imagen o vídeo). No hace falta leer su README salvo para cambiar cómo se añaden personajes.
- **features/equipment** (`useBlobUrl`): la imagen de un personaje añadido, del almacén de binarios.
- **La usan:** `menu` (el personaje del día), `customize` (la pestaña Movimiento y la vista previa) y `companion` (el color del aura en el retrato).

## Estado actual

- **Última verificación:** 2026-10-08, tests y navegador a 1.280 × 800, 1.024 × 700 y 402 × 874, en español y japonés: la malla con Kazuma y Aqua (los pies quietos fotograma a fotograma), viento intenso sin desgarros, entrada gacha en la vista previa, un vídeo WebM añadido que se reproduce con el movimiento de CSS y sin malla ni brillo.
- **Tests:** `model.test.ts`.
- **Sin verificar:** la entrada gacha dentro del menú de verdad (solo en la vista previa), la app nativa de macOS (WKWebView) y Windows, el iPhone de verdad (rendimiento de la malla y del filtro de sombra en cada fotograma, batería), un vídeo con transparencia en Safari (HEVC con alfa) y una imagen GIF o APNG real, y el sonido de la entrada.
- **Historial:** [docs/history/verificacion/living.md](../../../docs/history/verificacion/living.md).
