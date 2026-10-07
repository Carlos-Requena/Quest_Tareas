---
funcionalidad: rewards
titulo: Recompensa calculada
resumen: La XP y el oro salen de los objetivos y la categoría de cada quest, y la de un encargo de sus calaveras y sus quests; nadie los escribe a mano.
tipo: dominio
eventos: []
preferencias: []
adr: [ADR-35]
---

# Recompensa calculada

La XP y el oro de una quest salen de **sus objetivos** y de **su categoría**; la de un encargo, de **sus calaveras** y de **lo que valen sus quests enlazadas**. El formulario enseña la recompensa en vivo y no deja cambiarla.

## Qué hace

Lo que pidió el propietario:

- Cada objetivo aporta su XP y su oro: un pomodoro de 3 rondas vale más que uno de 1.
- La categoría pesa: élite ×2, encargo ×1, repetible ×0,5.
- La recompensa es **fija**: la calcula el juego y nadie la cambia a mano.
- Un encargo vale más cuantas más quests tenga enlazadas.
- **Comprar tiene que ser habitual**: con días buenos, una pieza legendaria cada 2–3 semanas y el catálogo de serie entero en un año (los precios, en [merchant](../merchant/README.md)).

| Objetivo | XP | Oro |
|---|---|---|
| Pomodoro | 1 por minuto de concentración (rondas × minutos; los descansos no cuentan) | 18 por minuto |
| Contador ×N | 25 · √N | 450 · √N |
| Lista | 15 por casilla | 270 por casilla |

**Quest** = suma de sus objetivos × peso de la categoría (`CATEGORY_FACTOR`), redondeado a 5. El contador usa la raíz para que un «×999» no rompa la economía (×1 = 25 XP, ×9 = 75, ×100 = 250). El objeto garantizado se sigue eligiendo a mano.

**Encargo** = base por calaveras + bono sobre lo que valen sus quests:

| Calaveras | Base (XP · G) | Bono |
|---|---|---|
| 1 | 60 · 1.350 | 20 % |
| 2 | 120 · 2.700 | 30 % |
| 3 | 200 · 4.500 | 40 % |
| 4 | 320 · 7.200 | 50 % |
| 5 | 500 · 11.250 | 60 % |

El oro de la base es el de `suggestedReward` (features/temporal) × `TEMPORAL_GOLD_FACTOR` (45). Las quests enlazadas pagan lo suyo al completarlas; el encargo es el premio por cerrarlo todo.

| Ejemplo | XP | Oro |
|---|---|---|
| Encargo con 3 pomodoros de 90 min | 270 | 4.860 |
| Élite con 3 pomodoros de 90 min y un contador ×9 | 690 | 12.420 |
| Repetible con un contador ×1 | 15 | 225 |
| Encargo de 3 calaveras con esa élite y una quest de 50 XP · 900 G | 200 + 40 % de 740 = 495 | 4.500 + 40 % de 13.320 = 9.830 |

Un día bueno (4–5 h de concentración y algún contador) da unos 6.500 G.

## Reglas y decisiones

- **Se calcula en la proyección.** Al aplicar `quest_created`, la proyección sustituye la XP y el oro de la definición por los de la fórmula (`questReward`); en `finishProjection`, cada encargo pendiente recalcula la suya con sus quests enlazadas (`temporalValue`). Todas las pantallas enseñan la misma cifra sin tocarlas ([ADR-35](../../../docs/decisions/ADR-35-recompensa-calculada.md)).
- **Lo ganado no cambia.** `quest_completed` y `temporal_completed` copian la recompensa del momento y la proyección suma la del evento.
- **Lo guardado en la definición sigue relleno** (`QuestDef.reward`, `TemporalDef.reward`), con el valor calculado al crear: lo lee un equipo con una versión anterior de la app; la actual lo ignora.
- **Editar un encargo no manda la recompensa en el parche**: la proyección la sigue sola.
- Descartado: recalcular en `reportQuest` (las pantallas enseñarían otra cifra hasta reportar), un evento `reward_set` (lo calculado no va en eventos) y dejarla editable (el propietario la quiere fija).
- **`REWARD_RATES`, `CATEGORY_FACTOR` y `TEMPORAL_GOLD_FACTOR` no se cambian sin preguntar al propietario.** Si se cambia la fórmula, sube `PROJECTION_VERSION`.

## Eventos

No tiene eventos propios ni cambia la forma de ninguno.

## Interfaz

- **Quest** (`CreateQuestModal`): sin campos de XP y oro; `RewardPreview` enseña la recompensa con los objetivos y la categoría del momento.
- **Encargo** (`TemporalForm`): sin campos de XP y oro; `draftReward` suma las quests enlazadas, las rápidas («título ×N») y las completas.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `REWARD_RATES`, `CATEGORY_FACTOR`, `TEMPORAL_GOLD_FACTOR`, `conditionValue`, `questValue`, `questReward`, `temporalBonusRate`, `temporalValue`. Puro |
| `components/RewardPreview.tsx` | La recompensa en vivo en los formularios |
| `rewards.css`, `i18n.ts` | Estilos y textos es + ja |
| `model.test.ts` | Cada tipo de objetivo, categoría, redondeo, valores imposibles, datos antiguos, lo ganado que no cambia y el encargo al enlazar |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/projection.ts` | `quest_created` usa `questReward`; `finishProjection` recalcula los encargos pendientes con `temporalValue` |
| `src/components/CreateQuestModal.tsx` | `QuestFormModal` exportado (con `onCreate` y `preset`); `RewardPreview` en lugar de los campos |
| `src/features/temporal/actions.ts` | `TemporalDraft` sin `xp` / `gold`; `draftReward`; `createDraftQuests` |
| `src/features/temporal/components/TemporalForm.tsx`, `src/features/temporal/components/TemporalQuestsField.tsx` | `RewardPreview` y «+ Quest completa…» |
| `src/i18n/locales/{es,ja}.ts` | Montan `rewards` |

## Dependencias

- **features/checklist** (`model.ts`): cuántas casillas tiene una lista.
- **features/temporal** (`model.ts`: `suggestedReward`, `TemporalState`): la base por calaveras y las quests enlazadas.
- **La usan:** `editing` y `quickadd` (recompensa de lo que se publica), `temporal` (la del encargo y su formulario).

## Estado actual

- **Última verificación:** 2026-10-03, tests y navegador a 1.300 × 860 (las quests de ejemplo con su recompensa calculada; un encargo pasa de 60 a 495 XP con 3 calaveras y una quest completa).
- **Tests:** `model.test.ts` y `src/store/game.test.ts` (reportar copia la recompensa calculada; el encargo cobra base más bono).
- **Sin verificar:** la app nativa.
- **Historial:** [docs/history/verificacion/rewards.md](../../../docs/history/verificacion/rewards.md).
