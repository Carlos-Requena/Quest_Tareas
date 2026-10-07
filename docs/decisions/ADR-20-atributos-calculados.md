---
adr: ADR-20
titulo: Atributos calculados de quest_completed y muñeco en SVG
estado: aceptada
fecha: 2026-10-02
funcionalidades: [attributes, equipment]
---

# ADR-20 · Atributos calculados de quest_completed y muñeco en SVG

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [attributes](../../src/features/attributes/README.md) · [equipment](../../src/features/equipment/README.md)

## Decisión

Atributos calculados en la proyección a partir de quest_completed y el área de la quest; muñeco dibujado en SVG, una forma por ranura con el color de la rareza

## Alternativas descartadas

Eventos propios de atributos; pegar la imagen de cada pieza sobre el muñeco

## Motivo

Sin datos nuevos y retroactivo para lo ya completado; las imágenes del usuario no encajan en un cuerpo

## Consecuencias

Las áreas se normalizan (mayúsculas y espacios); la imagen de cada pieza se ve en su ranura, no sobre el cuerpo
