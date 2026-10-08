---
funcionalidad: today
titulo: Mi día
resumen: Primera vista del calendario, que responde a «¿qué hago ahora?»: lo que se pierde esta noche, lo que está en curso, rachas, lo que toca hoy y la agenda.
tipo: presentación
eventos: []
preferencias: []
adr: [ADR-46]
---

# Mi día

La primera vista del [calendario](../calendar/README.md) (**Mi día** · Semana · Día) y la que sale la primera vez. Responde a «¿qué hago ahora?». Los plazos ([horizon](../horizon/README.md)) se quedan solo como filtro de los tablones.

## Qué hace

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Ver en un sitio lo que hay que hacer hoy | `todayPlan`: urgente, en curso, rachas, lo que toca y la agenda |
| R2 | Que la planificación no esté repartida | Es una vista del calendario, la primera ([ADR-46](../../../docs/decisions/ADR-46-mi-dia.md)) |
| R3 | Actuar desde ahí | Cada fila lleva a su quest o encargo; lo que toca hoy, con «Aceptar» al lado |

## Reglas y decisiones

| Bloque | Qué | Por qué ahí |
|---|---|---|
| **Se pierde esta noche** | Encargos de hoy (aceptados o no) y quests con fecha límite hoy, con la cuenta atrás hasta medianoche | Fallan al acabar el día ([failure](../failure/README.md)) |
| **En curso** | Las quests aceptadas, con sus objetivos cumplidos | Lo empezado |
| **Rachas en peligro** | Las que se repiten con racha de 2 o más que se rompe en pocas horas o antes de acabar el día | [streaks](../streaks/README.md) |
| **Toca hoy** | Las que se repiten por días y hoy toca, y las que ya han vuelto al tablón | Lo que se puede hacer ya |
| **Vencido de antes** | Lo que venció antes de que existieran los fallos | No falla solo: se resuelve a mano |
| **Agenda de hoy** (al lado) | Lo de todo el día y lo que tiene hora; lo pasado apagado y lo de ahora marcado | `calendarDay` de hoy |
| **Próximos días** | Mañana y los dos siguientes: cuántos encargos, quests y bloques | Pulsar uno abre su día por horas |
| **Hecho hoy** | Quests y encargos de hoy en la crónica, con su XP y oro (y lo perdido) | Cerrar el día |

- **Arriba, el compañero** ([companion](../companion/README.md)): un personaje que comenta la situación del día con las mismas reglas de estos bloques.
- Las quests de un encargo sin aceptar (en reserva) no salen. Una quest sale en un solo bloque (las de racha en peligro no se repiten en «Toca hoy»). Sin nada, «Día libre».
- Se calcula de las quests, los encargos, la agenda y la crónica con la hora (`now`), sin estado propio: la vista elegida la recuerda el calendario (`quests.calendarView`).

## Eventos

No tiene eventos.

## Interfaz

`V` pasa por Mi día → Semana → Día. Desde Mi día, `←` `→` llevan al día por horas de ayer o mañana. En ventanas estrechas y en el teléfono, una sola columna con filas de 44 px.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `todayPlan`, `isQuietDay`, `needsAccepting`, `NEXT_DAYS`. Usa `effectiveStatus` (la proyección); el dominio no importa este archivo |
| `components/TodayView.tsx` | La vista |
| `today.css`, `i18n.ts` | Bloques, filas y agenda (una columna en ventanas estrechas); textos es + ja |
| `model.test.ts` | Cada bloque, rachas, lo hecho hoy y las quests por días en el calendario |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/features/calendar/components/CalendarView.tsx` | Vista `"today"` (la primera) |
| `src/features/calendar/actions.ts` | `cycleCalendarView` (tecla `V`) y las flechas desde Mi día |
| `src/i18n/locales/{es,ja}.ts` | Montan `today` |

## Dependencias

- **features/calendar** (`model.ts`, `actions.ts`, `CalendarChip`): la agenda de hoy, los próximos días y abrir un día.
- **features/temporal** (`model.ts`, `actions.ts`, `Skull`): los encargos de hoy y abrir su cartel.
- **features/agenda** (`model.ts`): los bloques de hoy.
- **features/streaks**, **features/complex**, **features/failure**, **features/chronicle** (sus `model.ts`): rachas en peligro, lo que toca hoy, lo que falla esta noche y lo hecho hoy.
- **features/companion** (`index`: `CompanionBox`): el compañero de arriba. Para cambiar lo que dice, lee su README.
- Para cambiar la vista no hace falta leer esos README, salvo que cambie la regla de un bloque.
- **La usan:** `calendar` (la vista) y `companion` (el tipo `TodayPlan`, para la situación del día).

## Estado actual

- **Última verificación:** 2026-10-06, tests y navegador a 1100 × 720 y 402 × 874, en español y japonés.
- **Tests:** `model.test.ts`.
- **Sin verificar:** la app nativa y el iPhone de verdad.
- **Historial:** [docs/history/verificacion/today.md](../../../docs/history/verificacion/today.md).
