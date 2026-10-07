---
adr: ADR-10
titulo: Imagen de los objetos reducida dentro del evento
estado: aceptada
fecha: 2026-10-02
funcionalidades: [items, merchant]
---

# ADR-10 · Imagen de los objetos reducida dentro del evento

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [items](../../src/features/items/README.md) · [merchant](../../src/features/merchant/README.md)

## Decisión

Imagen de los objetos reducida a 160 px y guardada como data URL en el evento

## Alternativas descartadas

Ficheros en la carpeta de la app (plugin `fs`); imagen original

## Motivo

Se sincroniza con los demás eventos, sin plugin ni permisos nuevos

## Consecuencias

3–30 KB por imagen dentro de SQLite; si se cambia mucho, valorar snapshots
