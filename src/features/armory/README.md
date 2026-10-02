# Armería de serie: el equipo que trae la app

El mercader ([src/features/merchant/README.md](../merchant/README.md)) vende ya **69 piezas de serie** a todo el que instala la app: siete para cada una de las ocho ranuras de armadura (de común a legendaria), siete fondos del menú y seis emblemas. Están inspiradas en objetos de **Mushoku Tensei**, **Re:Zero**, **Konosuba** y los **JRPG clásicos** (Final Fantasy, Dragon Quest, Chrono Trigger…), más algunas «del gremio» para empezar. El propietario puede seguir añadiendo las suyas a mano.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito (del propietario) | Cómo se cumple |
|---|---|---|
| R1 | Un buen surtido de armaduras, fondos y demás para usar en el proyecto | 69 piezas: 56 de armadura (7 por ranura, todas las rarezas), 7 fondos y 6 emblemas (`catalog.ts`) |
| R2 | Que sean de serie para todo el que instala la app | Están en el código, no en eventos: las tiene cualquiera, también quien ya tenía datos (`BUILTIN_GEAR`) |
| R3 | Basadas en Mushoku Tensei, Re:Zero, Konosuba y JRPG de la industria | Cada pieza dice de dónde viene la idea (`source`), y la ficha lo muestra: «Inspirado en Konosuba» |
| R4 | Precios elevados | Los mismos que cualquier pieza (rareza × recargo por ranura): de 1.200 G a 160.000 G |

---

## Decisiones de diseño

### En el código, no en eventos

| Alternativa | Por qué no |
|---|---|
| Crearlas con eventos `gear_created` en el primer arranque (como las quests de ejemplo) | Quien ya tenía datos no las vería nunca; y 69 iconos dentro de eventos pesan en cada arranque |
| Un archivo JSON en `public/` | Habría que leerlo antes de proyectar; la proyección dejaría de ser una función pura de los eventos |

`BUILTIN_GEAR` es un `Map` que se construye al cargar el módulo. El mercader lo **suma** a su catálogo: `gearOf(acc, id)` busca primero en las piezas del jugador y luego en las de serie, y `fullCatalog(acc)` las junta para `GameState.gear`. **No van en el acumulador** de la proyección, así que tampoco en el snapshot: añadir piezas nuevas no obliga a subir `PROJECTION_VERSION`.

- **Ids**: `armory-<clave>` (las del jugador tienen un UUID; no chocan).
- **No se pueden crear, editar ni retirar con eventos**: la proyección ignora `gear_created` con su id y `gear_updated` / `gear_deleted` no las encuentran en el catálogo del jugador. La ficha muestra «De serie» en lugar de «Editar» y «Retirar».
- **Se compran y se equipan como las demás**: `gear_purchased` y `gear_equipped` miran `gearOf`.
- `createdAt: 0`: nunca cuentan como «recién llegadas», así que entran en el sorteo semanal del escaparate como cualquier otra.

**Norma:** no borres una pieza ni cambies su `key`: las compras guardadas la nombran. Cambiar su rareza o su ranura sí cambia la proyección (el muñeco, el prestigio): en ese caso, sube `PROJECTION_VERSION`.

### Arte dibujado con código

Nada de imágenes de las series (derechos y peso): cada icono es un **SVG generado** (`art.ts`) a partir de una **plantilla por forma** (48: capucha, sombrero de bruja, yelmo de dragontino, chándal, coraza, katana, bastón, lucero del alba, égida, hagoromo, colgante…) y una **paleta** (cuerpo, sombra, brillo y acento). Se guarda como data URL en `GearDef.image`, como los iconos que sube el jugador.

Los **fondos** son escenas de 1600 × 1000 (`backdropSvg`): cielo, sol o luna con su halo, cordilleras con ruido, estrellas, pinos, la silueta de una mansión, estanterías, islas flotantes… con una semilla por pieza, así que siempre salen iguales. El mismo SVG sirve de icono y de imagen grande (`builtinArt`): es vectorial y se ve nítido a pantalla completa.

### Nombres en los dos idiomas

Las piezas del jugador son texto suyo y no se traducen; las de serie sí (`armory.items.<clave>.name/desc` en `i18n.ts`). `gearName(g, t)` y `gearDescription(g, t)` (`labels.ts`) eligen. `GearDef.name` guarda el nombre en español (lo usan la crónica y los avisos si no hay traducción).

---

## Contenido

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

---

## Archivos

| Archivo | Contenido |
|---|---|
| `catalog.ts` | Las 69 piezas: clave, ranura, rareza, origen (`source`) e icono (forma y paleta, o escena). Puro |
| `art.ts` | Plantillas SVG de los iconos (`iconSvg`) y de los fondos (`backdropSvg`), `svgUrl`. Puro |
| `model.ts` | `BUILTIN_GEAR`, `isBuiltinGear`, `armoryKey`, `armorySource`, `builtinArt`. Puro |
| `labels.ts` | `gearName`, `gearDescription` (con `t`) |
| `i18n.ts` | Nombres y descripciones es + ja, «De serie» y los orígenes |
| `model.test.ts` | Catálogo completo y sin huecos, SVG sin valores rotos, guardas de la proyección |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `features/merchant/model.ts` | `gearOf`, `fullCatalog`; `gear_created` ignora los ids de serie; `gear_purchased` las encuentra |
| `features/equipment/model.ts` | `gearOf` al equipar y al podar |
| `domain/projection.ts` | `GameState.gear = fullCatalog(merchant)` |
| `features/merchant/components/GearDetail.tsx` | Nombre y descripción traducidos, «Inspirado en…», «De serie» en vez de editar y retirar |
| `features/merchant/components/MerchantModal.tsx`, `features/equipment/components/*` | `gearName` / `gearDescription` |
| `features/equipment/components/Decor.tsx` | El fondo de serie usa `builtinArt` |
| `features/merchant/actions.ts` | `updateGear` / `deleteGear` no hacen nada con las de serie; avisos con el nombre traducido |
| `i18n/locales/{es,ja}.ts` | Montan `armory` |
| `test/streams.ts` | `randomStream` compra y equipa una pieza de serie (`armory-pot_lid`) |

---

## Verificación

Hecho el 2026-10-02:

- **Tests** (`model.test.ts`): claves únicas, ranuras y rarezas válidas, texto en los dos idiomas y ninguno sobrante; al menos 5 piezas por ranura y todas las rarezas; cada icono es un SVG sin `undefined` ni `NaN`; no se pueden crear, editar ni retirar con eventos; se compran (solo con oro suficiente) y se equipan, y retirar otra pieza no las quita.
- **Navegador**: hoja de muestra con los 69 iconos (revisada a ojo; se rehicieron la capucha y las sandalias), la tienda con las piezas de serie en español y en japonés («往年のJRPGより», «標準»), el muñeco con diez piezas de serie puestas, el fondo «Mar de estrellas» detrás del tablón y el emblema de Loto en la cabecera.

**No verificado:** la app nativa y Windows.

## Posibles mejoras

- Más plantillas (arcos, lanzas, gafas, coronas) y variantes por pieza.
- Que el muñeco dibuje la forma de cada pieza de serie (la katana como katana), no solo la de su ranura.
- Ocultar del catálogo las piezas de serie que no te interesen (sin borrarlas).
