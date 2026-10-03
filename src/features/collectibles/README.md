# Coleccionable de la semana

Los **coleccionables** son los objetos del almanaque que salen en los cofres (`ItemDef.droppable`). Se tienen o no se tienen: un repetido se quema. Si uno no te sale, **Hu Tao lo vende**: en su ventana, la pestaña **«Coleccionable»** tiene uno a la venta **cada semana**, de rareza **mítica o superior**, y caro.

Funcionalidad de dominio con un evento propio (`collectible_purchased`). Las reglas de los coleccionables (únicos, repetidos quemados, tipos fijos) están en [../items/README.md](../items/README.md).

## Requisitos (del propietario)

- Coleccionable = objeto de cofre.
- Se pueden comprar por si no te salen, pero **solo un producto a la vez**, de calidad **mítica como mínimo**, y **solo si no lo tienes**.
- Si te toca en un cofre el que está a la venta, se cambia por **otro al azar**.
- **Se compran a Hu Tao**, porque es la mercader. El almanaque solo sirve para ver lo que llevas.
- **Semanal**: el coleccionable a la venta cambia cada semana.
- **Sin requisito de rango**: solo hace falta el oro.
- Precio: el de una pieza de equipo de esa rareza **más un 50 %**. Tiene que seguir costando.

## Reglas

| Regla | Valor |
|---|---|
| Qué se vende | Coleccionables míticos o legendarios que no tienes (`offerable`) |
| Cuántos | Uno por semana (`collectibleOffer`), de lunes a domingo, hora local |
| Si lo compras | Queda vendido hasta el lunes |
| Si te sale en un cofre antes de comprarlo | Hu Tao trae otro esa misma semana |
| Precio | `PRICES[rareza] × 1,5`, redondeado como en la tienda: **68.000 G** mítico, **150.000 G** legendario |
| Rango | Ninguno |

## Decisiones

- **La oferta se calcula, no se guarda.** Los candidatos se ordenan con un hash de la semana y su id (`weekKey` del mercader + FNV-1a) y se ofrece el primero que no tienes. Todos los equipos ven la misma oferta sin sincronizar nada, cambia sola cada lunes y no hay eventos de «reposición». Es la misma idea que el escaparate de Hu Tao (ADR-19).
- **Conseguir otro coleccionable no cambia la oferta; conseguir el ofrecido, sí**: deja de ser candidato y sale el siguiente del orden de esa semana.
- **Uno por semana** (decisión mía, por «semanal» y por «comprar tiene que costar»): la proyección apunta cuándo se compró cada coleccionable (`ItemsAcc.bought`, `PlayerState.collectiblesBought`). Si hay una compra esta semana, la oferta es esa, vendida. Si dos equipos compran sin conexión, se enseña la última.
- **El precio va copiado en el evento**, como en el mercader: cambiar `PRICES` no altera lo pagado.
- **La proyección solo vigila lo que no cambia al fusionar dispositivos:** que exista, que sea coleccionable mítico o superior, que no lo tengas y que llegue el oro. Que sea la oferta de esta semana y que no hayas comprado otro se comprueban en la acción (`offerBlocker`), igual que el escaparate del mercader. Si dos equipos compran el mismo sin conexión, solo paga el primero.
- **En la ventana de Hu Tao**, con su confirmación de dos pasos, su sello de vendido y sus frases (`merchant.lines.rare`, `soldOut`, `noRare`).
- Alternativas descartadas: una pestaña en la ventana de objetos (el propietario: se compra a la mercader); una oferta fija hasta conseguirla (la quiere semanal); requisito de rango (lo quitó); un evento de reposición (habría que sincronizarlo y decidir quién lo emite).

## Evento

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `collectible_purchased` | `itemId`, `price` (copiado) | Resta el oro, añade el objeto a la colección (`inventory = 1`, `discovered`), apunta cuándo se compró (`bought`) y una compra en la crónica (`collectible: true`) | Coleccionable mítico o superior, no lo tienes, `price ≥ 0` y oro suficiente en ese punto del historial |

Es un tipo de evento nuevo: no sube `EVENT_VERSION`. Está en `randomStream`.

## Integración

| Dónde | Qué |
|---|---|
| `domain/events.ts` | `CollectibleEventBody` en la unión |
| `domain/projection.ts` | `case "collectible_purchased"` con `applyCollectibleEvent`, el gasto de oro y la crónica; `PlayerState.collectiblesBought`; `PROJECTION_VERSION` 7 |
| `domain/types.ts` | `PlayerState.collectiblesBought` |
| `features/items/model.ts` | `ItemsAcc.bought` |
| `features/merchant/model.ts` | `shopRound` y `weekKey` exportados |
| `features/merchant/components/MerchantModal.tsx` | Pestaña `collectible` con `OfferPanel`, compra con confirmación, sello y frases de Hu Tao; Enter compra en esa pestaña |
| `features/merchant/ui.ts` | `MerchantTab` suma `"collectible"` |
| `features/merchant/i18n.ts` | `tabs.collectible` y las frases `rare`, `soldOut` y `noRare` |
| `features/chronicle` | `PurchaseEntry.collectible` y sus frases |
| `i18n/locales/{es,ja}.ts` | `collectibles` |
| `test/streams.ts` | `collectible_purchased` en `randomStream` |

## Verificación

- `model.test.ts`: precio; la oferta (solo míticos o más que no tienes, la misma en cualquier orden del catálogo y toda la semana, cambia de una semana a otra, se queda si te sale otro y cambia si te sale la ofrecida), vendida hasta el lunes, `offerBlocker` sin rango; y en la proyección la compra, las guardas, la doble compra entre dispositivos y el repetido quemado.
- `store/game.test.ts`: solo se compra la de la semana, con nivel 1 si llega el oro, y después queda vendida (otra da «soldOut»).
- En el navegador (`pnpm dev`), en la ventana de Hu Tao: tres pestañas (escaparate, coleccionable, catálogo); con dos compras de prueba esta semana, la pestaña enseña el último comprado con el sello «Vendido», la nota «el lunes trae otro» y la frase de Hu Tao; la ventana de objetos ya no tiene pestaña de compra. Cabe a 402 × 874 (pestañas en una fila), a 1.024 y a 1.300 px. La compra desde la interfaz (confirmación y sello de Hu Tao) no la repetí tras moverla, porque los datos de prueba ya tenían compra esta semana; la cubren los tests del store. Sin probar en la app nativa ni el sonido.
