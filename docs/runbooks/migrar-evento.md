# Añadir un evento o cambiar uno que ya existe

Los eventos guardados son inmutables y viajan a otros equipos ([AGENTES §5.1](../AGENTES.md#51-event-sourcing)). Este runbook dice qué tocar en cada caso para no romper los datos del propietario ni el snapshot.

## ¿Qué cambio es?

| Cambio | `EVENT_VERSION` | `PROJECTION_VERSION` | Upcaster |
|---|---|---|---|
| Un **tipo de evento nuevo** | No | Sí, si añade un campo al acumulador o cambia lo que dan eventos ya guardados (ejemplo: la agenda la subió a 9 porque el acumulador ganó `agenda`) | No |
| Un **campo opcional nuevo** en un evento o en `QuestDef` cuyo valor ausente es el comportamiento de antes | No | Solo si cambia el resultado de los eventos guardados | No: se lee con su valor por defecto (ejemplo: `TemporalDef.planned`) |
| Cambiar la **forma** de un evento que ya existe (renombrar, quitar o reinterpretar un campo) | **Sí** | **Sí** | **Sí**, en `UPCASTERS` |
| Cambiar una **regla** de la proyección (un `case`, una guarda, un `apply*Event`, una fórmula que aplica `applyEvent`) | No | **Sí** | No |
| Cambiar solo `finishProjection` (curva de niveles, lo calculado sobre el conjunto) | No | No: se ejecuta en cada arranque | No |

## Un tipo de evento nuevo

Ejemplo real: `checklist_checked`.

1. **Declararlo en su funcionalidad**, `src/features/<nombre>/events.ts`:

   ```ts
   export type ChecklistEventBody = {
     type: "checklist_checked";
     questId: string;
     conditionId: string;
     itemId: string;
     done: boolean; // un valor por casilla, no un +1: dos equipos que marcan la misma no suman dos
   };
   ```

   Prefiere deltas o valores por elemento a valores absolutos del conjunto, y copia en el evento lo que no debe cambiar después.
2. **Sumarlo a la unión** `EventBody` de `src/domain/events.ts` (importando solo el tipo).
3. **Aplicarlo en la proyección**: un `case` en `applyEvent` (`src/domain/projection.ts`), o un `apply<Nombre>Event` en el `model.ts` de la funcionalidad, **con su guarda** (¿existe?, ¿está en el estado que lo permite?, ¿llega el oro?). Lo que pueda cambiar al fusionar con otro equipo (el escaparate de la semana, el rango) se comprueba en la acción, no en la guarda.
4. **La acción** en `actions.ts`: valida, avisa si no se puede y llama a `dispatch`. Nunca construyas el `ts`.
5. **Tests**: guardas con marcas de tiempo fijas, el mismo estado con los eventos en otro orden y, si toca dinero o XP, que no se duplique entre equipos. **Añádelo a `randomStream`** (`src/test/streams.ts`), también con casos imposibles: los invariantes de `projection.test.ts` y del snapshot corren sobre esos historiales.
6. **¿Deshacer?** Si tiene sentido deshacerlo unos minutos, añádelo a `UNDOABLE` (`src/features/undo/model.ts`). Lo que reparte botín o dinero no se deshace.
7. **Documentación**: el evento en `eventos:` del frontmatter y en la sección «Eventos» del README de su funcionalidad; `pnpm docs:index` (la tabla de eventos de [INDEX.md](../INDEX.md#eventos--funcionalidad) sale del código). Si cambia el modelo, [redibuja el diagrama de clases](redibujar-diagramas.md).

## Cambiar la forma de un evento que ya existe

1. Sube `EVENT_VERSION` (`src/domain/events.ts`).
2. Añade el paso en `UPCASTERS` (`src/domain/upcast.ts`): `UPCASTERS[n]` convierte un evento de la versión `n` a la `n + 1`, sin tocar el original. El test comprueba que hay uno por versión.

   ```ts
   export const UPCASTERS: readonly Step[] = [
     (e) => e,                       // 0 → 1: mismo formato; solo empieza a llevar `v`
     (e) => e.type === "x" ? { ...e, nuevo: e.viejo } : e,   // 1 → 2: lo que cambie
   ];
   ```

3. Sube `PROJECTION_VERSION` (`src/domain/projection.ts`).
4. Prueba con datos antiguos: `randomStream` ya mezcla eventos sin `v`, de la versión actual y de una futura. Además, carga datos reales de la versión anterior (de `main`) en el navegador y comprueba que se ven igual.
5. Explica la conversión en la sección «Eventos» del README de la funcionalidad.

Un equipo sin actualizar **ignora** los eventos de una versión más nueva (`isFromFuture`) hasta que se actualice; al actualizarse, `PROJECTION_VERSION` habrá subido, el snapshot se descarta y se aplican.

**Formatos de antes de versionar:** los convierten por su forma los `legacy.ts` (`features/pomodoro/legacy.ts`, `features/items/legacy.ts`). No añadas conversiones por forma nuevas: usa `UPCASTERS`.

## Cambiar una regla de la proyección

Sube `PROJECTION_VERSION`. Si se te olvida, en desarrollo cada arranque desde un snapshot se compara con la proyección completa y avisa en la consola, y los tests de snapshot + cola fallan; pero en la app nativa del propietario se arrancaría con el estado viejo. Detalle en [features/snapshot](../../src/features/snapshot/README.md).

## Antes de terminar

- `npx tsc --noEmit`, `pnpm test`, `pnpm build` y `pnpm docs:check`.
- En el navegador: el flujo nuevo y un arranque con datos de antes del cambio ([verificar-ui.md](verificar-ui.md)).
- Si el cambio llega a otros equipos, piensa qué ve un equipo **sin actualizar** y dilo en el README.
