---
adr: ADR-36
titulo: Coleccionables únicos y uno a la venta cada semana
estado: aceptada
fecha: 2026-10-03
funcionalidades: [collectibles, items]
---

# ADR-36 · Coleccionables únicos y uno a la venta cada semana

- **Estado:** Aceptada.
- **Registrada:** 2026-10-03 (cuando entró en el informe técnico)
- **Ámbito:** [collectibles](../../src/features/collectibles/README.md) · [items](../../src/features/items/README.md)

## Decisión

Coleccionables únicos (los objetos de cofre: un repetido se quema) y uno a la venta cada semana en la ventana de Hu Tao: mítico o superior, que no tienes, a 1,5 veces el precio del equipo de su rareza, sin rango y uno por semana; la oferta se calcula con la semana como semilla y cambia si te sale la ofrecida en un cofre. `ItemDef.kind` pasa a 8 tipos fijos, las secciones del almanaque

## Alternativas descartadas

Comprarlos en la ventana de objetos; una oferta fija hasta conseguirla; requisito de rango; un evento de reposición; mantener los repetidos; tipo libre con secciones por texto

## Motivo

El propietario: «si tienes uno, tienes uno», se compra a la mercader, semanal y sin rango, mítico como mínimo, y secciones por tipo fijo; calcular la oferta evita sincronizarla

## Consecuencias

`PROJECTION_VERSION` pasa a 7 y los repetidos que había desaparecen; `PlayerState.collectiblesBought` apunta cuándo se compró cada uno; los textos antiguos se clasifican con palabras clave (lo que no encaja, en «otros»)
