# Recompensa calculada

La XP y el oro de una quest ya no se escriben a mano: salen de **sus objetivos** y de **su categoría**. La de un encargo temporal sale de **sus calaveras** y de **lo que valen sus quests enlazadas**. El formulario enseña la recompensa en vivo y no deja cambiarla.

Funcionalidad de dominio **sin eventos propios**: no cambia la forma de ningún evento.

## Requisitos (del propietario)

- Cada objetivo aporta su XP y su oro: un pomodoro de 3 rondas vale más que uno de 1.
- La categoría pesa: élite ×2, encargo ×1, repetible ×0,5.
- La recompensa es **fija**: la calcula el juego y nadie la cambia a mano.
- Un encargo temporal vale más cuantas más quests tenga enlazadas.
- **Comprar tiene que ser habitual.** Con días buenos se compra una pieza legendaria cada 2–3 semanas y el catálogo de serie entero (2.357.300 G) en un año.

## Fórmula

| Objetivo | XP | Oro |
|---|---|---|
| Pomodoro | 1 por minuto de concentración (rondas × minutos; los descansos no cuentan) | 18 por minuto |
| Contador ×N | 25 · √N | 450 · √N |
| Lista | 15 por casilla | 270 por casilla |

**Quest** = suma de sus objetivos × peso de la categoría (`CATEGORY_FACTOR`), redondeado a 5. El objeto garantizado se sigue eligiendo a mano.

El contador usa la raíz para que un «×999» no rompa la economía: ×1 = 25 XP, ×9 = 75, ×100 = 250.

**Encargo** = base por calaveras + bono sobre lo que valen sus quests:

| Calaveras | Base (XP · G) | Bono |
|---|---|---|
| 1 | 60 · 1.350 | 20 % |
| 2 | 120 · 2.700 | 30 % |
| 3 | 200 · 4.500 | 40 % |
| 4 | 320 · 7.200 | 50 % |
| 5 | 500 · 11.250 | 60 % |

El oro de la base es el de `suggestedReward` (features/temporal) × `TEMPORAL_GOLD_FACTOR` (45). Las quests enlazadas pagan lo suyo al completarlas; el encargo es el premio por cerrarlo todo.

### Ejemplos

| Qué | XP | Oro |
|---|---|---|
| Encargo con 3 pomodoros de 90 min | 270 | 4.860 |
| Élite con 3 pomodoros de 90 min y un contador ×9 | 690 | 12.420 |
| Repetible con un contador ×1 | 15 | 225 |
| Encargo de 3 calaveras con esa élite y una quest de 50 XP · 900 G | 200 + 40 % de 740 = 495 | 4.500 + 40 % de 13.320 = 9.830 |

Un día bueno (4–5 h de concentración y algún contador) da unos 6.500 G. Con los precios del mercader (de 1.200 a 160.000 G), una pieza común sale en un día, una rara en uno o dos y una legendaria en dos o tres semanas.

## Decisiones

- **Se calcula en la proyección, no se guarda.** Al aplicar `quest_created`, la proyección sustituye la XP y el oro que trae la definición por los de la fórmula (`questReward`). En `finishProjection`, cada encargo pendiente recalcula su recompensa con sus quests enlazadas (`temporalValue`). Así todas las pantallas (tarjeta, detalle, cartel, Quest Clear) enseñan lo mismo sin tocarlas, y las quests pendientes de antes también pasan a la fórmula.
- **Lo ganado no cambia.** `quest_completed` y `temporal_completed` siguen copiando la recompensa del momento, y la proyección suma la del evento. Cambiar la fórmula no altera la XP ni el oro ya ganados.
- **Lo que se guarda en el evento sigue relleno** (`QuestDef.reward`, `TemporalDef.reward`), con el valor calculado al crear. Lo lee un equipo con una versión anterior de la app; la versión nueva lo ignora.
- **Editar un encargo no manda la recompensa en el parche**: la proyección la sigue sola.
- Alternativas descartadas: recalcular en `reportQuest` (las pantallas enseñarían otra cifra hasta reportar); un evento `reward_set` (lo calculado no va en eventos, AGENTES §5.2); dejar la recompensa editable (el propietario la quiere fija).

## Formularios

- **Quest** (`CreateQuestModal`): sin campos de XP y oro. `RewardPreview` enseña la recompensa con los objetivos y la categoría que haya en ese momento.
- **Encargo** (`TemporalForm`): sin campos de XP y oro. `draftReward` suma las quests enlazadas, las rápidas («título ×N») y las completas.
- **Quests completas en un encargo:** el botón «+ Quest completa…» abre el formulario entero del Quest Board (`QuestFormModal` con `onCreate`), con el título y el lugar del encargo como cliente y área. La quest no se publica al pulsar «Publicar quest»: se guarda en el borrador (`TemporalDraft.fullQuests`) y se crea al guardar el encargo, antes que las rápidas. Con «en cadena», cada una requiere la anterior, además de sus propios requisitos. El formulario va en un portal (`createPortal`) porque un `<form>` no puede ir dentro de otro, y su envío no se propaga al del encargo.

## Integración

| Dónde | Qué |
|---|---|
| `domain/projection.ts` | `quest_created` usa `questReward`; `finishProjection` recalcula los encargos pendientes con `temporalValue`; `PROJECTION_VERSION` 4 → 5 |
| `domain/types.ts` | Se quita `DEFAULT_REWARD` |
| `components/CreateQuestModal.tsx` | `QuestFormModal` exportado (con `onCreate` y `preset`); `RewardPreview` en lugar de los campos |
| `features/temporal/actions.ts` | `TemporalDraft` sin `xp` / `gold` y con `fullQuests`; `draftReward`; `createDraftQuests` |
| `features/temporal/components/TemporalForm.tsx` y `TemporalQuestsField.tsx` | `RewardPreview` y el botón «+ Quest completa…» |
| `features/merchant/model.ts` | Comentario de `PRICES` con la calibración nueva (los precios no cambian) |
| `i18n/locales/{es,ja}.ts` | `rewards` |

## Verificación

- `model.test.ts`: cada tipo de objetivo, categoría, redondeo, valores imposibles, la proyección con datos antiguos, lo ganado que no cambia y el encargo al enlazar y desenlazar.
- `store/game.test.ts`: reportar copia la recompensa calculada; el encargo cobra base más bono; las quests completas se publican al guardar, van antes que las rápidas y suben el valor.
- En el navegador (`pnpm dev`, 1.300 × 860): las quests de ejemplo enseñan su recompensa calculada; una élite con 3 × 90 min y ×9 da 690 XP; un encargo pasa de 60 a 200 XP al enlazarla y a 495 XP con 3 calaveras y una quest completa hecha desde el encargo.
