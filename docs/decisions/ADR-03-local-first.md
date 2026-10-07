---
adr: ADR-03
titulo: SQLite local como fuente de verdad (local-first)
estado: aceptada
fecha: 2026-10-02
funcionalidades: []
---

# ADR-03 · SQLite local como fuente de verdad (local-first)

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** Transversal

## Decisión

SQLite local como fuente de verdad (local-first)

## Alternativas descartadas

Base de datos remota, Supabase

## Motivo

Funciona sin conexión, sin coste ni servidor

## Consecuencias

La sincronización es responsabilidad de la app
