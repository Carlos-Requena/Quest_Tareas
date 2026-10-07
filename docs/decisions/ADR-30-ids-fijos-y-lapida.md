---
adr: ADR-30
titulo: Datos de ejemplo con ids fijos y lápida de las quests retiradas
estado: aceptada
fecha: 2026-10-02
funcionalidades: [sync]
---

# ADR-30 · Datos de ejemplo con ids fijos y lápida de las quests retiradas

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [sync](../../src/features/sync/README.md)

## Decisión

Datos de ejemplo con ids fijos y lápida de quests retiradas (ProjectionAcc.deletedQuests)

## Alternativas descartadas

Ids aleatorios; no crear ejemplos si hay sincronización

## Motivo

Dos equipos que arrancan vacíos los tendrían duplicados, y uno que se instala tarde devolvería los ya retirados

## Consecuencias

PROJECTION_VERSION pasa a 4; un id de quest retirado no se puede volver a crear
