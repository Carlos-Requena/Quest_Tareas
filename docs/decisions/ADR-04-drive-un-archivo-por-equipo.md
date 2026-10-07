---
adr: ADR-04
titulo: Google Drive como canal de sincronización, un archivo por equipo
estado: aceptada
fecha: 2026-10-02
funcionalidades: [sync]
---

# ADR-04 · Google Drive como canal de sincronización, un archivo por equipo

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [sync](../../src/features/sync/README.md)

## Decisión

Google Drive como canal de sync, un fichero por dispositivo

## Alternativas descartadas

Replicación MySQL, SQLite dentro de una carpeta de Drive

## Motivo

MySQL exige servidores siempre conectados; un SQLite compartido se corrompe con dos escritores

## Consecuencias

OAuth propio y app de Google Cloud en modo producción
