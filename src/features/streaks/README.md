---
funcionalidad: streaks
titulo: Rachas
resumen: Las quests que se repiten cuentan las veces seguidas completadas a tiempo, con una llama en la tarjeta; se calcula en la proyección.
tipo: dominio
eventos: []
preferencias: []
adr: [ADR-22]
---

# Rachas

Cada quest que se repite (repetible o con repetición) lleva su **racha**: cuántas veces seguidas la has completado **a tiempo**. Se ve con una llama en la tarjeta y con más detalle en la quest: las veces seguidas, la mejor racha y hasta cuándo sigue viva.

## Qué hace

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Rachas en las que se repiten | `QuestState.streak` en cualquier quest con `recurs(q)` |
| R2 | Que se vea y motive | Llama en la tarjeta (desde 2), su detalle, aviso cuando quedan pocas horas y al llegar a 3, 7, 14, 30… |

## Reglas y decisiones

### Qué es «a tiempo»

Tras completarla, la quest vuelve cuando acaba su espera y hay que volver a completarla **dentro de un margen**: lo que dura la espera, y al menos un día (`streakGrace`).

| Quest | Espera | Hay que repetirla antes de… |
|---|---|---|
| Diaria (20 h), hecha a las 8:00 | 20 h | Las 4:00 del día después de que vuelva (44 h) |
| Sin espera | 0 | 24 h |
| Cada 3 días | 3 días | 6 días |
| Semanal | 7 días | 14 días |
| Por días de la semana (lunes y jueves), hecha el lunes | Hasta el jueves | El final del jueves (`streakUntil`, [complex](../complex/README.md)) |

Se calcula con el `ts` del evento (`nextStreak`) y se guarda el plazo (`until`). **Romperse no es un evento**: `liveStreak(s, now)` devuelve 0 si ya pasó el plazo, como el fin de la espera de una repetible.

### Sin eventos ni recompensas

- Se calcula en la proyección, en cada `quest_completed` válido: un completado duplicado de otro equipo no la sube ([ADR-22](../../../docs/decisions/ADR-22-rachas-y-cronica-calculadas.md)).
- Es **retroactiva**: sale de lo que ya habías completado.
- **No da XP ni oro extra** (cambiaría la economía del mercader); se podría añadir como bonificación copiada en el evento, preguntando antes al propietario.

## Eventos

No tiene eventos propios: se calcula en `quest_completed`.

## Interfaz

- **Tarjeta**: llama y número desde 2 veces seguidas (`STREAK_SHOWN_FROM`): brasa (menos de 7), fuego (7), fuego vivo (14) y llama azul (30 o más) (`flameTier`). Parpadea si quedan menos de 6 h (o de la mitad del margen, si es corto).
- **Detalle**: sección «Racha» con las veces seguidas, la mejor y el día y la hora límite, o «¡Se rompe en 3 h!». Rota: «Rota. La mejor fue de 9».
- **Aviso** al completar con una racha de 3, 7, 14, 30, 50, 100, 200 o 365 (`STREAK_MILESTONES`).
- **Crónica**: cada entrada de una quest que se repite guarda su racha («Van 5 seguidas»). **Avisos del sistema**: 3 h antes de que se rompa una racha de 2 o más.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `Streak`, `streakGrace`, `streakDeadline`, `nextStreak`, `liveStreak`, `streakAtRisk`, `STREAK_MILESTONES`, `isStreakMilestone`, `flameTier`. Puro |
| `components/Flame.tsx`, `StreakBadge.tsx`, `StreakInfo.tsx` | La llama, la insignia de la tarjeta y la sección del detalle |
| `streaks.css`, `i18n.ts` | Estilos y textos es + ja |
| `model.test.ts` | Plazos, suma a tiempo, se rompe sola, duplicados, quests que no se repiten |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/types.ts` | `QuestState.streak` |
| `src/domain/projection.ts` | `nextStreak` en `quest_completed` si la quest se repite |
| `src/components/QuestCard.tsx` | `<StreakBadge />` en la línea de la etiqueta |
| `src/components/QuestDetail.tsx` | Sección «Racha» con `<StreakInfo />` |
| `src/store/actions.ts` | Aviso al llegar a una racha redonda |
| `src/styles/theme.css` | `--streak`, `--streak-core`, `--streak-blue` |
| `src/i18n/locales/{es,ja}.ts` | Montan `streaks` |

## Dependencias

- No importa otras funcionalidades (el plazo de las que se repiten por días se lo pasa la proyección con `streakUntil` de `complex`).
- **La usan:** `chronicle` (la llama), `notifications` (racha a punto de romperse) y `today` («Rachas en peligro»).

## Estado actual

- **Última verificación:** 2026-10-06, tests de la repetición por días (racha de 2 en la proyección); la tarjeta y el detalle, el 2026-10-02 en el navegador con un historial de 14 días, también en japonés.
- **Tests:** `model.test.ts` y `src/features/complex/model.test.ts`.
- **Sin verificar:** la app nativa y Windows.
- **Historial:** [docs/history/verificacion/streaks.md](../../../docs/history/verificacion/streaks.md).

## Pendiente

- Una pequeña bonificación de XP por racha (copiada en `quest_completed`), si el propietario la quiere.
- Un «comodín» para no romper la racha un día al mes.
