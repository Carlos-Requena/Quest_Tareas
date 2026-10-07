---
adr: ADR-43
titulo: Deshacer como otro evento
estado: aceptada
fecha: 2026-10-06
funcionalidades: [undo]
---

# ADR-43 · Deshacer como otro evento

- **Estado:** Aceptada.
- **Registrada:** 2026-10-06 (cuando entró en el informe técnico)
- **Ámbito:** [undo](../../src/features/undo/README.md)

## Decisión

Deshacer como otro evento (`event_undone`), válido 15 minutos y solo para ciertos tipos; `project()` / `applyAll` saltan lo deshecho y deshacer recalcula todo (también el arranque si hay uno en la cola)

## Alternativas descartadas

Borrar el evento; eventos de compensación por tipo (devolver el oro, restaurar el progreso); retrasar el envío unos segundos

## Motivo

Los eventos son inmutables; una regla genérica cubre crear, editar, abandonar, retirar, encargos y agenda sin reglas por tipo; el resultado es el mismo en todos los equipos

## Consecuencias

Completar, cumplir, comprar y fallar no se deshacen (el botín se volvería a tirar); cada deshacer reproduce todo el historial (es raro); los adjuntos de un encargo retirado se borran pasada la ventana
