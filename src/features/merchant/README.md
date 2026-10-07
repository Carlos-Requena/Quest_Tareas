---
funcionalidad: merchant
titulo: Mercader
resumen: Hu Tao vende equipo para el muñeco y decoración del menú, con precio por rareza y ranura, rango mínimo y un escaparate semanal.
tipo: dominio
eventos: [gear_created, gear_updated, gear_deleted, gear_purchased]
preferencias: []
adr: [ADR-18, ADR-19, ADR-10, ADR-11]
---

# Mercader

**Hu Tao**, directora de la Funeraria Wangsheng, vende **equipo para el muñeco del personaje** (cabeza, cuerpo, manos, pies, arma, escudo, capa y amuleto) y **decoración del menú** (el fondo de la app y el emblema de la cabecera). Se abre con la tecla `C`, la tarjeta «Merchant» o el «+» del oro en el [menú](../menu/README.md). Además vende cada semana **un coleccionable** en su propia pestaña ([collectibles](../collectibles/README.md)). Lo que se compra se lleva puesto desde la ficha del personaje ([equipment](../equipment/README.md)).

## Qué hace

| # | Requisito del propietario | Cómo se cumple |
|---|---|---|
| R1 | La mercader es Hu Tao, con el vídeo de su modelo moviéndose | `HuTaoStage`: el vídeo en bucle y su cuadro de diálogo de JRPG, con frases según lo que miras |
| R2 | Comprar tiene que costar, pero ser habitual | Precio por rareza con recargo por ranura (de 1.200 G a 160.000 G), rango mínimo y escaparate semanal, con el oro calibrado para comprar a menudo ([rewards](../rewards/README.md)) |
| R3 | Decoración del menú o armadura para el personaje | 8 ranuras de armadura (`ARMOR_SLOTS`) y 2 de decoración (`DECOR_SLOTS`: fondo y emblema) |
| R4 | El equipo, en un catálogo distinto de los objetos de coleccionar | Catálogo propio (`GearDef`, `GameState.gear`) con su pestaña «Catálogo» |
| R5 | Añadir piezas a mano, **sin poner el precio** | `GearForm`: nombre, tipo, rareza, imagen y descripción. El precio y el rango los calcula el juego y el formulario solo los muestra |

## Reglas y decisiones

### Un catálogo propio, no el almanaque de objetos

`GearDef` es una entidad aparte de `ItemDef`, con sus eventos (`gear_*`): los objetos se coleccionan; el equipo se **compra una vez y se lleva puesto**. Comparten solo las **rarezas** ([ADR-18](../../../docs/decisions/ADR-18-mercader-precio-calculado.md)). El catálogo trae además **69 piezas de serie** ([armory](../armory/README.md)), que se suman con `gearOf` / `fullCatalog` y no se editan ni se retiran.

### El precio y el rango los pone el juego

| Rareza | Precio base | Rango (nivel) | A unos 6.500 G al día |
|---|---|---|---|
| Común | 1.200 G | F (1) | menos de 1 día |
| Poco común | 3.000 G | E (3) | medio día |
| Raro | 8.000 G | D (5) | 1–2 días |
| Épico | 20.000 G | C (8) | 3 días |
| Mítico | 45.000 G | B (12) | 1 semana |
| Legendario | 100.000 G | A (17) | 2 semanas |

Calibrado con el oro de la recompensa calculada: un día bueno (4–5 h de concentración) da unos 6.500 G, y el catálogo de serie entero (2.357.300 G con el recargo) se compra en un año. Al principio frena más el rango: rango A pide unos 35.000 XP (unos 3 meses a 400 XP al día). El rango es el primer nivel de cada letra (`rankFor`).

**Recargo por ranura** (`SLOT_PRICE_FACTOR`, a petición del propietario: «pricing elevado»): lo que más se ve cuesta más, y ninguna ranura baja de ×1. Se redondea a precio de tienda (centenas por debajo de 10.000 G y millares por encima).

| Ranura | Recargo | Común | Rara | Legendaria |
|---|---|---|---|---|
| Manos, pies | ×1 | 1.200 G | 8.000 G | 100.000 G |
| Cabeza | ×1,1 | 1.300 G | 8.800 G | 110.000 G |
| Escudo, capa | ×1,2 | 1.400 G | 9.600 G | 120.000 G |
| Emblema | ×1,25 | 1.500 G | 10.000 G | 125.000 G |
| Amuleto | ×1,3 | 1.600 G | 10.000 G | 130.000 G |
| Cuerpo | ×1,4 | 1.700 G | 11.000 G | 140.000 G |
| Arma | ×1,5 | 1.800 G | 12.000 G | 150.000 G |
| Fondo | ×1,6 | 1.900 G | 13.000 G | 160.000 G |

**Precios, recargos, rangos y ritmo del escaparate no se cambian sin preguntar al propietario** ([AGENTES.md](../../../docs/AGENTES.md#12-cómo-trabajar-con-el-propietario)).

### El escaparate semanal

Cada semana (de lunes a lunes, hora local; con cambio de hora dura 167 o 169 horas) Hu Tao saca **5 piezas** al azar (`SHOWCASE_SIZE`), más las **recién llegadas** (lo añadido en los últimos 7 días, `NEW_ARRIVAL_DAYS`). Lo que ya es tuyo no se vende y su hueco lo ocupa otra ([ADR-19](../../../docs/decisions/ADR-19-escaparate-semanal.md)).

- **Se calcula, no se guarda** (`showcase(catalog, owned, now)`): cada pieza recibe una puntuación con la semana como semilla (`seededRandom("2026-10-5:<id>")`) y salen las 5 más bajas. Todos los equipos ven el mismo.
- La tienda dice **cuándo vuelve** una pieza (`nextShowing`, hasta 26 semanas adelante). Con las 69 de serie, cada pieza vuelve de media cada unas 14 semanas: es la palanca más fuerte de la dificultad.
- El sorteo no mira la rareza. Con 5 piezas o menos, todo está a la venta.

### La compra copia el precio y la proyección vigila el oro

`gear_purchased { gearId, price }` copia el precio: si cambian los precios, lo pagado no cambia. La proyección resta `price` **solo si el oro llega**, la pieza existe y no era tuya. El escaparate y el rango se comprueban en la acción (`buyBlocker`), no en la proyección: al fusionar eventos de otro equipo el catálogo de esa semana podría ser distinto y una compra legítima se perdería. Si dos equipos gastan el mismo oro sin conexión, **solo vale la compra que llega primero**. Cada pieza es única y no hay devoluciones.

### Imágenes

- **Icono** de 160 px como *data URL* dentro de `gear_created` / `gear_updated`, como los objetos. Sin imagen, el **glifo de la ranura** sobre el color de la rareza.
- **Fondo del menú**: además, la imagen grande (hasta 1.920 px, WebP) en el **almacén de binarios**; en el evento solo va `art: { blobId, mime, size }` ([ADR-11](../../../docs/decisions/ADR-11-almacen-de-binarios.md)). La sincroniza [sync](../sync/README.md) como los adjuntos.
- **Limpieza compartida**: un binario solo se borra si no lo usa ningún encargo, pieza ni personaje (`liveBlobIds`, `gearBlobIds` y `characterBlobIds`).

### Retirar una pieza

`gear_deleted` la quita del catálogo, de lo comprado y del muñeco. El oro no se devuelve. El id queda retirado.

### Hu Tao

- **Vídeo**: animación no oficial de la ilustración, recortada a un **bucle perfecto de 32,17 s** y sin audio, en `public/merchant/`: `hutao.mp4` (H.264, 1280 × 720) para WebKit y WebView2, `hutao.webm` (VP9, 960 × 540) para el Chromium de las pruebas y `hutao.webp` como póster. Es público y va en el repositorio sin crédito (decisión del propietario).
- **Se reproduce desde memoria**: se descarga entero una vez por sesión y se sirve como `blob:` (MP4 si el WebView lee H.264, si no WebM), mudo antes de darle la fuente, con `play()` al poder y, si no arranca, con el primer clic. Así no depende de las peticiones por trozos (`Range`) que el protocolo de Tauri no siempre atiende en macOS. **Se mueve también con «reducir movimiento»** (es un bucle suave); el diálogo, en cambio, sale entero sin máquina de escribir.
- **Sin vídeo** (faltan los archivos) queda un cartel con el sello de la funeraria y el diálogo sigue.
- **Diálogo**: varias frases por situación (bienvenida, escaparate vacío, catálogo, te llega, te falta oro, te falta rango, no está a la venta, ya es tuya, vendida), una al azar. Se guarda el tipo de frase, no el texto, así que cambia con el idioma.

## Modelo

`GearDef { id, name, slot: GearSlot, rarity, description, image?, art?: GearArt, createdAt }`. `MerchantAcc { catalog, deleted, owned: Record<id, Purchase> }` en el acumulador; `GameState.gear` (catálogo con las de serie) y `PlayerState.owned`. `Showcase { ids, fresh, endsAt }` se calcula con la hora.

## Eventos

| Evento | Datos | Efecto en la proyección | Guarda |
|---|---|---|---|
| `gear_created` | `gear: GearDef` | Añade la pieza al catálogo | Se ignora si el id existe, fue retirado o es de serie, o si la ranura o la rareza no existen |
| `gear_updated` | `gearId`, `patch` (`image: ""` quita la imagen y `art: null`, la grande) | Mezcla el parche; si cambia de ranura, deja de estar puesta | Solo si existe; se descartan ranuras y rarezas imposibles |
| `gear_deleted` | `gearId` | La quita del catálogo, de lo comprado y del muñeco | Solo si existe; el id queda retirado |
| `gear_purchased` | `gearId`, `price` (copiado) | Resta el precio del oro y la marca como tuya | Solo si existe, no era tuya y el oro llega en ese punto del historial |

## Interfaz

| Tecla (ventana abierta) | Acción |
|---|---|
| `C` | Abrir (desde los tablones o el menú) o cerrar |
| `Q` / `E` / `Tab` | Escaparate → Coleccionable → Catálogo |
| `↑` / `↓` | Elegir pieza |
| `Enter` | Comprar (dos veces: armar y confirmar); en la pestaña del coleccionable, el de la semana |
| `N` | Nueva mercancía |
| `Esc` | Cancelar el formulario o la compra armada; si no, cerrar |

| Momento | Qué pasa |
|---|---|
| Abrir la tienda | La ventana entra con un muelle; Hu Tao saluda letra a letra (cada 24 ms; el resto de la frase ya ocupa su sitio, invisible) |
| Elegir una pieza | Hu Tao la comenta según tu situación (oro, rango, escaparate) |
| Armar la compra | El botón se vuelve rojo y late: «¿Seguro? Pagar 8000 G» |
| Comprar | Un sello rojo «SOLD» (`SoldSeal`, GSAP con `power4.in`) cae sobre el escaparate con `mix-blend-mode: multiply`, golpe, lluvia de monedas y sacudida; desde épico, fanfarria y estrellas del color de la rareza |

En el teléfono: Hu Tao arriba, la mercancía debajo y la ficha de la pieza elegida **pegada abajo** (`position: sticky`).

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | Ranuras, `GearDef`, precios, rangos, escaparate semanal (`showcase`, `nextShowing`, `weekKey`), `buyBlocker`, acumulador de la proyección. Puro |
| `events.ts` | `MerchantEventBody` |
| `actions.ts` | `createGear`, `updateGear`, `deleteGear`, `buyGear`, `currentShowcase`, `whyNotBuy`, limpieza de binarios |
| `image.ts` | Icono de 160 px y la imagen grande del fondo (canvas) |
| `ui.ts` | Ventana abierta y pestaña; `merchantBusy` |
| `components/MerchantModal.tsx` | La ventana: escenario, pestañas (escaparate, coleccionable y catálogo), lista, ficha y formulario |
| `components/HuTaoStage.tsx` | El vídeo de Hu Tao y su cuadro de diálogo |
| `components/GearDetail.tsx` | Ficha: precio, requisitos, escaparate y botones |
| `components/GearForm.tsx` | Añadir y editar mercancía |
| `components/GearArt.tsx`, `SlotGlyph.tsx` | Arte de una pieza y glifos de las ranuras (los usan también el personaje y el almanaque) |
| `components/SoldSeal.tsx` | El sello de «vendido» con su celebración |
| `components/LanternIcon.tsx` | Icono del farol (el botón está en el menú) |
| `merchant.css`, `i18n.ts` | Estilos y textos es + ja, con los diálogos de Hu Tao |
| `model.test.ts`, `actions.test.ts` | Precios, semanas con cambio de hora, escaparate determinista, guardas; con el store, comprar con cada bloqueo, crear sin precio, editar, retirar una pieza puesta |

### Dónde está cada cosa

| Concepto | Símbolo |
|---|---|
| Precio y rango de una pieza | [`priceOf`](model.ts), [`levelRequired`](model.ts) y [`rankRequired`](model.ts), con [`PRICES`](model.ts), [`SLOT_PRICE_FACTOR`](model.ts) y [`LEVEL_REQUIRED`](model.ts) |
| Escaparate semanal | [`showcase`](model.ts), [`nextShowing`](model.ts), [`weekKey`](model.ts) e [`isNewArrival`](model.ts) |
| Por qué no se puede comprar (en la acción) | [`buyBlocker`](model.ts), [`whyNotBuy`](actions.ts) y [`buyGear`](actions.ts) |
| Guardas de la proyección (el oro) | [`applyMerchantEvent`](model.ts) |
| Catálogo con las piezas de serie | [`gearOf`](model.ts) y [`fullCatalog`](model.ts) |
| Binarios en uso | [`gearBlobIds`](model.ts) |
| Vídeo de Hu Tao en memoria | [`HuTaoStage`](components/HuTaoStage.tsx), [`videoUrl`](components/HuTaoStage.tsx) y [`HUTAO_VIDEO`](components/HuTaoStage.tsx) |
| Diálogo letra a letra | [`Dialogue`](components/HuTaoStage.tsx) |
| Sello «SOLD» y su celebración | [`SoldSeal`](components/SoldSeal.tsx) |
| Ventana | [`MerchantModal`](components/MerchantModal.tsx) |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/types.ts` | `GameState.gear`; `PlayerState.owned` |
| `src/domain/events.ts` | `MerchantEventBody` en la unión |
| `src/domain/projection.ts` | `ProjectionAcc.merchant`; los cuatro `case` (el oro gastado se resta de `acc.gold`); `GameState.gear = fullCatalog(...)` |
| `src/features/temporal/actions.ts` | La limpieza de binarios respeta las imágenes del mercader |
| `src/styles/theme.css` | Tokens `--merchant`, `--merchant-hi`, `--merchant-lo` y `--merchant-deep` |
| `src/App.tsx` | Tecla `C`, `<MerchantModal />` y el teclado del tablón espera mientras está abierta |
| `public/merchant/` | El vídeo de Hu Tao (MP4 y WebM) y su póster |
| `src/i18n/locales/{es,ja}.ts` | Montan `merchant` |
| `src/test/streams.ts` | `gearDef` y los eventos del mercader en `randomStream` |

## Dependencias

- **features/items** (`model.ts`: rarezas y sus colores): las rarezas que comparten.
- **features/armory** (`model.ts`, `labels.ts`): las piezas de serie y sus nombres traducidos. Para añadir o cambiar una pieza de serie, lee su README.
- **features/collectibles** (`OfferPanel`, `model`, `actions`): la pestaña «Coleccionable». Para cambiar la oferta, lee su README.
- **features/equipment** (`actions.ts`): «Ponérmelo» desde la ficha.
- **features/temporal** y **features/menu** (`model.ts`: `liveBlobIds`, `characterBlobIds`): no borrar binarios que usan otros.
- **La usan:** `armory`, `collectibles`, `equipment`, `items` (almanaques de equipo), `menu`, `sync`, `calendar` y `temporal` (su teclado espera con la tienda abierta).

## Estado actual

- **Última verificación:** 2026-10-02, tests (con prueba de mutación) y navegador (Chromium, WebM) a 1.280 × 780: piezas con imagen, fondo en IndexedDB, compra con el sello, japonés y de 1.024 a 1.440 px; el vídeo en memoria, mudo y avanzando.
- **Tests:** `model.test.ts`, `actions.test.ts` y, en `src/domain/projection.test.ts`, el oro y el doble gasto entre dispositivos.
- **Sin verificar:** el vídeo MP4 en el WKWebView de la app nativa de macOS (el propietario lo vio quieto antes del cambio a `blob:`; no se ha vuelto a comprobar); la imagen grande del fondo en la tabla `blobs` de SQLite; Windows; los sonidos.
- **Historial:** [docs/history/verificacion/merchant.md](../../../docs/history/verificacion/merchant.md).

## Pendiente

- Venderle piezas a Hu Tao (a la mitad de su precio, por ejemplo).
- Un escaparate que saque lo legendario con menos frecuencia.
- Ofertas de la semana o un descuento según el rango.
