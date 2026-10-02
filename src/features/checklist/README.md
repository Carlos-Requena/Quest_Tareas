# Objetivo de tipo lista

Un tercer tipo de objetivo, junto al **contador** y al **pomodoro**: una **lista de casillas** que se marcan una a una («Hacer la maleta: pasaporte, cargador, JR Pass, adaptador»). Se cumple con todas marcadas.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Un objetivo tipo lista | `ChecklistConditionDef` (`kind: "checklist"`, `items`) en la unión `ConditionDef` |
| R2 | Marcar y desmarcar casillas con la quest en curso | Evento `checklist_checked`; casillas en el detalle (`ChecklistCondition`) |
| R3 | Crearla cómodamente | «+ Añadir lista» en el formulario; Enter añade otra casilla (`ChecklistInputs`) |

---

## Decisiones de diseño

- **Un valor por casilla, no un +1**: `checklist_checked { itemId, done }`. Si dos dispositivos marcan la misma casilla, queda marcada una vez (con +1 contaría dos).
- **Las casillas marcadas van en `QuestState.checked`** (id de condición → ids marcados) y se vacían al aceptar, abandonar o completar, como el progreso de los contadores.
- **`target` = número de casillas**: lo fija `cleanChecklist` al crear la quest (sin casillas vacías ni repetidas, como mucho 20 de 80 caracteres). Así `conditionProgress` y `conditionsMet` funcionan igual para los tres tipos.
- **Guardas**: `checklist_checked` solo cuenta con la quest en curso, en una condición de tipo lista y con una casilla que exista. `progress_added` sobre una lista se ignora (solo los contadores avanzan con +1).
- **Atajo `+`**: avanza el primer objetivo incompleto: +1 a un contador o la siguiente casilla de una lista (`bumpNext`).

---

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `checklist_checked` | `questId`, `conditionId`, `itemId`, `done` | Marca o desmarca la casilla | Quest activa, condición de tipo lista, casilla existente |

Es un evento nuevo, sin datos antiguos que convertir. `PROJECTION_VERSION` pasa a 3 (junto con las rachas y la crónica).

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `ChecklistConditionDef`, `ChecklistItem`, `Checked`, `cleanChecklist`, `applyCheck`, `checklistProgress`, `nextUnchecked`. Puro |
| `events.ts` | `ChecklistEventBody` |
| `actions.ts` | `toggleCheck`, `checkNext` |
| `components/ChecklistCondition.tsx` | Las casillas en el detalle (rombo con su ✓ animado; tachado al marcar) |
| `components/ChecklistInputs.tsx` | Las casillas en el formulario |
| `checklist.css`, `i18n.ts` | Estilos y textos es + ja |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `domain/types.ts` | `ConditionDef` incluye la lista; `isCountCondition`; `QuestState.checked` |
| `domain/events.ts` | `ChecklistEventBody` en la unión |
| `domain/projection.ts` | `cleanChecklist` al crear; `checked` se vacía al aceptar, abandonar y completar; `case "checklist_checked"`; `conditionProgress` cuenta las casillas; `progress_added` solo para contadores |
| `store/actions.ts` | `addProgress` solo con contadores; `bumpNext` también marca casillas |
| `components/CreateQuestModal.tsx` | Borrador de tipo `checklist` y «+ Añadir lista» |
| `components/QuestDetail.tsx` | `<ChecklistCondition />` |
| `i18n/locales/{es,ja}.ts` | Montan `checklist` |
| `test/streams.ts` | Listas (con casillas repetidas y vacías) y `checklist_checked` en `randomStream` |

## Verificación

Hecho el 2026-10-02:

- **Tests** (`model.test.ts`): limpieza de casillas, marcar dos veces cuenta una, solo con la quest en curso, aceptar o abandonar las vacía, con todas marcadas se puede reportar y un +1 no la cuenta. Las invariantes de `domain/projection.test.ts` corren sobre historiales con listas.
- **Navegador**: crear una quest con una lista (Enter añade casilla y pone el cursor en ella), marcar casillas con el ratón y con `+`, el botón «Reportar» se enciende con 4/4.

## Posibles mejoras

- Reordenar casillas arrastrándolas.
- Casillas opcionales (que no cuenten para cumplirla).
