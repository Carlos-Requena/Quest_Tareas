# Calendario

Una sección nueva, junto al Quest Board y los encargos (selector de la cabecera, tecla `S` o «Calendario» en la barra del teléfono), con dos vistas:

- **Semana** (de lunes a domingo): lo que hay que hacer cada día. Salen las **quests con fecha límite**, los **encargos** (aceptados en pergamino; sin aceptar, a trazos; cumplidos, tachados) y los **bloques de la agenda**.
- **Día**: la **agenda personal por horas** ([../agenda/README.md](../agenda/README.md)). Arriba lo de todo el día; debajo, una rejilla de 0:00 a 24:00 con los bloques y los encargos con hora. Pulsar en una hora libre añade un bloque.

No tiene eventos: se calcula de las quests, los encargos y la agenda. La app sigue abriendo en el Quest Board.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Un calendario semanal para ver qué cosas hay que hacer | Vista «Semana»: siete columnas, hoy en dorado, con lo de todo el día arriba y lo que tiene hora debajo |
| R2 | Que salgan tareas y tareas temporales | Quests por su fecha límite y encargos por su fecha (con hora o todo el día) |
| R3 | Otro calendario por horas para uso personal | Vista «Día» con la agenda (features/agenda) |
| R4 | Añadir cosas desde el calendario | «+» de cada día: bloque en la agenda, quest con esa fecha límite o encargo ese día; en el día, pulsar una hora |

---

## Decisiones de diseño

### Qué sale cada día (`calendarDay`)

| Qué | Cuándo sale | Cómo |
|---|---|---|
| Encargo | El día de su fecha, pendiente, cumplido o quemado | Pergamino con calavera y hora (o arriba, si es de todo el día). Sin aceptar: a trazos y «Sin aceptar»; cumplido: tachado; quemado: chamuscado (features/failure) |
| Quest | El día de **su propia** fecha límite, si no está terminada ni en reserva; también si se fracturó ese día | Gema del color de su categoría; «En curso» si está aceptada; fracturada, tachada en rojo |
| Quest que se repite por días | Cada día que toca, **de hoy en adelante** (`CalendarSources.today`) | Con ↻; el día que se completó, tachada con ✓ (features/complex) |
| Bloque de la agenda | Cada día en que se repite (o su día) | Barra del color elegido, con su hora y ↻ si se repite |

- **Las quests de un encargo** no salen por la fecha del encargo: ya sale el encargo, con su sello de quests. Sí salen si tienen fecha límite propia.
- **Las quests en reserva** (de un encargo sin aceptar) no salen: aún no están en el Quest Board.
- **Las quests sin fecha** no salen: el calendario es para lo que tiene día.
- **Un encargo con hora** ocupa una hora en la rejilla del día (no tiene fin): `TEMPORAL_MINUTES`.

### Bloques que se solapan (`layoutDay`)

Como en cualquier calendario: los bloques que se pisan forman un grupo y se reparten en columnas; cada uno usa la primera columna libre a su hora y el grupo tiene tantas columnas como bloques a la vez llega a tener. Los que no se pisan van a lo ancho.

### Abrir y añadir

- **Abrir:** un bloque abre su formulario (con el día, para «Quitar solo este día»); un encargo, su cartel en el tablón de encargos; una quest, el Quest Board con ella elegida.
- **Añadir** (el «+» de cada día, que aparece al pasar el ratón): bloque en la agenda (a las 9:00), quest (el formulario completo del Quest Board con la fecha límite puesta: `QuestFormModal` con `preset.dueAt`) o encargo (su formulario con ese día a las 10:00: `TemporalForm` con `date`).
- **En el día:** pulsar en la rejilla añade un bloque a esa media hora; al abrirlo, la rejilla se coloca en la hora actual (hoy) o en la mañana.

### El sitio donde se planifica (2026-10-06)

El calendario es la vista de planificación: **Mi día · Semana · Día**. «Mi día» (features/today) es la primera y la que sale la primera vez: lo que se pierde esta noche, lo que está en curso, las rachas en peligro, lo que toca hoy y la agenda de hoy. Los plazos (features/horizon) se quedan solo como filtro de los dos tablones. Las quests que se repiten por días salen aquí cada día que tocan.

### Estado de interfaz propio

La vista (Mi día, semana o día) y el día elegido viven en `ui.ts`. La vista se recuerda en cada equipo (`localStorage`, `quests.calendarView`), como el idioma; la primera vez, Mi día; el día empieza siempre en hoy. Los avisos del calendario salen abajo (`.cal-toast`); en el teléfono, en la barra.

### Teclado y teléfono

| Tecla | Qué hace |
|---|---|
| `S` | Abrir el calendario (y volver al Quest Board) |
| `←` `→` | Semana (o día) anterior o siguiente; desde Mi día, el día por horas de ayer o mañana |
| `V` | Mi día → semana → día |
| `H` | Hoy (en el calendario no hay plazos: la `H` de los tablones no hace nada aquí) |
| `N` | Bloque nuevo en el día elegido |
| `Esc` | Cerrar el menú «+» |

En el teléfono la semana va en filas (un día debajo de otro), el «+» de cada día siempre se ve, **deslizar el dedo** pasa de semana o de día (`useSwipe` de features/mobile) y el rombo de crear añade un bloque. La barra de abajo pasa a seis botones (Tablón, Encargos, **Calendario**, Mercader, Personaje y Más).

---

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `CalendarItem` (con `repeats`, `done`, `failed` y `burned`), `calendarDay`, `layoutDay`, `minuteOf`. Puro |
| `actions.ts` | Navegar (`moveCalendar`, `goToday`, `setCalendarView`, `cycleCalendarView`, `toggleCalendar`), abrir (`openCalendarItem`) y añadir (`addBlock`, `addQuest`, `addTemporal`) |
| `ui.ts` | Vista, día elegido, menú «+» y quest en creación; `calendarBusy` |
| `i18n.ts` | Textos es + ja |
| `calendar.css` | Semana, día, chips y bloques; diseño de teléfono |
| `components/CalendarView.tsx` | La sección: cabecera, teclado, deslizar, avisos y la ventana de quest |
| `components/WeekView.tsx` | La semana |
| `components/DayView.tsx` | El día por horas |
| `components/CalendarChip.tsx` | Lo que sale en un día (y su color) |
| `components/AddMenu.tsx` | El menú «+» de un día |
| `components/CalendarIcon.tsx` | Icono (cabecera y barra del teléfono) |
| `model.test.ts` | Qué sale cada día y el reparto en columnas |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `store/game.ts` | `Section` suma `"calendar"` |
| `App.tsx` | La sección, la tecla `S`, la `H` sin efecto en el calendario y `calendarBusy()` en la guarda del teclado |
| `components/Footer.tsx` | Pie del calendario |
| `components/CreateQuestModal.tsx` | `preset.dueAt` |
| `features/temporal` | `SectionSwitch` con el calendario (`temporal.section.calendar`); `TemporalForm` / `emptyDraft` aceptan el día |
| `features/horizon/ui.ts` | `HorizonSection`: los plazos solo en los dos tablones |
| `features/mobile` | Botón «Calendario» en la barra (seis columnas) y el rombo de crear añade un bloque |
| `i18n/locales/{es,ja}.ts` | Montan `calendar` |
| `features/today` | La vista «Mi día» (`TodayView`) |

---

## Verificación

Hecho el 2026-10-03 con `pnpm dev` en el navegador integrado (1024 × 768 y 402 × 874).

- **Tests:** qué sale un día (quests por su fecha, sin las de otro día, sin fecha ni en reserva; encargos con hora y de todo el día; bloques que se repiten) y el reparto en columnas.
- **Interfaz:** semana con el gimnasio (lunes y jueves), una quest creada desde el «+» del viernes con su fecha límite, un encargo creado desde el «+» del martes (sale sin aceptar), vista día del domingo con un encargo a las 10:00 y un bloque que se solapa (dos columnas), quitar solo el jueves, deslizar a la semana siguiente, japonés y teléfono (semana en filas, día por horas, barra con seis botones).

**No verificado:** la app nativa y el iPhone de verdad (el gesto de deslizar con el dedo se probó con eventos de puntero simulados); el sonido de los botones.

**Mi día y quests por días (2026-10-06):** tests en `features/today/model.test.ts` (también que las quests por días salen de hoy en adelante y tachadas el día que se hicieron). En el navegador (1100 × 720 y 402 × 874, español y japonés): Mi día con una cita y una quest que se pierden esta noche, una quest de martes y jueves en «Toca hoy» y el jueves en «Próximos días», `V` por las tres vistas, chips de lo quemado y lo fracturado.
