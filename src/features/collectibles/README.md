---
funcionalidad: collectibles
titulo: Coleccionable de la semana
resumen: Hu Tao vende cada semana un coleccionable de cofre mítico o superior que no tienes, caro y sin requisito de rango.
tipo: dominio
eventos: [collectible_purchased]
preferencias: []
adr: [ADR-36]
---

# Coleccionable de la semana

Los **coleccionables** son los objetos del almanaque que salen en los cofres (`ItemDef.droppable`): se tienen o no se tienen, y un repetido se quema (reglas en [items](../items/README.md)). Si uno no te sale, **Hu Tao lo vende**: en su ventana, la pestaña **«Coleccionable»** ofrece uno **cada semana**, de rareza **mítica o superior**. También se ve en el [menú](../menu/README.md) («Weekly Rarity»).

## Qué hace

Lo que pidió el propietario:

- Coleccionable = objeto de cofre.
- Se pueden comprar por si no te salen, pero **solo un producto a la vez**, **mítico como mínimo** y **solo si no lo tienes**.
- Si te toca en un cofre el que está a la venta, se cambia por **otro al azar**.
- **Se compran a Hu Tao**, que es la mercader; el almanaque solo sirve para mirar.
- **Semanal** y **sin requisito de rango**: solo hace falta el oro.
- Precio: el de una pieza de equipo de esa rareza **más un 50 %**.

| Regla | Valor |
|---|---|
| Qué se vende | Coleccionables míticos o legendarios que no tienes (`offerable`) |
| Cuántos | Uno por semana (`collectibleOffer`), de lunes a domingo, hora local |
| Si lo compras | Queda vendido hasta el lunes |
| Si te sale en un cofre antes de comprarlo | Hu Tao trae otro esa misma semana |
| Precio | `PRICES[rareza] × 1,5` (`COLLECTIBLE_SURCHARGE`), redondeado como en la tienda: **68.000 G** mítico, **150.000 G** legendario |
| Rango | Ninguno |

## Reglas y decisiones

- **La oferta se calcula, no se guarda.** Los candidatos se ordenan con un hash de la semana y su id (`weekKey` del mercader + FNV-1a) y se ofrece el primero que no tienes. Todos los equipos ven la misma oferta sin sincronizar nada y cambia sola cada lunes, como el escaparate ([ADR-36](../../../docs/decisions/ADR-36-coleccionables-unicos.md)).
- **Conseguir otro coleccionable no cambia la oferta; conseguir el ofrecido, sí**: deja de ser candidato y sale el siguiente de esa semana.
- **Uno por semana**: la proyección apunta cuándo se compró cada coleccionable (`ItemsAcc.bought`, `PlayerState.collectiblesBought`). Si hay una compra esta semana, la oferta es esa, vendida. Si dos equipos compran sin conexión, se enseña la última.
- **El precio va copiado en el evento**: cambiar `PRICES` no altera lo pagado.
- **La proyección solo vigila lo que no cambia al fusionar**: que exista, que sea coleccionable mítico o superior, que no lo tengas y que llegue el oro. Que sea la oferta de esta semana y que no hayas comprado otro se comprueban en la acción (`offerBlocker`). Si dos equipos compran el mismo sin conexión, solo paga el primero.
- Descartado: una pestaña en la ventana de objetos (se compra a la mercader), una oferta fija hasta conseguirla (la quiere semanal), requisito de rango (lo quitó) y un evento de reposición (habría que sincronizarlo y decidir quién lo emite).
- Rareza mínima y recargo: `OFFER_MIN_RARITY` y `COLLECTIBLE_SURCHARGE`. No se cambian sin preguntar al propietario.

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `collectible_purchased` | `itemId`, `price` (copiado) | Resta el oro, añade el objeto a la colección (`inventory = 1`, `discovered`), apunta cuándo se compró (`bought`) y una compra en la crónica (`collectible: true`) | Coleccionable mítico o superior, no lo tienes, `price ≥ 0` y oro suficiente en ese punto del historial |

## Interfaz

En la ventana de Hu Tao, con su confirmación en dos pasos, su sello de vendido y sus frases (`merchant.lines.rare`, `soldOut`, `noRare`). `Enter` compra en esa pestaña.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `offerable`, `collectibleOffer`, `collectiblePrice`, `offerBlocker`, `applyCollectibleEvent`, `OFFER_MIN_RARITY`, `COLLECTIBLE_SURCHARGE`. Puro |
| `events.ts` | `CollectibleEventBody` |
| `actions.ts` | `currentOffer`, `whyNotBuyCollectible`, `buyCollectible` |
| `components/OfferPanel.tsx` | La pestaña «Coleccionable» de la tienda |
| `collectibles.css`, `i18n.ts` | Estilos y textos es + ja |
| `model.test.ts` | Precio, la oferta, vendida hasta el lunes, guardas, doble compra entre equipos y repetido quemado |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/events.ts` | `CollectibleEventBody` en la unión |
| `src/domain/projection.ts` | `case "collectible_purchased"` con `applyCollectibleEvent`, el gasto de oro y la crónica; `PlayerState.collectiblesBought` |
| `src/domain/types.ts` | `PlayerState.collectiblesBought` |
| `src/features/items/model.ts` | `ItemsAcc.bought` |
| `src/features/merchant/model.ts` | `shopRound` y `weekKey` exportados |
| `src/features/merchant/components/MerchantModal.tsx` | Pestaña `collectible` con `OfferPanel` |
| `src/features/merchant/ui.ts` | `MerchantTab` suma `"collectible"` |
| `src/features/chronicle/model.ts` | `PurchaseEntry.collectible` y sus frases |
| `src/i18n/locales/{es,ja}.ts` | Montan `collectibles` |
| `src/test/streams.ts` | `collectible_purchased` en `randomStream` |

## Dependencias

- **features/items** (`model.ts`, `ItemTile`): los coleccionables, su rareza y su cromo. Para cambiar las reglas de los cofres, lee su README.
- **features/merchant** (`model.ts`: `PRICES`, `weekKey`, `shopRound`): el precio base y la semana. Para tocar la tienda, lee su README.
- **La usan:** `merchant` (la pestaña), `menu` («Weekly Rarity»).

## Estado actual

- **Última verificación:** 2026-10-03, tests y navegador en la ventana de Hu Tao a 402 × 874, 1.024 y 1.300 px.
- **Tests:** `model.test.ts` y `src/store/game.test.ts` (solo se compra la de la semana, con nivel 1 si llega el oro).
- **Sin verificar:** la compra desde la interfaz tras moverla a la ventana de Hu Tao (la cubren los tests del store), la app nativa y el sonido.
- **Historial:** [docs/history/verificacion/collectibles.md](../../../docs/history/verificacion/collectibles.md).
