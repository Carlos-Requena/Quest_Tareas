---
adr: ADR-48
titulo: Alta rápida de una línea y búsqueda sin tildes
estado: aceptada
fecha: 2026-10-06
funcionalidades: [quickadd, search]
---

# ADR-48 · Alta rápida de una línea y búsqueda sin tildes

- **Estado:** Aceptada.
- **Registrada:** 2026-10-06 (cuando entró en el informe técnico)
- **Ámbito:** [quickadd](../../src/features/quickadd/README.md) · [search](../../src/features/search/README.md)

## Decisión

Alta rápida de una línea con marcas (`mañana`, `lunes`, `12/10`, `#área`, `@quién`, `!`, `x3`) y búsqueda sin tildes ni distinción de kana; sin eventos propios

## Alternativas descartadas

Un formulario corto; reconocimiento de fechas en lenguaje natural completo; buscar solo en títulos

## Motivo

Apuntar algo tiene que costar segundos; marcas sencillas y previsibles en español y japonés

## Consecuencias

Una quest rápida lleva un objetivo «Hacerlo ×N»; el resto se completa editándola
