---
adr: ADR-23
titulo: Objetivo de tipo lista y áreas conocidas que se traducen
estado: aceptada
fecha: 2026-10-02
funcionalidades: [checklist, attributes]
---

# ADR-23 · Objetivo de tipo lista y áreas conocidas que se traducen

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [checklist](../../src/features/checklist/README.md) · [attributes](../../src/features/attributes/README.md)

## Decisión

Objetivo de tipo lista con `checklist_checked` (valor por casilla) y áreas conocidas con clave `@id` para traducir los atributos

## Alternativas descartadas

Reusar `progress_added` (+1); traducir las áreas solo al pintarlas

## Motivo

Marcar dos veces en dos dispositivos cuenta una; «Salud» y «健康» suben el mismo atributo

## Consecuencias

Cambiar los sinónimos une atributos: hay que subir `PROJECTION_VERSION`
