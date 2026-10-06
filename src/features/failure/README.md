# Fallos: quests que se fracturan y carteles que se queman

Si se acaba el día de su fecha límite sin completarla, la quest **se fractura**: la tarjeta se agrieta y cae en pedazos («QUEST FAILED»). Si se acaba el día de un encargo sin cumplirlo, su cartel **se quema** desde abajo hasta quedar en ceniza («BURNED»). No cuesta oro ni XP: sale del tablón y queda en la crónica, en tinta roja. Desde la animación, el cartel quemado o la búsqueda se puede **volver a clavar** una copia con fecha nueva.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Que fallar tenga consecuencia | Eventos `quest_failed` y `temporal_failed`; lo fallido sale del tablón |
| R2 | Quest: se fractura; encargo: se quema el papel | `FailureOverlay`: pedazos que caen / fuego que sube con ascuas y ceniza |
| R3 | Solo constancia, sin coste | Sin XP ni oro; entrada `failed` en la crónica |
| R4 | Cuándo falla: al acabar su día | `failsAt(dueAt)`: la medianoche que cierra el día de la fecha (también los encargos con hora: hay todo el día para marcarlo) |
| R5 | Lo ya vencido se perdona | Solo falla lo que vence desde el 6 de octubre de 2026 (`FAIL_SINCE_DAY`) |
| R6 | Poder volver a intentarlo | «Volver a clavar»: una copia en el formulario, con fecha nueva |

Decidido con el propietario el 2026-10-06.

---

## Decisiones de diseño

### Eventos, no un estado calculado

Que algo haya fallado depende del paso del tiempo, pero **saca la quest del tablón, la apunta en la crónica y bloquea su encargo**: tiene que ser igual en todos los equipos y verse en el historial. Por eso es un evento, como `temporal_completed`, que emite el vigilante (`FailureWatcher`) al arrancar y cada minuto. Si dos equipos lo emiten a la vez, la guarda deja contar solo el primero.

| Guarda | `quest_failed` | `temporal_failed` |
|---|---|---|
| Sin terminar | `status !== "done"` | `status === "pending"` (aceptado o no) |
| Con fecha | `dueAt` propia | Siempre la tiene |
| Que no se repita | `!recurs(q)` (las que se repiten no tienen fecha) | — |
| Su día acabado | `e.ts >= failsAt(dueAt)` | `e.ts >= failsAt(dueAt)` |

El **perdón** (`FAIL_SINCE_DAY`) no está en la guarda sino en la acción (`dueFailures`): la proyección solo comprueba que el día haya acabado. Lo vencido antes de esa fecha sigue como estaba y se resuelve a mano («Vencido de antes» en Mi día).

### Cómo queda lo fallido

- **Quest:** `status: "done"` y `failedAt`. Sale del tablón como una terminada (todas las listas que filtran `done` ya la quitan), sin `completions` ni recompensa. No se puede aceptar, completar ni editar.
- **Encargo:** `status: "done"`, `failedAt`, sin `completedAt` ni `earned`. Su recompensa se ve tachada.
- **Las quests de un encargo quemado** que no estaban terminadas fallan con él (una sola entrada en la crónica: «con N quests»). Las que se repiten no: son costumbres y siguen en el tablón.
- **Una quest enlazada que se fractura** no cuenta como terminada para su encargo (`linkedQuestDone`): el encargo ya no se puede cumplir. Se puede desenlazar para seguir.
- **Un requisito fallido deja de bloquear** (`requirementMet`), como uno retirado: si no, sus dependientes quedarían bloqueados para siempre.

### La animación, una vez en cada equipo

`failedSince` da lo que falló después de la última vez que se miró en este equipo (`quests.failSeen`, en `localStorage`, como el idioma). La primera vez solo apunta la hora: no se repiten fallos antiguos. Lo que falla en otro equipo también se enseña aquí al sincronizar. Varias seguidas van en cola («Siguiente (quedan 2)»). Clic o `Enter` salta al final; `Enter` otra vez, sigue.

| | Quest | Encargo |
|---|---|---|
| Entrada | La tarjeta cae y se asienta | El cartel cae |
| 1 | Grietas desde un punto (crujido, temblor) | Prende por abajo: la línea de la brasa (`--burn`) sube, lo de encima se chamusca y salen ascuas |
| 2 | Se rompe en 24 pedazos que caen girando (golpe, acorde menor) | Lo quemado desaparece (máscara) y cae ceniza |
| 3 | «QUEST FAILED» en rojo | «BURNED» en fuego |

Sonidos sintetizados en `lib/sfx.ts` (`fracture`, `burn`); partículas con `lib/fx.ts`, que respeta «reducir movimiento» (sin sacudidas y con el fuego más corto).

### Volver a clavar

- **Quest** (`repostQuest`): el formulario completo con lo mismo y **sin fecha límite** (hay que elegir otra).
- **Encargo** (`repostTemporal`, `copyDraft` en features/temporal): su formulario con lo mismo, para **mañana a la misma hora**, sin aceptar, y sus quests perdidas como quests nuevas. Los adjuntos no se copian: siguen en el cartel quemado.

---

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `quest_failed` | `questId` | `done` + `failedAt`; crónica `failed` | Ver tabla de guardas |
| `temporal_failed` | `temporalId` | `done` + `failedAt`; sus quests sin terminar (que no se repiten) fallan; crónica `failed` | Ver tabla de guardas |

`PROJECTION_VERSION` pasa a 10 (con la edición, deshacer y la repetición por días).

---

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `FAIL_SINCE_DAY`, `failsAt`, `questFailsBy`, `temporalFailsBy`, `notForgiven`, `dueFailures`, `failedSince`. Puro |
| `events.ts` | `quest_failed`, `temporal_failed` |
| `actions.ts` | `checkFailures`, `noticeFailures`, `repostQuest`, `repostTemporal` |
| `ui.ts` | Cola de animaciones y marca de lo visto (`quests.failSeen`) |
| `failure.css` | La escena, el cartel quemado del tablón y las quests perdidas |
| `i18n.ts` | Textos es + ja («Quest Failed» y «Burned» se quedan en inglés) |
| `components/FailureWatcher.tsx` | Emite los fallos y encola las animaciones |
| `components/FailureOverlay.tsx` | Las dos animaciones y los botones |
| `model.test.ts` | Plazos, cambio de hora, guardas, quests de un encargo, perdón y `failedSince` |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `domain/types.ts` | `QuestState.failedAt`; `TemporalState.failedAt` (en features/temporal) |
| `domain/events.ts`, `domain/projection.ts` | Los dos eventos y sus `case` |
| `features/temporal` | `linkedQuestDone`, `finishedAt`, `isBurned`, `copyDraft`, `LinkState` «failed», cartel quemado (`Poster`, `PosterView` con «Volver a clavar»), «Quemado» en `dueChip`, `TemporalForm` con `from` |
| `features/complex` | Un requisito fallido no bloquea |
| `features/chronicle` | Entrada `failed` (frases y tinta roja) |
| `features/calendar` | Chips de lo fracturado y lo quemado |
| `features/search` | Lo fallido sale en la búsqueda y se vuelve a clavar |
| `lib/sfx.ts` | `fracture`, `burn` |
| `styles/theme.css` | `--fire`, `--fire-core`, `--ember`, `--char`, `--ash` |
| `App.tsx` | `FailureWatcher`, `FailureOverlay`, `failureBusy()` |
| `features/mobile` | `KeyHint` con `failure.hint` |

---

## Verificación

Hecho el 2026-10-06.

- **Tests:** `model.test.ts`, invariantes de `project()` con fallos en los historiales aleatorios (`randomStream`) y `store/game.test.ts` (`checkFailures` fractura lo vencido y no lo perdonado).
- **Navegador:** una quest y un encargo para hoy, el reloj de la página adelantado a mañana a las 00:05: el encargo se quema, su quest falla con él y la quest se fractura; cola de dos animaciones (capturas a mitad del fuego y de los pedazos con el reloj de GSAP parado), crónica en rojo, cartel quemado en el tablón (0/1, recompensa tachada, «Se quemó el…»), «Volver a clavar» de los dos y búsqueda. También a 402 × 874.

**No verificado:** la app nativa y el iPhone; el sonido (sin altavoces).
