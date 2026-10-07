---
adr: ADR-18
titulo: Mercader con catálogo propio y precio calculado
estado: aceptada
fecha: 2026-10-02
funcionalidades: [merchant]
---

# ADR-18 · Mercader con catálogo propio y precio calculado

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [merchant](../../src/features/merchant/README.md)

## Decisión

Mercader con catálogo propio (GearDef); el precio y el rango salen de la rareza, gear_purchased copia el precio y la proyección solo vigila el oro

## Alternativas descartadas

Vender objetos del almanaque; precio elegido por el usuario; comprobar el escaparate y el rango en la proyección

## Motivo

El propietario quiere que comprar cueste y añadir mercancía sin poner precio; un mismo oro gastado en dos dispositivos sin conexión solo vale una vez

## Consecuencias

Cambiar los precios no altera lo pagado; el escaparate y el rango se comprueban en la acción
