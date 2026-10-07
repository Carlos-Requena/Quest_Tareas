---
adr: ADR-11
titulo: Adjuntos en un almacén de binarios por SHA-256
estado: ampliada
por: [ADR-29]
fecha: 2026-10-02
funcionalidades: [temporal, merchant, menu, sync]
---

# ADR-11 · Adjuntos en un almacén de binarios por SHA-256

- **Estado:** Ampliada por [ADR-29](ADR-29-jsonl-por-equipo.md). La sincronización de binarios que esta decisión dejaba para la fase 2 se hizo en ADR-29 (un archivo por binario en Drive). Hoy comparten el almacén los encargos, el mercader y los personajes del menú.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [temporal](../../src/features/temporal/README.md) · [merchant](../../src/features/merchant/README.md) · [menu](../../src/features/menu/README.md) · [sync](../../src/features/sync/README.md)

## Decisión

Adjuntos (PDF e imágenes de hasta 20 MB) en un almacén de binarios aparte, por su SHA-256: tabla `blobs` en SQLite e IndexedDB en el navegador; en el evento, solo la referencia y una miniatura de 320 px

## Alternativas descartadas

El archivo dentro del evento como ADR-10; plugin `fs`; IndexedDB también en la app nativa

## Motivo

Un PDF de varios MB se leería en cada arranque y no cabe en `localStorage`; la misma conexión SQLite evita plugins y permisos nuevos; el hash evita duplicados entre dispositivos

## Consecuencias

La fase 2 tendrá que sincronizar binarios además de eventos; un dispositivo puede ver la referencia antes que el archivo («no está en este equipo»)
