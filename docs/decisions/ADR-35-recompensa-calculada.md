---
adr: ADR-35
titulo: Recompensa calculada por objetivos y categoría
estado: aceptada
fecha: 2026-10-03
funcionalidades: [rewards]
---

# ADR-35 · Recompensa calculada por objetivos y categoría

- **Estado:** Aceptada.
- **Registrada:** 2026-10-03 (cuando entró en el informe técnico)
- **Ámbito:** [rewards](../../src/features/rewards/README.md)

## Decisión

Recompensa calculada: la XP y el oro de una quest salen de sus objetivos (minutos de pomodoro, √ de la cantidad, casillas) por el peso de su categoría, y la de un encargo, de sus calaveras más un bono sobre sus quests enlazadas. La proyección los aplica en `quest_created` y en `finishProjection`; el oro, calibrado para comprar a menudo (unos 6.500 G en un día bueno)

## Alternativas descartadas

Recompensa sugerida y editable; recalcular solo al reportar; bajar los precios del mercader

## Motivo

El propietario quiere que cada objetivo aporte lo suyo, que nadie se infle la recompensa y comprar a menudo sin abaratar el catálogo; en la proyección, todas las pantallas enseñan la misma cifra

## Consecuencias

`PROJECTION_VERSION` pasa a 5; lo ganado no cambia porque va copiado en `quest_completed` y `temporal_completed`; un equipo sin actualizar sigue usando la recompensa guardada en la definición hasta actualizarse
