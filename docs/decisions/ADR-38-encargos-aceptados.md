---
adr: ADR-38
titulo: Encargos aceptados o sin aceptar, con quests en reserva
estado: aceptada
fecha: 2026-10-03
funcionalidades: [temporal]
---

# ADR-38 · Encargos aceptados o sin aceptar, con quests en reserva

- **Estado:** Aceptada.
- **Registrada:** 2026-10-03 (cuando entró en el informe técnico)
- **Ámbito:** [temporal](../../src/features/temporal/README.md)

## Decisión

Encargos aceptados o sin aceptar: `TemporalState.acceptedAt`, eventos `temporal_accepted` y `temporal_postponed`, y `TemporalDef.planned` al clavarlo; las quests de uno sin aceptar quedan en reserva (`QuestState.reserved`, calculado) con una guarda en `quest_accepted`; filtro Todos · Aceptados · Sin aceptar por equipo

## Alternativas descartadas

Crear las quests solo al aceptar (borradores dentro del encargo); ocultarlas solo en la interfaz, sin guarda; un estado nuevo de `QuestStatus`; un *upcaster* que añada `planned` a los antiguos

## Motivo

El propietario planifica a largo plazo y empieza los encargos más tarde; con las quests ya creadas, el formulario, los enlaces y la recompensa no cambian, y la guarda deja a todos los equipos en el mismo estado

## Consecuencias

`PROJECTION_VERSION` pasa a 8; los encargos anteriores nacen aceptados; un equipo sin actualizar ve los sin aceptar como aceptados; no se aplaza con una quest en curso
