---
funcionalidad: checklist
titulo: Objetivo de tipo lista
resumen: Tercer tipo de objetivo, junto al contador y al pomodoro, con casillas que se marcan una a una.
tipo: dominio
eventos: [checklist_checked]
preferencias: []
adr: [ADR-23]
---

# Objetivo de tipo lista

Una **lista de casillas** como objetivo de una quest («Hacer la maleta: pasaporte, cargador, JR Pass, adaptador»). Se cumple con todas marcadas.

## Qué hace

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Un objetivo de tipo lista | `ChecklistConditionDef` (`kind: "checklist"`, `items`) en la unión `ConditionDef` |
| R2 | Marcar y desmarcar casillas con la quest en curso | Evento `checklist_checked`; casillas en el detalle (`ChecklistCondition`) |
| R3 | Crearla cómodamente | «+ Añadir lista» en el formulario; `Enter` añade otra casilla (`ChecklistInputs`) |

## Reglas y decisiones

- **Un valor por casilla, no un +1**: `checklist_checked { itemId, done }`. Si dos equipos marcan la misma casilla, queda marcada una vez ([ADR-23](../../../docs/decisions/ADR-23-listas-y-areas-conocidas.md)).
- **Las marcadas van en `QuestState.checked`** (id de condición → ids marcados) y se vacían al aceptar, abandonar o completar, como el progreso de los contadores.
- **`target` = número de casillas**: lo fija `cleanChecklist` al crear la quest (sin casillas vacías ni repetidas, como mucho 20 de 80 caracteres). Así `conditionProgress` y `conditionsMet` valen igual para los tres tipos.
- **Atajo `+`**: avanza el primer objetivo incompleto: +1 a un contador o la siguiente casilla de una lista (`bumpNext`).
- Cada casilla aporta su parte de la recompensa (valores en [rewards](../rewards/README.md)).

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `checklist_checked` | `questId`, `conditionId`, `itemId`, `done` | Marca o desmarca la casilla | Quest activa, condición de tipo lista y casilla existente |

`progress_added` sobre una lista se ignora: solo los contadores avanzan con +1.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `ChecklistConditionDef`, `ChecklistItem`, `Checked`, `cleanChecklist`, `applyCheck`, `checklistProgress`, `nextUnchecked`. Puro |
| `events.ts` | `ChecklistEventBody` |
| `actions.ts` | `toggleCheck`, `checkNext` |
| `components/ChecklistCondition.tsx` | Las casillas en el detalle (rombo con su ✓ animado; tachado al marcar) |
| `components/ChecklistInputs.tsx` | Las casillas en el formulario |
| `checklist.css`, `i18n.ts` | Estilos y textos es + ja |
| `model.test.ts` | Limpieza, marcar dos veces cuenta una, solo en curso, aceptar o abandonar las vacía |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/types.ts` | `ConditionDef` incluye la lista; `isCountCondition`; `QuestState.checked` |
| `src/domain/events.ts` | `ChecklistEventBody` en la unión |
| `src/domain/projection.ts` | `cleanChecklist` al crear; `checked` se vacía al aceptar, abandonar y completar; `case "checklist_checked"`; `conditionProgress` cuenta las casillas; `progress_added` solo para contadores |
| `src/store/actions.ts` | `addProgress` solo con contadores; `bumpNext` también marca casillas |
| `src/components/CreateQuestModal.tsx` | Borrador de tipo `checklist` y «+ Añadir lista» |
| `src/components/QuestDetail.tsx` | `<ChecklistCondition />` |
| `src/i18n/locales/{es,ja}.ts` | Montan `checklist` |
| `src/test/streams.ts` | Listas (con casillas repetidas y vacías) y `checklist_checked` en `randomStream` |

## Dependencias

- No importa otras funcionalidades.
- **La usan:** `editing` (limpia las listas al editar), `rewards` (valor por casilla) y `search` (busca en las casillas).

## Estado actual

- **Última verificación:** 2026-10-02, tests y navegador (crear una lista, marcar con el ratón y con `+`, reportar con 4/4).
- **Tests:** `model.test.ts`; los invariantes de `src/domain/projection.test.ts` corren sobre historiales con listas.
- **Sin verificar:** la app nativa y Windows.
- **Historial:** [docs/history/verificacion/checklist.md](../../../docs/history/verificacion/checklist.md).

## Pendiente

- Reordenar casillas arrastrándolas.
- Casillas opcionales (que no cuenten para cumplirla).
