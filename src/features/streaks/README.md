# Rachas de las quests que se repiten

Cada quest que se repite (repetible o con repetición) lleva su **racha**: cuántas veces seguidas la has completado **a tiempo**. Se ve con una llama en la tarjeta y con más detalle en la quest: las veces seguidas, la mejor racha y hasta cuándo sigue viva.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Rachas en los repetibles | `QuestState.streak` en cualquier quest que se repita (`recurs`) |
| R2 | Que se vea y motive | Llama en la tarjeta (desde 2), su detalle, aviso cuando quedan pocas horas y un aviso al llegar a 3, 7, 14, 30… |

---

## Decisiones de diseño

### Qué es «a tiempo»

Tras completarla, la quest vuelve al tablón cuando acaba su espera y hay que volver a completarla **dentro de un margen**: lo que dura la espera, y al menos un día (`streakGrace`).

| Quest | Espera | Hay que repetirla antes de… |
|---|---|---|
| Diaria (20 h), hecha a las 8:00 | 20 h | las 4:00 del día después de que vuelva (44 h) |
| Sin espera | 0 | 24 h |
| Cada 3 días | 3 días | 6 días |
| Semanal | 7 días | 14 días |

Se calcula con el `ts` del evento (`nextStreak`) y se guarda el plazo (`until`). **Romperse no es un evento**: `liveStreak(s, now)` devuelve 0 si ya pasó el plazo, como el fin de la espera de una repetible.

### Sin eventos ni recompensas

- Se calcula en la proyección, en cada `quest_completed` válido: un completado duplicado de otro dispositivo no la sube.
- Es **retroactiva**: al actualizar la app, las rachas salen de lo que ya habías completado.
- **No da XP ni oro extra** (cambiaría la economía del mercader). Se puede añadir más adelante como bonificación copiada en el evento.

### Cómo se ve

- **Tarjeta**: llama y número desde 2 veces seguidas. Brasa (menos de 7), fuego (7), fuego vivo (14) y llama azul (30 o más). Parpadea si quedan menos de 6 h (o de la mitad del margen, si es corto).
- **Detalle**: sección «Racha» con las veces seguidas, la mejor y el día y la hora límite, o «¡Se rompe en 3 h!». Rota: «Rota. La mejor fue de 9».
- **Aviso** al completar con una racha de 3, 7, 14, 30, 50, 100, 200 o 365.
- **Crónica**: cada entrada de una quest que se repite guarda su racha («Van 5 seguidas»).

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `Streak`, `streakGrace`, `streakDeadline`, `nextStreak`, `liveStreak`, `streakAtRisk`, `STREAK_MILESTONES`, `flameTier`. Puro |
| `components/Flame.tsx`, `StreakBadge.tsx`, `StreakInfo.tsx` | La llama, la insignia de la tarjeta y la sección del detalle |
| `streaks.css`, `i18n.ts` | Estilos y textos es + ja |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `domain/types.ts` | `QuestState.streak` |
| `domain/projection.ts` | `nextStreak` en `quest_completed` si la quest se repite |
| `components/QuestCard.tsx` | `<StreakBadge />` en la línea de la etiqueta |
| `components/QuestDetail.tsx` | Sección «Racha» con `<StreakInfo />` |
| `store/actions.ts` | Aviso al llegar a una racha redonda |
| `styles/theme.css` | `--streak`, `--streak-core`, `--streak-blue` |
| `i18n/locales/{es,ja}.ts` | Montan `streaks` |

## Verificación

Hecho el 2026-10-02:

- **Tests** (`model.test.ts`): los plazos de una diaria, sin espera y semanal; suma a tiempo y vuelve a 1 si no, guardando la mejor; se rompe sola con el tiempo y avisa con menos de 6 h; en la proyección, un duplicado no la sube, saltarse días la reinicia y una quest que no se repite no tiene racha.
- **Navegador**: con un historial de 14 días (gimnasio diario con un día saltado), la tarjeta muestra la llama con 4, el detalle «4 veces seguidas · Mejor: 9 · sigue viva antes del sábado 06:00», también en japonés.

## Posibles mejoras

- Una pequeña bonificación de XP por racha (copiada en `quest_completed`).
- Un «comodín» para no romper la racha un día al mes.
