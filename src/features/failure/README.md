---
funcionalidad: failure
titulo: Fallos
resumen: Al acabar el día de su fecha sin terminarla, la quest se fractura y el cartel del encargo se quema; sin coste y con «Volver a clavar».
tipo: dominio
eventos: [quest_failed, temporal_failed]
preferencias: [quests.failSeen]
adr: [ADR-44]
---

# Fallos

Si se acaba el día de su fecha límite sin completarla, la quest **se fractura**: la tarjeta se agrieta y cae en pedazos («QUEST FAILED»). Si se acaba el día de un encargo sin cumplirlo, su cartel **se quema** desde abajo hasta quedar en ceniza («BURNED»). No cuesta oro ni XP: sale del tablón y queda en la crónica, en tinta roja. Desde la animación, el cartel quemado o la búsqueda se **vuelve a clavar** una copia con fecha nueva.

## Qué hace

Decidido con el propietario: fallar tiene consecuencia, pero solo de constancia.

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Que fallar tenga consecuencia | Eventos `quest_failed` y `temporal_failed`; lo fallido sale del tablón |
| R2 | Quest: se fractura; encargo: se quema el papel | `FailureOverlay`: pedazos que caen / fuego que sube con ascuas y ceniza |
| R3 | Solo constancia, sin coste | Sin XP ni oro; entrada `failed` en la crónica |
| R4 | Cuándo falla: al acabar su día | `failsAt(dueAt)`: la medianoche que cierra el día de la fecha (también los encargos con hora: hay todo el día para marcarlo) |
| R5 | Lo ya vencido se perdona | Solo falla lo que vence desde el 6 de octubre de 2026 (`FAIL_SINCE_DAY`) |
| R6 | Poder volver a intentarlo | «Volver a clavar»: una copia en el formulario, con fecha nueva |

## Reglas y decisiones

### Eventos, no un estado calculado

Que algo haya fallado depende del paso del tiempo, pero **saca la quest del tablón, la apunta en la crónica y bloquea su encargo**: tiene que ser igual en todos los equipos y verse en el historial. Por eso es un evento que emite el vigilante (`FailureWatcher`) al arrancar y cada minuto; si dos equipos lo emiten a la vez, la guarda deja contar solo el primero ([ADR-44](../../../docs/decisions/ADR-44-fallos.md)).

El **perdón** (`FAIL_SINCE_DAY`) no está en la guarda sino en la acción (`dueFailures`): la proyección solo comprueba que el día haya acabado. Lo vencido antes de esa fecha sigue como estaba y se resuelve a mano («Vencido de antes» en Mi día).

### Cómo queda lo fallido

- **Quest:** `status: "done"` y `failedAt`, sin `completions` ni recompensa. Sale del tablón como una terminada. No se puede aceptar, completar ni editar.
- **Encargo:** `status: "done"`, `failedAt`, sin `completedAt` ni `earned`; su recompensa se ve tachada.
- **Las quests de un encargo quemado** que no estaban terminadas fallan con él (una sola entrada en la crónica: «con N quests»). Las que se repiten no: son costumbres y siguen en el tablón.
- **Una quest enlazada que se fractura** no cuenta como terminada para su encargo (`linkedQuestDone`): el encargo ya no se puede cumplir hasta desenlazarla.
- **Un requisito fallido deja de bloquear** (`requirementMet`), como uno retirado.

### La animación, una vez en cada equipo

`failedSince` da lo que falló después de la última vez que se miró en este equipo (`quests.failSeen`, que nunca retrocede). La primera vez solo apunta la hora: no se repiten fallos antiguos. Lo que falla en otro equipo también se enseña aquí al sincronizar. Varias seguidas van en cola («Siguiente (quedan 2)»).

### Volver a clavar

- **Quest** (`repostQuest`): el formulario completo con lo mismo y **sin fecha límite** (hay que elegir otra).
- **Encargo** (`repostTemporal`, `copyDraft` de [temporal](../temporal/README.md)): su formulario con lo mismo, para **mañana a la misma hora**, sin aceptar y con sus quests perdidas como quests nuevas. Los adjuntos se quedan en el cartel quemado.

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `quest_failed` | `questId` | `done` + `failedAt`; crónica `failed` | Sin terminar, con `dueAt` propia, que no se repita (`!recurs(q)`) y `e.ts >= failsAt(dueAt)` |
| `temporal_failed` | `temporalId` | `done` + `failedAt`; sus quests sin terminar (que no se repiten) fallan; crónica `failed` | Pendiente (aceptado o no) y `e.ts >= failsAt(dueAt)` |

Fallar no se deshace ([undo](../undo/README.md)).

## Interfaz

| | Quest | Encargo |
|---|---|---|
| Entrada | La tarjeta cae y se asienta | El cartel cae |
| 1 | Grietas desde un punto (crujido, temblor) | Prende por abajo: la línea de la brasa sube, lo de encima se chamusca y salen ascuas |
| 2 | Se rompe en 24 pedazos que caen girando (golpe, acorde menor) | Lo quemado desaparece y cae ceniza |
| 3 | «QUEST FAILED» en rojo | «BURNED» en fuego |

- **Los pedazos** son 24 copias de la cara de la tarjeta, cada una con un `clip-path: polygon(…)`: una rejilla de 4 × 3 con los vértices interiores movidos (semilla: el id) y cada celda partida en dos triángulos. Caen con `power2.in`, girando y alejándose del centro.
- **El fuego** es una sola variable CSS, `--burn` (de −6 % a 110 %), que anima GSAP: la máscara del cartel (`mask-image`) borra lo quemado, una capa con `mix-blend-mode: multiply` oscurece lo que va a arder y la línea de la brasa (`bottom: var(--burn)`) sube con ellas. Las ascuas salen cada 0,14 s de la altura de la línea.
- Clic o `Enter` salta al final (`tl.kill()` y `gsap.set`); `Enter` otra vez, sigue.
- Sonidos en `src/lib/sfx.ts` (`fracture`, `burn`); partículas con `src/lib/fx.ts`, que respeta «reducir movimiento» (sin sacudidas y con el fuego más corto).

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `FAIL_SINCE_DAY`, `failsAt`, `questFailsBy`, `temporalFailsBy`, `notForgiven`, `dueFailures`, `failedSince`. Puro |
| `events.ts` | `quest_failed`, `temporal_failed` |
| `actions.ts` | `checkFailures`, `noticeFailures`, `repostQuest`, `repostTemporal` |
| `ui.ts` | Cola de animaciones y marca de lo visto (`quests.failSeen`); `failureBusy` |
| `components/FailureWatcher.tsx` | Emite los fallos y encola las animaciones |
| `components/FailureOverlay.tsx` | Las dos animaciones y los botones |
| `failure.css`, `i18n.ts` | La escena, el cartel quemado y las quests perdidas; textos es + ja («Quest Failed» y «Burned» se quedan en inglés) |
| `model.test.ts` | Plazos, cambio de hora, guardas, quests de un encargo, perdón y `failedSince` |

### Dónde está cada cosa

| Concepto | Símbolo |
|---|---|
| Cuándo falla algo | [`failsAt`](model.ts), [`questFailsBy`](model.ts) y [`temporalFailsBy`](model.ts) |
| Lo que hay que emitir ahora, sin lo perdonado | [`dueFailures`](model.ts), [`notForgiven`](model.ts) y [`FAIL_SINCE_DAY`](model.ts) |
| El vigilante (al arrancar y cada minuto) | [`FailureWatcher`](components/FailureWatcher.tsx) y [`checkFailures`](actions.ts) |
| Qué animar en este equipo | [`failedSince`](model.ts) y [`noticeFailures`](actions.ts) |
| Las dos animaciones | [`FailureOverlay`](components/FailureOverlay.tsx): pedazos con [`useShards`](components/FailureOverlay.tsx), grietas con [`useCracks`](components/FailureOverlay.tsx) y el salto al final con `settle` |
| Volver a clavar | [`repostQuest`](actions.ts) y [`repostTemporal`](actions.ts) |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/types.ts` | `QuestState.failedAt` |
| `src/domain/events.ts`, `src/domain/projection.ts` | Los dos eventos y sus `case` |
| `src/features/temporal/model.ts` | `TemporalState.failedAt`, `linkedQuestDone`, `finishedAt`, `isBurned` |
| `src/features/temporal/actions.ts`, `src/features/temporal/links.ts` | `copyDraft` (volver a clavar); `LinkState` «failed» |
| `src/features/temporal/components/PosterView.tsx` | Cartel quemado con «Volver a clavar» |
| `src/features/complex/model.ts` | Un requisito fallido no bloquea |
| `src/features/chronicle/model.ts` | Entrada `failed` |
| `src/features/calendar/model.ts` | Chips de lo fracturado y lo quemado |
| `src/lib/sfx.ts` | `fracture`, `burn` |
| `src/styles/theme.css` | `--fire`, `--fire-core`, `--ember`, `--char`, `--ash` |
| `src/App.tsx` | `FailureWatcher`, `FailureOverlay`, `failureBusy()` |
| `src/i18n/locales/{es,ja}.ts` | Montan `failure` |

## Dependencias

- **features/temporal** (`model.ts`, `look.ts`, `ui.ts`, `Skull`): el cartel que se quema, su aspecto y volver a clavarlo. Para cambiar los encargos, lee su README.
- **features/complex** (`model.ts`: `recurs`): las quests que se repiten no fallan.
- **features/agenda** (`model.ts`: días en `AAAA-MM-DD`): cálculo del día de la fecha.
- **features/editing** (`ui.ts`): «Volver a clavar» una quest abre el formulario con datos de partida.
- **features/mobile** (`KeyHint`): «Toca para continuar».
- **La usan:** `notifications` (avisa antes de que algo falle), `today` («Se pierde esta noche», «Vencido de antes»), `search` (volver a clavar desde un resultado), `menu`, `calendar` y `temporal` (su teclado espera durante la animación).

## Estado actual

- **Última verificación:** 2026-10-06, tests y navegador con el reloj adelantado a mañana a las 00:05 (las dos animaciones en cola, la crónica en rojo, el cartel quemado, «Volver a clavar» y la búsqueda), también a 402 × 874.
- **Tests:** `model.test.ts`, invariantes de `src/domain/projection.test.ts` con fallos y `src/store/game.test.ts`.
- **Sin verificar:** la app nativa y el iPhone; el sonido.
- **Historial:** [docs/history/verificacion/failure.md](../../../docs/history/verificacion/failure.md).
