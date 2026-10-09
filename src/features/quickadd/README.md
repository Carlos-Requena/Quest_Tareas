---
funcionalidad: quickadd
titulo: Alta rápida
resumen: Una línea con marcas (mañana, #área, @quién, !, x3) que publica una quest al vuelo desde el tablón o la hoja del teléfono.
tipo: presentación
eventos: []
preferencias: []
adr: [ADR-48]
---

# Alta rápida

Una línea encima del tablón para apuntar una quest al vuelo: «Llamar al banco mañana #Hogar !». `Enter` la publica; `Mayús+Enter` (o ⤢) abre el formulario completo con lo escrito. Mientras se escribe, debajo se ve lo que se ha entendido. En el teléfono, el rombo de crear abre una hoja con la misma línea, que se cierra tocando fuera o arrastrando su asa hacia abajo ([mobile](../mobile/README.md#gestos-de-ios)).

## Qué hace

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Apuntar una tarea sin rellenar un formulario | `quickCreate`: un título basta |
| R2 | Poner fecha, área, élite o cantidad sin salir de la línea | Marcas (`parseQuick`) |
| R3 | Completarla después | `Mayús+Enter` / ⤢, o editarla ([editing](../editing/README.md)) |

## Reglas y decisiones

| Marca | Qué hace | Ejemplo |
|---|---|---|
| `hoy`, `mañana` (o `manana`), `pasado mañana` | Fecha límite | «Pagar mañana» |
| `lunes` … `domingo` | El próximo, **sin contar hoy** (para hoy está `hoy`) | «Gimnasio jueves» |
| `12/10`, `12/10/2026`, `3/1/27` | Día/mes; sin año, el próximo (hoy incluido) | «Recoger paquete 12/10» |
| `今日`, `明日`, `明後日`, `月曜(日)` … `日曜(日)` | Lo mismo en japonés | 「牛乳を買う　明日」 |
| `#área` (`_` = espacio) | Área (sube su atributo) | `#Salud`, `#Estudio_y_ocio` |
| `@quién` | Encargado por | `@Banco` |
| `!` (sola o al final de una palabra) | Élite | «Entregar informe !» |
| `x3`, `×3` | Objetivo de 3 (hasta 99) | «Flexiones x20» |

- Las marcas van separadas por espacios (también el japonés «　»). Lo que no es una marca es el título; una exclamación pegada se queda en él.
- **La quest que sale**: categoría Encargo (Élite con `!`), un objetivo de contador «Hacerlo ×N» y la recompensa calculada ([rewards](../rewards/README.md)). Sin descripción, tipo ni repetición: se añaden editándola.
- Marcas sencillas y previsibles en vez de reconocer fechas en lenguaje natural completo ([ADR-48](../../../docs/decisions/ADR-48-alta-rapida-y-busqueda.md)).

## Eventos

No tiene eventos propios: publica `quest_created`. Se puede deshacer unos minutos ([undo](../undo/README.md)).

## Interfaz

`N` lleva a la línea; `Mayús+N`, al formulario completo (el botón del pie). En la línea, `Esc` la vacía y sale. Lo entendido va en una capa encima del tablón: escribir no mueve nada.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `parseQuick`, `QuickQuest`, `QuickToken`. Puro (`now` entra como parámetro) |
| `actions.ts` | `quickQuest`, `quickCreate` (con «Deshacer»), `quickDetails` |
| `ui.ts` | Pedir el foco (tecla `N`) y la hoja del teléfono; `quickBusy` |
| `components/QuickAdd.tsx` | `QuickAddForm` (tablón) y `QuickAddSheet` (teléfono) |
| `quickadd.css`, `i18n.ts` | La línea, las marcas y la hoja; textos es + ja |
| `model.test.ts` | Fechas (también en japonés y días que no existen), marcas y título vacío |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/App.tsx` | La línea encima de las pestañas; teclas `N` y `Mayús+N`; `QuickAddSheet`; `quickBusy()` |
| `src/components/Footer.tsx` | «Nueva quest» con `⇧N` |
| `src/features/mobile/components/MobileNav.tsx` | El rombo de crear del tablón abre la hoja |
| `src/i18n/locales/{es,ja}.ts` | Montan `quickadd` |

## Dependencias

- **features/editing** (`ui.ts`: `draft`): «Más detalles» abre el formulario completo relleno.
- **features/rewards** (`model.ts`): la recompensa que se ve antes de publicar.
- **features/horizon** (`ui.ts`): al publicar, el filtro de plazo vuelve a «Todo».
- **features/undo** (`actions.ts`): el aviso con «Deshacer».
- **features/mobile** (`index`): el asa (`SheetGrip`) y bajar para cerrar (`useDragDismiss`).
- **La usan:** `mobile` (el rombo) y `menu` (`windowOpen` mira su hoja).

## Estado actual

- **Última verificación:** 2026-10-06, tests y navegador (una línea con todas las marcas publica una élite para mañana con objetivo 0/2 y «Deshacer»), también la hoja a 402 × 874.
- **Tests:** `model.test.ts` y `src/store/game.test.ts`.
- **Sin verificar:** la app nativa y el teclado del iPhone encima de la hoja.
- **Historial:** [docs/history/verificacion/quickadd.md](../../../docs/history/verificacion/quickadd.md).
