---
adr: ADR-15
titulo: Plazos calculados con la hora actual
estado: aceptada
fecha: 2026-10-02
funcionalidades: [horizon]
---

# ADR-15 · Plazos calculados con la hora actual

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [horizon](../../src/features/horizon/README.md)

## Decisión

Plazos calculados con la hora actual (`horizonOf`), excluyentes y con «1 mes» (de 15 a 30 días) para no dejar huecos; fecha límite opcional en `QuestDef`

## Alternativas descartadas

Guardar el plazo en un evento; plazos acumulativos; solo los cuatro plazos pedidos

## Motivo

Cambia solo con el paso del tiempo, sin eventos; cada fecha cae en un plazo y los contadores suman el total

## Consecuencias

Una quest sin fecha propia ni encargo sale en «sin fecha»; las que se repiten no tienen fecha límite
