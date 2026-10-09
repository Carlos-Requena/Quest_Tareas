---
adr: ADR-54
titulo: Copia selectiva del acumulador en dispatch (Immer) y estado que conserva su identidad
estado: aceptada
fecha: 2026-10-09
funcionalidades: [snapshot]
---

# ADR-54 · Copia selectiva del acumulador en dispatch (Immer) y estado que conserva su identidad

- **Estado:** Aceptada. Sustituye la parte de [ADR-16](ADR-16-snapshot.md) que copiaba el acumulador entero en cada `dispatch`.
- **Registrada:** 2026-10-09
- **Ámbito:** [snapshot](../../src/features/snapshot/README.md)

## Decisión

`dispatch` aplica el evento nuevo con `applyNext` (`features/snapshot/model.ts`): `applyEvent` escribe sobre un **borrador de Immer** y solo se copian las quests, encargos, objetos… que el evento toca; lo demás se comparte con el acumulador anterior. Lo que se deriva entre entidades (el encargo de cada quest, la reserva y el valor de los encargos) se calcula leyendo (`pendingSettle`) y solo se escribe lo que difiere (`applySettle`). `viewProjection(acc, prev)` reutiliza las partes del `GameState` anterior que no cambian; si un evento no cambia nada, el estado es el mismo objeto.

En la interfaz, las listas grandes van con `memo` (tarjetas del tablón, filas de «Mi día», fichas de la semana, calaveras) y `App` separa en piezas con `memo` lo que no depende del tablón.

## Alternativas descartadas

Seguir con `structuredClone` del acumulador entero: cuesta O(estado) en cada clic (2,6 ms con un año de uso, 12 ms con tres) y, sobre todo, todo el estado sale nuevo y React vuelve a pintar todos los componentes conectados al store, aunque el evento no cambie nada. Actualizaciones inmutables a mano en cada `case` y en cada `apply*Event`: obliga a tocar todos los modelos y es fácil equivocarse. Mutative u otra biblioteca más rápida: Immer basta (≈0,2 ms por evento con un año de uso) y es la más probada.

## Motivo

Medido en el tablón con un año de uso simulado (Chromium, build de producción): de 657 componentes repintados y ~18 ms por clic a 0 componentes y 0,3 ms con un evento que no cambia nada, y a ~5 ms al aceptar una quest; en la semana del calendario, de ~100 ms a ~7 ms. Las cifras y cómo se midieron están en [docs/history/verificacion/snapshot.md](../history/verificacion/snapshot.md).

## Consecuencias

El acumulador anterior nunca se modifica: los tests lo congelan a fondo antes de cada `applyNext` (`snapshot.test.ts`). Nada fuera de `applyEvent`/`applySettle` puede escribir en el estado, y `finishProjection` (que sí escribe) solo se llama sobre acumuladores recién reproducidos. Una lista nueva con muchos elementos debe ir con `memo` y props estables, o volverá a repintarse entera. Immer suma unos 5 KB comprimidos al bundle.

Al hacerlo salió una diferencia que ya existía: el valor de un encargo cumplido o quemado dependía de si se había asentado antes (evento a evento) o no (reproduciendo todo). Ahora se fija al cerrarlo (`fixValue` en `projection.ts`), con `PROJECTION_VERSION` 14.
