---
funcionalidad: complex
titulo: Quests complejas
resumen: Repetición en cualquier categoría (cada N horas o días, o ciertos días de la semana) y requisitos con candado entre quests.
tipo: dominio
eventos: []
preferencias: []
adr: [ADR-13, ADR-45]
---

# Quests complejas

Una quest «compleja» tiene **reglas** además de objetivos:

- **Repetición:** tras completarla vuelve al tablón pasado un tiempo («cada 3 días») o **ciertos días de la semana** («lunes, miércoles y viernes»). Vale para **cualquier** categoría, no solo la Repetible.
- **Requisitos:** otras quests que hay que completar antes de poder aceptarla («Hacer simulacros» pide «Repasar los temas»). Hasta entonces sale **con candado**.

Un encargo puede crear sus quests **en cadena** (cada una requiere la anterior): ver [temporal](../temporal/README.md).

## Qué hace

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Una tarea que, al terminarla, se repita en 3 días | `QuestDef.cooldownMinutes` + `recurs(q)`. En el formulario, opciones de siempre (1 h … 1 semana) o personalizada («cada N horas, días o semanas») |
| R2 | Que se repita ciertos días de la semana | `QuestDef.repeatDays` (como la agenda) |
| R3 | Una tarea que dependa de otra | `QuestDef.requires` (ids): no se puede aceptar hasta completarlos; la proyección lo garantiza |
| R4 | Que se vea qué falta | Candado en la tarjeta («Requiere «X»»), sección «Requisitos» en el detalle con ✓ / 🔒 y el botón «Bloqueada» |
| R5 | Que se note al cumplir el requisito | Aviso ««X» completada · desbloquea «Y»» al reportar |

## Reglas y decisiones

### Campos opcionales en `QuestDef`, sin eventos nuevos

Repetición y requisitos son parte de la definición, que viaja entera en `quest_created` y se cambia con `quest_updated` ([editing](../editing/README.md)). Los datos antiguos no los traen y se proyectan igual, sin *upcaster* ([ADR-13](../../../docs/decisions/ADR-13-repeticion-y-requisitos.md)).

| Campo | Tipo | Significado |
|---|---|---|
| `cooldownMinutes` | `number?` | Minutos hasta que vuelve tras completarla |
| `repeatDays` | `number[]?` (0 = domingo … 6 = sábado) | Días en que vuelve. Si está, **manda sobre** `cooldownMinutes` |
| `requires` | `string[]?` | Ids de las quests que hay que completar antes |

### Repetición: `recurs(q)`

```ts
recurs(q) = q.category === "repeat" || (q.cooldownMinutes ?? 0) > 0 || !!q.repeatDays?.length
```

La proyección usa `recurs(q)` para decidir si una quest completada pasa a `cooldown` o a `done`. Una repetible sin `cooldownMinutes` vuelve al instante.

- La categoría es una etiqueta (color, tabla de botín, peso de la recompensa): una élite que se repite cada semana es un «jefe semanal».
- En el formulario, la repetición sigue a la categoría hasta que se toca: Repetible propone 20 h; Élite y Encargo, «No se repite». Una repetible no tiene «No se repite».
- Límites de la personalizada: de 1 hora a 1 año (`recurrenceMinutes`).
- **Una quest que se repite no tiene fecha límite** (tras la primera vuelta quedaría vencida para siempre): el formulario oculta ese campo ([horizon](../horizon/README.md)).

### Repetición por días de la semana

Para unir la planificación en el calendario ([ADR-45](../../../docs/decisions/ADR-45-repeticion-por-dias.md)):

- **Cuándo vuelve** (`returnsAt`): a medianoche del siguiente día de la lista, contando desde mañana (`nextRepeatDay`). Completada el lunes con «lunes y jueves», vuelve el jueves a las 0:00; completada el jueves, el lunes siguiente.
- **Racha** ([streaks](../streaks/README.md)): dura hasta que acaba el siguiente día que toca (`streakUntil`). Si se salta un día que tocaba, se rompe.
- **En el calendario** sale cada día que toca, de hoy en adelante, tachada el día que se completó; en Mi día, en «Toca hoy».
- **Se crea disponible**, aunque hoy no toque: se puede hacer ya y vuelve el siguiente día de la lista.
- Al leer, `cleanRepeatDays` deja los días de 0 a 6, sin repetir y en orden; sin ninguno, el campo no está.
- En el formulario, «Ciertos días de la semana…» en el desplegable, con una chapa por día. Con la quest en curso no se cambia.

### Requisitos: completada al menos una vez

```ts
requirementMet(id) = !quests.get(id) || quests.get(id).completions > 0 || quests.get(id).failedAt !== undefined
```

- Se cumple al **completar esa quest una vez**, aunque sea de las que vuelven.
- Si el requisito **se retira** o **se fractura** ([failure](../failure/README.md)), deja de bloquear: si no, la quest quedaría bloqueada para siempre.
- **Sin ciclos:** el formulario solo ofrece quests que existen y no están completadas, ni la propia quest ni las que ya dependen de ella (`requirementCandidates(…, forQuest)`); la proyección quita los requisitos que cerrarían un círculo (`wouldCycle`).
- Como mucho 6 por quest (`MAX_REQUIRES`). Al leer, `cleanRequires()` quita duplicados, ids vacíos y la propia quest.
- **Estado bloqueado, calculado:** no hay un estado `locked`. Una quest está bloqueada si está `available` y le faltan requisitos (`isLocked`, `blockers`).
- La tarjeta bloqueada se apaga y su pie dice qué falta; el detalle dice lo que desbloquea («Al completarla desbloquea…»).

## Modelo

| Función (`model.ts`, puro) | Qué hace |
|---|---|
| `recurs(q)` | ¿Vuelve al tablón tras completarla? |
| `recurrenceMinutes(n, unit)` / `splitMinutes(min)` | «Cada N unidades» ↔ minutos, con límites |
| `RECURRENCE_PRESETS` | Las opciones de siempre del desplegable (1 h … 1 semana) |
| `cleanRequires(def)`, `cleanRepeatDays(days)` | Normalizan al leer |
| `requirementMet(id, quests)` / `prerequisitesMet(q, quests)` | ¿Se cumple un requisito / todos? |
| `blockers(q, quests)`, `isLocked(q, quests)` | Requisitos que aún bloquean; disponible pero bloqueada |
| `dependents(id, quests)`, `unlockedBetween(antes, después)` | Quests que piden esta; las que se acaban de desbloquear |
| `requirementCandidates(quests, forQuest?)`, `wouldCycle(questId, requireId, quests)` | Candidatas a requisito; ¿cerraría un círculo? |
| `nextRepeatDay(ms, days)`, `returnsAt(q, ts)` | Cuándo vuelve |
| `streakUntil(q, ts)`, `repeatsOnWeekday(q, wd)` | Fin de la racha de las que se repiten por días; ¿toca ese día? |

`QuestState` lleva `completions`, `lastCompletedAt` (lo usan los encargos con quests enlazadas) y `failedAt`.

## Eventos

No tiene eventos propios. La proyección aplica sus reglas en otros:

| Evento | Regla |
|---|---|
| `quest_created` / `quest_updated` | `cleanRequires`, `cleanRepeatDays`; quita requisitos que cerrarían un círculo |
| `quest_accepted` | Se ignora si faltan requisitos en ese punto de la reproducción (`prerequisitesMet`) |
| `quest_completed` | `recurs(q)` decide `cooldown` o `done`; `availableAt = returnsAt(q, e.ts)` y `lastCompletedAt` |

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | Funciones puras (lo único que importa el dominio) |
| `components/RecurrenceField.tsx` | Repetición en el formulario de quest |
| `components/RequiresField.tsx` | Requisitos en el formulario |
| `components/QuestRequirements.tsx` | Requisitos y desbloqueos en el detalle; `LockIcon` |
| `complex.css`, `i18n.ts` | Estilos (formulario, detalle y tarjeta bloqueada) y textos es + ja |
| `model.test.ts` | Repetición, límites, requisitos, ciclos y repetición por días |

No tiene `events.ts` ni `actions.ts`: la comprobación al aceptar vive en `src/store/actions.ts`.

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/types.ts` | `QuestDef.requires`, `repeatDays`, `cooldownMinutes`; `QuestState.lastCompletedAt` |
| `src/domain/projection.ts` | Limpieza al crear; guarda de requisitos en `quest_accepted`; `recurs`, `returnsAt` y `lastCompletedAt` en `quest_completed` |
| `src/store/actions.ts` | `acceptQuest` avisa si está bloqueada; `reportQuest` avisa de lo que desbloquea |
| `src/components/CreateQuestModal.tsx` | `<RecurrenceField>` y `<RequiresField>` |
| `src/components/QuestCard.tsx` | `↻` en las que se repiten sin ser repetibles; tarjeta bloqueada con candado |
| `src/components/QuestDetail.tsx` | «Reaparece tras…»; sección «Requisitos»; botón «Bloqueada» |
| `src/App.tsx` | Pasa `blockers(q)` a cada tarjeta |
| `src/i18n/locales/{es,ja}.ts` | Montan `complex` |

## Dependencias

- **features/horizon** (`ui.ts`): al saltar a un requisito, pone el filtro de plazo en «Todo» para que no quede oculto. No hace falta leer su README.
- **La usan:** `editing`, `failure`, `notifications`, `temporal` y `today` (leen `model.ts`: `recurs`, `requirementMet`, `returnsAt`…).

## Estado actual

- **Última verificación:** 2026-10-06, tests y navegador (una élite editada para repetirse martes y jueves sale en «Toca hoy» y el jueves en la semana).
- **Tests:** `model.test.ts` y `src/features/today/model.test.ts`.
- **Sin verificar:** la app nativa y Windows.
- **Historial:** [docs/history/verificacion/complex.md](../../../docs/history/verificacion/complex.md).

## Pendiente

- Requisito «completada N veces» o «en curso» en lugar de «una vez».
- Ver la cadena completa como un pequeño mapa de quests.
