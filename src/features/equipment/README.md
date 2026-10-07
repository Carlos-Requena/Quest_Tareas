---
funcionalidad: equipment
titulo: Personaje
resumen: Muñeco que te representa con el equipo comprado puesto, su armario y la decoración del menú (fondo de la app y emblema de la cabecera).
tipo: dominio
eventos: [gear_equipped, gear_unequipped]
preferencias: []
adr: [ADR-20]
---

# Personaje

Lo que se compra al [mercader](../merchant/README.md) se usa aquí. La ventana **Personaje** (tecla `P` o la tarjeta «Character» del [menú](../menu/README.md)) tiene un **muñeco que te representa** con ocho ranuras de armadura alrededor, las dos ranuras de **decoración** debajo y, a la derecha, los [atributos](../attributes/README.md). Al elegir una ranura, el panel derecho pasa a ser el **armario** de esa ranura: lo que tienes para ella, para ponértelo o quitártelo.

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | Las armaduras se usan en un muñequito que te represente | `Doll`: un muñeco en SVG que se pone cada pieza en su sitio, con el color de su rareza |
| R2 | El muñeco va junto a los atributos | `CharacterModal`: muñeco y ranuras a la izquierda, atributos a la derecha |
| R3 | Lo que se compra puede ser decoración del menú | Ranuras de fondo y emblema: el fondo se pinta detrás de toda la app (también del menú de opciones) y el emblema, en el rombo de la cabecera |

## Reglas y decisiones

- **Ponerse algo es un evento**, así el muñeco y el menú se ven igual en todos los equipos. Solo se pone lo que es tuyo (`owned`), cada pieza va en su ranura y ponerte otra quita la anterior (no hace falta un `gear_unequipped`).
- **Lo que deja de existir se quita solo**: si una pieza puesta se retira o cambia de ranura, `pruneEquipment` (tras cada `gear_updated` y `gear_deleted`) la quita.
- **Un muñeco dibujado, no las imágenes de las piezas encima.** Cada ranura tiene una **forma** sobre el muñeco (yelmo, coraza con hombreras, guanteletes, botas, espada, escudo, capa y amuleto) pintada con el color de su rareza y un brillo metálico común. De épico para arriba lleva filo dorado; mítico y legendario brillan, y lo legendario late. Pegar la imagen de cada pieza sobre el cuerpo no funciona con imágenes del usuario (cualquier estilo y encuadre), y pedir capas de *paper doll* haría difícil añadir mercancía ([ADR-20](../../../docs/decisions/ADR-20-atributos-calculados.md)). La imagen de la pieza se ve en su **ranura** y en el armario.
- **Prestigio**: la suma de estrellas de rareza de lo que llevas (1 común … 6 legendario; como máximo 60). Se calcula (`prestige`).
- **Fondo** (`Backdrop`, detrás de toda la app): la imagen grande del almacén de binarios (o, en los fondos de serie, su escena SVG con `builtinArt`), a pantalla completa y oscurecida para que el tablón se lea. Mientras carga, o si este equipo aún no tiene el archivo (la referencia puede llegar por Drive antes que la imagen), usa el icono difuminado.
- **Emblema** (`DecorEmblem`, en la cabecera): la imagen recortada en rombo dentro del marco dorado, con el filo del color de su rareza.
- **Estado de interfaz propio** (`ui.ts`): ventana abierta y ranura elegida, sin eventos.

## Modelo

`EquipmentAcc { equipped: Equipped }`, con `Equipped = Record<GearSlot, gearId>`. `PlayerState.equipped` es su copia en el estado; solo contiene piezas que existen, son tuyas y son de esa ranura (invariante de los tests de la proyección).

## Eventos

| Evento | Datos | Efecto en la proyección | Guarda |
|---|---|---|---|
| `gear_equipped` | `gearId` | La pone en su ranura (y quita la que hubiera) | Solo si la pieza existe (también las de serie, con `gearOf`) y es tuya |
| `gear_unequipped` | `slot` | Vacía la ranura | Solo con una ranura que exista |
| `gear_updated` / `gear_deleted` (del mercader) | — | Quita lo que ya no se puede llevar (`pruneEquipment`) | — |

## Interfaz

| Tecla (ventana abierta) | Acción |
|---|---|
| `P` | Abrir (desde los tablones o el menú) o cerrar |
| `↑` / `↓` | Ranura anterior o siguiente (izquierda, derecha y decoración) |
| `←` / `→` | Saltar a la otra columna, a la misma altura |
| `Esc` | Volver a los atributos; si no, cerrar |

Al pasar el ratón por una ranura vacía, el muñeco dibuja el **contorno** de dónde iría la pieza; si está llena, la pieza brilla. Al ponértela, cae con un muelle de Motion (`AnimatePresence`, una clave por pieza). El muñeco respira despacio (CSS), salvo con «reducir movimiento». En el teléfono, el muñeco va entre dos columnas estrechas de ranuras y, al elegir una, el armario ocupa la ventana (`is-picking`).

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `EquipmentAcc`, `applyEquipmentEvent`, `pruneEquipment`, `wornIn`, `prestige`. Puro |
| `events.ts` | `EquipmentEventBody` |
| `actions.ts` | `equipGear`, `unequipSlot` |
| `ui.ts` | Ventana abierta y ranura elegida; `characterBusy` |
| `useBlobUrl.ts` | URL de un binario del almacén (la imagen del fondo; también la usa el menú) |
| `components/CharacterModal.tsx` | La ventana: ranuras, muñeco, decoración, armario y atributos |
| `components/Doll.tsx` | El muñeco y la forma de cada pieza |
| `components/Decor.tsx` | `Backdrop` (fondo de la app) y `DecorEmblem` (emblema de la cabecera) |
| `components/HelmetIcon.tsx` | Icono del yelmo (el botón está en el menú) |
| `equipment.css`, `i18n.ts` | Estilos (ventana, ranuras, muñeco, armario, fondo y emblema) y textos es + ja |
| `model.test.ts` | Solo lo tuyo y en su ranura, sustituir, quitar, retirar o cambiar de ranura quita lo puesto, prestigio |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/types.ts` | `PlayerState.equipped` |
| `src/domain/events.ts` | `EquipmentEventBody` en la unión |
| `src/domain/projection.ts` | `ProjectionAcc.equipment`; `case` de sus dos eventos y `pruneEquipment` tras editar o retirar una pieza |
| `src/components/Header.tsx` | `DecorEmblem` alrededor del emblema |
| `src/App.tsx` | Tecla `P`, `<CharacterModal />`, `<Backdrop />` y el teclado del tablón espera mientras está abierta |
| `src/styles/theme.css` | Tokens del muñeco: `--doll-skin`, `--doll-skin-lo`, `--doll-cloth`, `--doll-cloth-lo` y `--doll-hair` |
| `src/i18n/locales/{es,ja}.ts` | Montan `equipment` |
| `src/test/streams.ts` | Los eventos del equipo en `randomStream` |

## Dependencias

- **features/merchant** (`model.ts`, `ui.ts`, `GearArt`, `SlotGlyph`): el catálogo, lo comprado, el arte de las piezas y «Ir al mercader» desde un armario vacío. Para cambiar qué se vende o cuánto cuesta, lee su README.
- **features/armory** (`model.ts`, `labels.ts`): el arte de los fondos de serie y los nombres traducidos.
- **features/attributes** (`AttributesPanel`): el panel de la derecha. Para cambiar el radar, lee su README.
- **features/items** (`model.ts`): las rarezas y sus colores.
- **La usan:** `menu` (tarjeta Character, fondo detrás del menú y `useBlobUrl`), `merchant` (equipar desde la ficha), `calendar` y `temporal` (su teclado espera con la ventana abierta).

## Estado actual

- **Última verificación:** 2026-10-02, tests y navegador a 1280 × 780 (las diez ranuras equipadas, el contorno de una ranura vacía, el prestigio, el fondo y el emblema, en japonés).
- **Tests:** `model.test.ts`, `src/features/merchant/actions.test.ts` (con el store) y el invariante de `src/domain/projection.test.ts`.
- **Sin verificar:** la app nativa y Windows; el fondo leído de la tabla `blobs` de SQLite; el muñeco con «reducir movimiento».
- **Historial:** [docs/history/verificacion/equipment.md](../../../docs/history/verificacion/equipment.md).

## Pendiente

- Que el muñeco se parezca más a ti: color de pelo y de piel, peinado.
- Variantes de forma por pieza (no solo por ranura), elegidas en el formulario.
- Más decoración del menú: marco de las tarjetas, estandarte de la cabecera.
