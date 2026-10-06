# Alta rápida

Una línea para apuntar una quest al vuelo, encima del tablón: «Llamar al banco mañana #Hogar !». `Enter` la publica; `Mayús+Enter` (o ⤢) abre el formulario completo con lo escrito. Mientras se escribe, debajo se ve lo que se ha entendido. En el teléfono, el rombo de crear abre una hoja con la misma línea.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Apuntar una tarea sin rellenar un formulario | `quickCreate`: un título basta |
| R2 | Poner fecha, área, élite o cantidad sin salir de la línea | Marcas (`parseQuick`) |
| R3 | Completarla después | `Mayús+Enter` / ⤢, o editarla (features/editing) |

---

## Decisiones de diseño

### Marcas

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

Las marcas van separadas por espacios (también el espacio japonés «　»). Lo que no es una marca es el título; una exclamación pegada se queda en él.

### La quest que sale

Categoría Encargo (Élite con `!`), un objetivo de contador «Hacerlo ×N» y la recompensa calculada (features/rewards). Sin descripción, tipo ni repetición: se añaden editándola.

### Teclas

`N` lleva a la línea rápida; `Mayús+N`, al formulario completo (el botón del pie). En la línea, `Esc` la vacía y sale. Lo entendido va en una capa encima del tablón: escribir no mueve nada.

---

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `parseQuick`, `QuickQuest`, `QuickToken`. Puro (`now` entra como parámetro) |
| `actions.ts` | `quickQuest`, `quickCreate` (con «Deshacer»), `quickDetails` |
| `ui.ts` | Pedir el foco (tecla N) y la hoja del teléfono |
| `quickadd.css` | La línea, las marcas y la hoja |
| `i18n.ts` | Textos es + ja |
| `components/QuickAdd.tsx` | `QuickAddForm` (tablón) y `QuickAddSheet` (teléfono) |
| `model.test.ts` | Fechas (también en japonés y días que no existen), marcas y título vacío |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `App.tsx` | La línea encima de las pestañas; teclas `N` y `Mayús+N`; `QuickAddSheet`; `quickBusy()` |
| `components/Footer.tsx` | «Nueva quest» con `⇧N` |
| `features/mobile` | El rombo de crear del tablón abre la hoja |
| `features/editing` | `draft`: «Más detalles» abre el formulario relleno |
| `i18n/locales/{es,ja}.ts` | Montan `quickadd` |

No tiene eventos propios: publica `quest_created`.

---

## Verificación

Hecho el 2026-10-06.

- **Tests:** `model.test.ts` y `store/game.test.ts` (publica la quest de una línea; una línea vacía no).
- **Navegador:** `N`, escribir «Llamar al banco mañana #Hogar @Banco x2 !» (marcas: fecha, área, quién, ×2, ELITE), `Enter`: quest de élite para mañana con objetivo 0/2 y aviso con «Deshacer». En el teléfono (402 × 874), la hoja desde el rombo y el aviso encima de la barra.

**No verificado:** la app nativa y el teclado del iPhone encima de la hoja.
