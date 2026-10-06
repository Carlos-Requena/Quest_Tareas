# Mi día

Una vista del calendario que responde a «¿qué hago ahora?». El calendario es ahora el sitio donde se planifica: **Mi día · Semana · Día**. Los plazos (features/horizon) se quedan solo como filtro de los tablones.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Ver en un sitio lo que hay que hacer hoy | `todayPlan`: urgente, en curso, rachas, lo que toca y la agenda |
| R2 | Que la planificación no esté repartida | Es una vista del calendario, la primera; los plazos solo filtran los tablones |
| R3 | Actuar desde ahí | Cada fila lleva a su quest o encargo; lo que toca hoy, con «Aceptar» al lado |

---

## Decisiones de diseño

### Qué sale, por urgencia

| Bloque | Qué | Por qué ahí |
|---|---|---|
| **Se pierde esta noche** | Encargos de hoy (aceptados o no) y quests con fecha límite hoy, con la cuenta atrás hasta medianoche | Fallan al acabar el día (features/failure) |
| **En curso** | Las quests aceptadas, con sus objetivos cumplidos | Lo empezado |
| **Rachas en peligro** | Las que se repiten con racha de 2 o más que se rompe en pocas horas o antes de acabar el día | features/streaks |
| **Toca hoy** | Las que se repiten por días y hoy toca, y las que ya han vuelto al tablón | Lo que se puede hacer ya |
| **Vencido de antes** | Lo que venció antes de que existieran los fallos | No falla solo: se resuelve a mano |
| **Agenda de hoy** (al lado) | Lo de todo el día y lo que tiene hora; lo pasado apagado y lo de ahora marcado | `calendarDay` de hoy |
| **Próximos días** | Mañana y los dos siguientes: cuántos encargos, quests y bloques | Pulsar uno abre su día por horas |
| **Hecho hoy** | Quests y encargos de hoy en la crónica, con su XP y oro (y lo perdido) | Cerrar el día |

Las quests de un encargo sin aceptar (en reserva) no salen. Una quest sale en un solo bloque (las de racha en peligro no se repiten en «Toca hoy»). Sin nada, «Día libre».

### Sin eventos ni estado propio

Se calcula de las quests, los encargos, la agenda y la crónica con la hora (`now`). La vista elegida se recuerda en cada equipo, como antes (`quests.calendarView`); la primera vez, Mi día. La app sigue abriendo en el Quest Board.

### Teclas y teléfono

`V` pasa por Mi día → Semana → Día. Desde Mi día, `←` `→` llevan al día por horas de ayer o mañana. En el teléfono es una sola columna con filas de 44 px.

---

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `todayPlan`, `isQuietDay`, `NEXT_DAYS`. Usa `effectiveStatus` (la proyección): el dominio no lo importa |
| `today.css` | Bloques, filas y agenda; una columna en ventanas estrechas y en el teléfono |
| `i18n.ts` | Textos es + ja |
| `components/TodayView.tsx` | La vista |
| `model.test.ts` | Cada bloque, rachas, lo hecho hoy y las quests por días en el calendario |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `features/calendar` | Vista `"today"` (la primera), `cycleCalendarView` (tecla V), flechas desde Mi día, `CalendarSources.today` |
| `i18n/locales/{es,ja}.ts` | Montan `today` |

---

## Verificación

Hecho el 2026-10-06.

- **Tests:** `model.test.ts`.
- **Navegador** (1100 × 720 y 402 × 874, español y japonés): una cita a las 17:30 y una quest para hoy en «Se pierde esta noche» con la cuenta atrás; una quest de martes y jueves en «Toca hoy»; agenda con un bloque; próximos días; lo terminado apagado en la agenda.

**No verificado:** la app nativa y el iPhone de verdad.
