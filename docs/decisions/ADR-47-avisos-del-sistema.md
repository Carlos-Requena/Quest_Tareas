---
adr: ADR-47
titulo: Avisos del sistema con tauri-plugin-notification
estado: aceptada
fecha: 2026-10-06
funcionalidades: [notifications]
---

# ADR-47 · Avisos del sistema con tauri-plugin-notification

- **Estado:** Aceptada.
- **Registrada:** 2026-10-06 (cuando entró en el informe técnico)
- **Ámbito:** [notifications](../../src/features/notifications/README.md)

## Decisión

Avisos del sistema con `tauri-plugin-notification`: en iOS, programados (hasta 60, cancelados y reprogramados si cambia el plan); en el escritorio, un temporizador que avisa al momento (el plugin no programa); preferencia por equipo

## Alternativas descartadas

Notificaciones desde Rust con un temporizador propio; *push* desde un servidor; solo avisos dentro de la app

## Motivo

Sin servidor y sin abrir la CSP; en el iPhone avisan con la app cerrada, que es donde más falta hace

## Consecuencias

En el escritorio no avisan con la app cerrada; cinco permisos más en `capabilities`
