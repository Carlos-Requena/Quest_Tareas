---
funcionalidad: armory
titulo: Equipo de serie
resumen: 69 piezas de serie para el mercader (Mushoku Tensei, Re:Zero, Konosuba y JRPG clásicos), en el código y con arte SVG generado.
tipo: dominio
eventos: []
preferencias: []
adr: [ADR-21]
---

# Equipo de serie

El [mercader](../merchant/README.md) vende **69 piezas de serie** a todo el que instala la app: siete para cada una de las ocho ranuras de armadura (de común a legendaria), siete fondos del menú y seis emblemas, inspiradas en **Mushoku Tensei**, **Re:Zero**, **Konosuba** y los **JRPG clásicos** (Final Fantasy, Dragon Quest, Chrono Trigger…), más algunas «del gremio» para empezar. El propietario puede seguir añadiendo las suyas a mano desde la tienda.

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | Un buen surtido de armaduras, fondos y demás | 56 piezas de armadura (7 por ranura, todas las rarezas), 7 fondos y 6 emblemas (`catalog.ts`) |
| R2 | De serie para todo el que instala la app | Están en el código, no en eventos: las tiene cualquiera, también quien ya tenía datos (`BUILTIN_GEAR`) |
| R3 | Basadas en esas series y en JRPG de la industria | Cada pieza dice de dónde viene la idea (`source`) y la ficha lo muestra: «Inspirado en Konosuba» |
| R4 | Precios elevados | Los de cualquier pieza: rareza × recargo por ranura ([merchant](../merchant/README.md)) |

## Reglas y decisiones

### En el código, no en eventos

Con eventos `gear_created` en el primer arranque, quien ya tenía datos no las vería y 69 iconos pesarían en cada arranque; un JSON en `public/` obligaría a leerlo antes de proyectar. Por eso `BUILTIN_GEAR` es un `Map` que se construye al cargar el módulo y el mercader lo **suma** a su catálogo: `gearOf(acc, id)` busca primero en las piezas del jugador y luego en las de serie, y `fullCatalog(acc)` las junta para `GameState.gear`. **No van en el acumulador** de la proyección ni en el snapshot ([ADR-21](../../../docs/decisions/ADR-21-piezas-de-serie-en-codigo.md)).

- **Ids**: `armory-<clave>` (las del jugador tienen un UUID; no chocan).
- **No se crean, editan ni retiran con eventos**: la proyección ignora `gear_created` con su id, y `gear_updated` / `gear_deleted` no las encuentran. La ficha muestra «De serie» en lugar de «Editar» y «Retirar».
- **Se compran y se equipan como las demás**: `gear_purchased` y `gear_equipped` miran `gearOf`.
- `createdAt: 0`: nunca son «recién llegadas» y entran en el sorteo semanal del escaparate como cualquier otra.

**Norma:** no borres una pieza ni cambies su `key`, porque las compras guardadas la nombran. Añadir piezas no sube `PROJECTION_VERSION`; cambiar la rareza o la ranura de una existente sí (cambia el muñeco y el prestigio).

### Arte dibujado con código

Nada de imágenes de las series (derechos y peso). Cada icono es un **SVG generado** (`art.ts`) con una **plantilla por forma** (48: capucha, sombrero de bruja, yelmo de dragontino, chándal, coraza, katana, bastón, lucero del alba, égida, hagoromo, colgante…) y una **paleta** (cuerpo, sombra, brillo y acento), guardado como data URL en `GearDef.image`.

Los **fondos** son escenas de 1600 × 1000 (`backdropSvg`): cielo, sol o luna con su halo, cordilleras con ruido, estrellas, pinos, la silueta de una mansión, estanterías, islas flotantes… con una semilla por pieza. El mismo SVG sirve de icono y de imagen grande (`builtinArt`).

### Nombres en los dos idiomas

Las piezas del jugador son texto suyo y no se traducen; las de serie sí (`armory.items.<clave>.name/desc`). `gearName(g, t)` y `gearDescription(g, t)` (`labels.ts`) eligen. `GearDef.name` guarda el nombre en español (lo usan la crónica y los avisos si no hay traducción).

### Contenido

| Ranura | Común | Poco común | Rara | Épica | Mítica | Legendaria |
|---|---|---|---|---|---|---|
| Cabeza | Capucha de aventurero novato | Gorro de slime · Cofia de doncella | Sombrero de maga de Roxy | Sombrero del Clan Demonio Carmesí | Yelmo del dragontino | Cinta de la protección |
| Cuerpo | Jubón acolchado | Chándal del invocado | Uniforme de doncella · Túnica Migurd | Armadura de cruzada de Darkness | Armadura Genji | Vestiduras del Dios Dragón |
| Manos | Guantes de herbolario | Guantes de ladrona de Chris | Guanteletes de mithril · Brazales del Dios de la Espada | Guanteletes del Dios del Norte | Escudos de antebrazo de Garfiel | Nudilleras del Káiser |
| Pies | Botas de camino | Sandalias de la diosa del agua | Zapatos de Hermes · Botas de la Guardia Real | Botas de Eris | Grebas del Santo de la Espada | Botas de siete leguas |
| Arma | Espada de madera | Varita de Ranoa | Chunchunmaru | Aqua Heartia · Lucero del alba de Rem | Masamune | Reid, la Espada del Dragón |
| Escudo | Rodela de pino | Tapa de olla | Escudo de Axel · Escudo de cristal | Égida | Escudo torre de Asura | Escudo de Loto |
| Capa | Capa de lana | Capa del gremio de Axel | Capa de Fitz · Capa roja del héroe | Hábito del Culto de la Bruja | Manto del Rey Demonio | Hagoromo de Aqua |
| Amuleto | Collar de cuentas | Amuleto de Kazuma | Colgante Migurd · Insignia del caballero de Emilia | Pluma de fénix | Fragmento del cristal del viento | Lágrima de Satella |
| Fondo | — | Pradera de Axel | Bosque de Buena · Mansión Roswaal | Biblioteca prohibida · Explosión en el horizonte | Islas flotantes de Zeal | Mar de estrellas del cristal |
| Emblema | Blasón del gremio | Sello de Axis | Blasón Greyrat | Emblema del Clan Demonio Carmesí | Dragón de Lugunica | Emblema de Loto |

### Añadir una pieza

1. En `catalog.ts`, una entrada con una `key` nueva: ranura, rareza, origen y su icono (una forma de `ICON_KINDS` y una paleta) o, si es un fondo, su escena.
2. Su nombre y descripción en `i18n.ts`, en español y en japonés (los tests fallan si falta alguno).
3. Para ver el arte, una hoja de muestra: en la consola de la app, `await import('/src/features/armory/model.ts')` y pinta cada `image` de `BUILTIN_GEAR`.

## Eventos

No tiene eventos propios: las piezas de serie no se crean, editan ni retiran con eventos (ver arriba). Se compran con `gear_purchased` y se equipan con `gear_equipped`, como las demás.

## Archivos

| Archivo | Contenido |
|---|---|
| `catalog.ts` | Las 69 piezas: clave, ranura, rareza, origen (`source`) e icono (forma y paleta, o escena). Puro |
| `art.ts` | Plantillas SVG de los iconos (`iconSvg`) y de los fondos (`backdropSvg`), `svgUrl`. Puro |
| `model.ts` | `BUILTIN_GEAR`, `isBuiltinGear`, `armoryKey`, `armorySource`, `builtinArt`. Puro |
| `labels.ts` | `gearName`, `gearDescription` (con `t`) |
| `i18n.ts` | Nombres y descripciones es + ja, «De serie» y los orígenes |
| `model.test.ts` | Catálogo completo y sin huecos, SVG sin valores rotos, guardas de la proyección |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/features/merchant/model.ts` | `gearOf`, `fullCatalog`; `gear_created` ignora los ids de serie; `gear_purchased` las encuentra |
| `src/features/equipment/model.ts` | `gearOf` al equipar y al podar |
| `src/domain/projection.ts` | `GameState.gear = fullCatalog(merchant)` |
| `src/features/merchant/components/GearDetail.tsx` | Nombre y descripción traducidos, «Inspirado en…», «De serie» en vez de editar y retirar |
| `src/features/merchant/actions.ts` | `updateGear` / `deleteGear` no hacen nada con las de serie; avisos con el nombre traducido |
| `src/features/equipment/components/Decor.tsx` | El fondo de serie usa `builtinArt` |
| `src/i18n/locales/{es,ja}.ts` | Montan `armory` |
| `src/test/streams.ts` | `randomStream` compra y equipa una pieza de serie (`armory-pot_lid`) |

## Dependencias

- **features/merchant** (`model.ts`: `GearDef`, ranuras): el tipo de pieza que genera. Para cambiar precios o el escaparate, lee su README.
- **features/items** (`model.ts`: `Rarity`): las rarezas. No hace falta leer su README.
- **La usan:** `merchant`, `equipment`, `items` (almanaque) y `chronicle` (nombres traducidos).

## Estado actual

- **Última verificación:** 2026-10-02, tests y hoja de muestra con los 69 iconos en el navegador, en español y japonés; el muñeco con diez piezas de serie, un fondo y un emblema.
- **Tests:** `model.test.ts`.
- **Sin verificar:** la app nativa y Windows.
- **Historial:** [docs/history/verificacion/armory.md](../../../docs/history/verificacion/armory.md).

## Pendiente

- Más plantillas (arcos, lanzas, gafas, coronas) y variantes por pieza.
- Que el muñeco dibuje la forma de cada pieza de serie (la katana como katana), no solo la de su ranura.
- Ocultar del catálogo las piezas de serie que no interesen (sin borrarlas).
