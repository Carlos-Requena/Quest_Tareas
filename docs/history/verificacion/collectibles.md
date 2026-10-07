# Historial de verificación · Coleccionable de la semana

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/collectibles/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

- `model.test.ts`: precio; la oferta (solo míticos o más que no tienes, la misma en cualquier orden del catálogo y toda la semana, cambia de una semana a otra, se queda si te sale otro y cambia si te sale la ofrecida), vendida hasta el lunes, `offerBlocker` sin rango; y en la proyección la compra, las guardas, la doble compra entre dispositivos y el repetido quemado.
- `store/game.test.ts`: solo se compra la de la semana, con nivel 1 si llega el oro, y después queda vendida (otra da «soldOut»).
- En el navegador (`pnpm dev`), en la ventana de Hu Tao: tres pestañas (escaparate, coleccionable, catálogo); con dos compras de prueba esta semana, la pestaña enseña el último comprado con el sello «Vendido», la nota «el lunes trae otro» y la frase de Hu Tao; la ventana de objetos ya no tiene pestaña de compra. Cabe a 402 × 874 (pestañas en una fila), a 1.024 y a 1.300 px. La compra desde la interfaz (confirmación y sello de Hu Tao) no la repetí tras moverla, porque los datos de prueba ya tenían compra esta semana; la cubren los tests del store. Sin probar en la app nativa ni el sonido.
