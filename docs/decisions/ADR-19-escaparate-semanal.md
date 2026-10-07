---
adr: ADR-19
titulo: Escaparate semanal calculado con la semana como semilla
estado: aceptada
fecha: 2026-10-02
funcionalidades: [merchant]
---

# ADR-19 · Escaparate semanal calculado con la semana como semilla

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [merchant](../../src/features/merchant/README.md)

## Decisión

Escaparate semanal calculado con la semana como semilla: 5 piezas más las añadidas en los últimos 7 días, sin eventos

## Alternativas descartadas

Un evento de reposición cada lunes; todo el catálogo siempre a la venta

## Motivo

Hace que comprar sea más difícil y todos los equipos ven el mismo escaparate sin sincronizar nada

## Consecuencias

Una pieza puede tardar semanas en volver (nextShowing dice cuándo); con 5 piezas o menos, todo está a la venta
