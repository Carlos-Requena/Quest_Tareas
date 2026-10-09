---
funcionalidad: calendar
titulo: Calendario
resumen: Tercera sección (tecla S) donde se planifica: Mi día, la semana con quests con fecha, encargos y agenda, y el día por horas.
tipo: presentación
eventos: []
preferencias: [quests.calendarView]
adr: [ADR-41, ADR-46]
---

# Calendario

La sección de planificación, junto al Quest Board y el tablón de encargos (selector de la cabecera, tecla `S` o «Calendario» en la barra del teléfono). Tiene tres vistas: **Mi día** ([today](../today/README.md)), **Semana** y **Día**. Se calcula de las quests, los encargos y la [agenda](../agenda/README.md), sin eventos propios. La app sigue abriendo en el Quest Board.

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | Un calendario semanal para ver qué hay que hacer | Vista «Semana»: siete columnas de lunes a domingo, hoy en dorado, lo de todo el día arriba y lo que tiene hora debajo |
| R2 | Que salgan tareas y tareas temporales | Quests por su fecha límite y encargos por su fecha (con hora o todo el día) |
| R3 | Otro calendario por horas para uso personal | Vista «Día»: lo de todo el día arriba y una rejilla de 0:00 a 24:00 con los bloques de la agenda y los encargos con hora |
| R4 | Añadir cosas desde el calendario | «+» de cada día: bloque en la agenda, quest con esa fecha límite o encargo ese día; en el día, pulsar una hora libre |

## Reglas y decisiones

### Qué sale cada día (`calendarDay`)

| Qué | Cuándo sale | Cómo |
|---|---|---|
| Encargo | El día de su fecha: pendiente, cumplido o quemado | Pergamino con calavera y hora (o arriba, si es de todo el día). Sin aceptar: a trazos y «Sin aceptar»; cumplido: tachado; quemado: chamuscado ([failure](../failure/README.md)) |
| Quest | El día de **su propia** fecha límite, si no está terminada ni en reserva; también si se fracturó ese día | Gema del color de su categoría; «En curso» si está aceptada; fracturada, tachada en rojo |
| Quest que se repite por días | Cada día que toca, **de hoy en adelante** (`CalendarSources.today`; el pasado no se sabe) | Con ↻; el día que se completó, tachada con ✓ ([complex](../complex/README.md)) |
| Bloque de la agenda | Cada día en que se repite (o su día) | Barra del color elegido, con su hora y ↻ si se repite |

- **Las quests de un encargo** no salen por la fecha del encargo (ya sale el encargo, con su sello de quests); sí si tienen fecha límite propia.
- **Las quests en reserva** (de un encargo sin aceptar) y **las que no tienen fecha** no salen.
- **Un encargo con hora** ocupa una hora en la rejilla del día (`TEMPORAL_MINUTES`).

### Bloques que se solapan (`layoutDay`)

Los bloques que se pisan forman un grupo y se reparten en columnas: cada uno usa la primera columna libre a su hora y el grupo tiene tantas columnas como bloques a la vez llega a tener. Los que no se pisan van a lo ancho.

### La rejilla del día

Las horas van en su propia columna (`--cal-gutter`), a la izquierda de la rejilla, alineadas a la derecha y **centradas en su línea**; la de las 00:00 tiene margen arriba para no cortarse. La media hora se marca con una línea a trazos, más tenue. La línea de «ahora» empieza donde empieza la rejilla, así que su punto no pisa las horas. «Todo el día» va en la misma columna. Las horas, a 13 px y las de los bloques a 12 px: Cormorant tiene el ojo pequeño y por debajo de eso sus cifras se ven raquíticas.

### Abrir y añadir

- **Abrir:** un bloque abre su formulario (con el día, para «Quitar solo este día»); un encargo, su cartel en el tablón de encargos; una quest, el Quest Board con ella elegida.
- **Añadir** (el «+» de cada día): bloque a las 9:00, quest (formulario completo con la fecha límite puesta: `QuestFormModal` con `preset.dueAt`) o encargo ese día a las 10:00 (`TemporalForm` con `date`).
- **En el día:** pulsar en la rejilla añade un bloque a esa media hora; al abrirlo, la rejilla se coloca en la hora actual (hoy) o en la mañana.

### El sitio donde se planifica

El calendario es la vista de planificación ([ADR-46](../../../docs/decisions/ADR-46-mi-dia.md)): Mi día es la primera vista y la que sale la primera vez. Los plazos ([horizon](../horizon/README.md)) se quedan solo como filtro de los dos tablones. Por qué una sección y no una ventana: [ADR-41](../../../docs/decisions/ADR-41-calendario.md).

### Estado de interfaz propio

La vista y el día elegido viven en `ui.ts`. La vista se recuerda en cada equipo (`quests.calendarView`); el día empieza siempre en hoy. Los avisos del calendario salen abajo (`.cal-toast`); en el teléfono, sobre la barra.

## Eventos

No tiene eventos: se calcula de las quests, los encargos y la agenda. Lo que se añade desde el calendario usa los eventos de cada funcionalidad (`agenda_created`, `quest_created`, `temporal_created`).

## Interfaz

| Tecla | Qué hace |
|---|---|
| `S` | Abrir el calendario (y volver al Quest Board) |
| `←` `→` | Semana o día anterior / siguiente; desde Mi día, el día por horas de ayer o mañana |
| `V` | Mi día → Semana → Día |
| `H` | Hoy (aquí no hay plazos) |
| `N` | Bloque nuevo en el día elegido |
| `Esc` | Cerrar el menú «+» |

El teclado del calendario espera mientras hay una ventana abierta (importa el `…Busy()` de cada una: personaje, mercader, crónica, edición, fallos y búsqueda).

En el teléfono la semana va en filas (un día debajo de otro), el «+» de cada día siempre se ve, **deslizar el dedo** pasa de semana o de día (`useSwipe`) y el rombo de crear añade un bloque.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `CalendarItem` (con `repeats`, `done`, `failed` y `burned`), `calendarDay`, `layoutDay`, `minuteOf`. Puro |
| `actions.ts` | Navegar (`moveCalendar`, `goToday`, `setCalendarView`, `cycleCalendarView`, `toggleCalendar`), abrir (`openCalendarItem`) y añadir (`addBlock`, `addQuest`, `addTemporal`) |
| `ui.ts` | Vista, día elegido, menú «+» y quest en creación; `calendarBusy` |
| `components/CalendarView.tsx` | La sección: cabecera, teclado, deslizar, avisos y la ventana de quest |
| `components/WeekView.tsx`, `DayView.tsx` | La semana y el día por horas |
| `components/CalendarChip.tsx` | Lo que sale en un día (y su color) |
| `components/AddMenu.tsx` | El menú «+» de un día |
| `components/CalendarIcon.tsx` | Icono (selector de la cabecera y barra del teléfono) |
| `calendar.css`, `i18n.ts` | Estilos (con su bloque de teléfono) y textos es + ja |
| `model.test.ts` | Qué sale cada día y el reparto en columnas |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/store/game.ts` | `Section` suma `"calendar"` |
| `src/App.tsx` | La sección, la tecla `S`, la `H` sin efecto aquí y `calendarBusy()` en la guarda del teclado |
| `src/components/Footer.tsx` | Pie del calendario |
| `src/components/CreateQuestModal.tsx` | `preset.dueAt` |
| `src/features/temporal/components/SectionSwitch.tsx` | El calendario en el selector de la cabecera |
| `src/features/horizon/ui.ts` | `HorizonSection`: los plazos solo en los dos tablones |
| `src/features/mobile/components/MobileNav.tsx` | Botón «Calendario» en la barra; el rombo de crear añade un bloque |
| `src/i18n/locales/{es,ja}.ts` | Montan `calendar` |

## Dependencias

- **features/agenda** (`model.ts`, `ui.ts`, `AgendaForm`): los bloques que pinta y su formulario. Para cambiar cómo se repiten, lee su README.
- **features/temporal** (`model.ts`, `actions.ts`, `ui.ts`, `Skull`): los encargos, abrir su cartel y crear uno con fecha.
- **features/today** (`TodayView`): la vista Mi día. Para cambiarla, lee su README.
- **features/mobile** (`swipe.ts`): deslizar para pasar de semana o de día.
- **features/chronicle**, **features/equipment**, **features/merchant**, **features/editing**, **features/failure**, **features/search** (sus `ui.ts`): solo para que el teclado espere con sus ventanas abiertas. No hace falta leer sus README.
- **La usan:** `today` (chips y acciones), `menu` (tarjeta Calendar), `mobile` (barra), `search` (abrir un bloque), `temporal` (icono del selector).

## Estado actual

- **Última verificación:** 2026-10-09, navegador a 1.024 × 768 y 402 × 874, en español y japonés: la rejilla del día con las horas en su columna, la línea de «ahora» y bloques que se solapan; el selector de vistas con «今日の予定» entero.
- **Tests:** `model.test.ts` y `src/features/today/model.test.ts`.
- **Sin verificar:** la app nativa y el iPhone de verdad (el gesto de deslizar se probó con eventos de puntero simulados); el sonido de los botones.
- **Historial:** [docs/history/verificacion/calendar.md](../../../docs/history/verificacion/calendar.md).
