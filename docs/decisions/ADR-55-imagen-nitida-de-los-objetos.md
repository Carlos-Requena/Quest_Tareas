---
adr: ADR-55
titulo: Imagen nítida de los objetos en el almacén de binarios, además del icono del evento
estado: aceptada
fecha: 2026-10-09
funcionalidades: [items]
---

# ADR-55 · Imagen nítida de los objetos en el almacén de binarios, además del icono del evento

- **Estado:** Aceptada. Completa [ADR-10](ADR-10-imagen-en-el-evento.md): el icono sigue en el evento.
- **Registrada:** 2026-10-09
- **Ámbito:** [items](../../src/features/items/README.md)

## Decisión

Al elegir la imagen de un objeto salen dos: el icono de 160 px de siempre, como data URL dentro de `item_created` / `item_updated` (las fichas, el cofre, lo que llega antes que el archivo), y una versión nítida de hasta 512 px (WebP, o PNG donde el WebView no lo codifica) en el almacén de binarios. El evento lleva su referencia (`ItemDef.art`: `blobId`, `mime`, `size`), se sincroniza como los demás binarios y entra en `blobsInUse`. Solo la cargan las vistas grandes (`ItemArt sharp`: la oferta de Hu Tao, la ficha del almanaque y el menú). Va unida a su icono: un parche que cambia o quita la imagen sin traer otra nítida la quita.

## Alternativas descartadas

Subir el icono a 512 px dentro del evento: con PNG (el WKWebView no codifica WebP) serían cientos de KB por objeto en cada evento, en cada snapshot y en cada subida a Drive, contra la norma de no meter archivos grandes en los eventos. Pintar el icono con un filtro de escalado: no recupera detalle. Cargar la nítida también en las fichas: una lectura del almacén por ficha en un almanaque con decenas, sin diferencia visible a ese tamaño.

## Motivo

En el teléfono, la oferta de Hu Tao pinta la imagen a unos 156 px de CSS, unos 470 px reales en un iPhone de pantalla ×3: el icono de 160 px se ampliaba casi ×3 y se veía pixelado.

## Consecuencias

Los objetos que ya existen siguen con el icono (los eventos no se reescriben): para verlos nítidos hay que volver a elegir su imagen. Ningún evento guardado tenía `art`, así que la proyección da lo mismo y no sube `PROJECTION_VERSION`. Los binarios de objetos editados o retirados se quedan huérfanos en el almacén (no se suben ni se usan), como hasta ahora con otros archivos.
