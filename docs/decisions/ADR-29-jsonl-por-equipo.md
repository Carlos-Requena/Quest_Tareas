---
adr: ADR-29
titulo: Un JSONL por equipo y binarios por SHA-256 en Drive
estado: aceptada
fecha: 2026-10-02
funcionalidades: [sync]
---

# ADR-29 · Un JSONL por equipo y binarios por SHA-256 en Drive

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [sync](../../src/features/sync/README.md)

## Decisión

Un JSONL por equipo con todos sus eventos, reescrito entero cuando hay novedades; los demás lo bajan si cambió su version de Drive (cursor en meta); binarios uno por archivo por SHA-256, solo los que se usan

## Alternativas descartadas

Un archivo por evento; añadir al final; sincronizar toda la tabla blobs

## Motivo

Drive no permite añadir a un archivo y miles de archivos serían miles de peticiones; un solo escritor por archivo evita conflictos

## Consecuencias

Cada subida reescribe el archivo del equipo (unos KB o MB); los binarios que dejan de usarse se quedan en Drive
