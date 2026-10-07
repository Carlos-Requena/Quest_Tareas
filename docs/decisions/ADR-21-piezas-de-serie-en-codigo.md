---
adr: ADR-21
titulo: Piezas de serie en el código, fuera de los eventos
estado: aceptada
fecha: 2026-10-02
funcionalidades: [armory]
---

# ADR-21 · Piezas de serie en el código, fuera de los eventos

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [armory](../../src/features/armory/README.md)

## Decisión

Piezas de serie del mercader en el código (`BUILTIN_GEAR`), sumadas al catálogo del jugador con `gearOf` / `fullCatalog`, fuera del acumulador; arte en SVG generado

## Alternativas descartadas

Crearlas con eventos en el primer arranque; un JSON en `public/`; imágenes de las series

## Motivo

Las tiene todo el que instala la app, también quien ya tenía datos; sin peso en los eventos ni en el snapshot; sin derechos de imagen

## Consecuencias

No se editan ni se retiran; nunca se borra ni se renombra una clave (las compras la nombran)
