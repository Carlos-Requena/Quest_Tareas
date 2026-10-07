---
adr: ADR-44
titulo: Fallos como eventos al acabar el día de la fecha
estado: aceptada
fecha: 2026-10-06
funcionalidades: [failure]
---

# ADR-44 · Fallos como eventos al acabar el día de la fecha

- **Estado:** Aceptada.
- **Registrada:** 2026-10-06 (cuando entró en el informe técnico)
- **Ámbito:** [failure](../../src/features/failure/README.md)

## Decisión

Fallos como eventos (`quest_failed`, `temporal_failed`) que emite un vigilante al acabar el día de la fecha; lo fallido queda `done` con `failedAt`; sin coste; las quests de un encargo quemado fallan con él (no las que se repiten); se perdona lo vencido antes del 2026-10-06 (en la acción, no en la guarda)

## Alternativas descartadas

Calcularlo sin eventos con la hora; un `QuestStatus` nuevo; restar oro o XP; fallar al pasar la hora exacta

## Motivo

Sale del tablón, se apunta en la crónica y bloquea el encargo: tiene que ser igual en todos los equipos; con `done` todas las listas ya lo quitan; el propietario quiere constancia, no castigo, y margen hasta medianoche

## Consecuencias

Un requisito fallido deja de bloquear; una quest enlazada fallida bloquea su encargo (se puede desenlazar); la animación se enseña una vez en cada equipo (`quests.failSeen`)
