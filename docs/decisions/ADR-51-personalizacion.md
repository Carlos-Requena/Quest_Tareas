---
adr: ADR-51
titulo: Personalización: una ventana que solo presenta; cada dato, en su funcionalidad
estado: aceptada
fecha: 2026-10-08
funcionalidades: [customize, menu, temporal]
---

# ADR-51 · Personalización: una ventana que solo presenta; cada dato, en su funcionalidad

- **Estado:** Aceptada.
- **Registrada:** 2026-10-08
- **Ámbito:** [customize](../../src/features/customize/README.md) · [menu](../../src/features/menu/README.md) · [temporal](../../src/features/temporal/README.md)

## Decisión

Lo que el jugador personaliza (los personajes del menú, lo que dice cada uno según la hora y las ilustraciones de «Encargo cumplido» por tipo de encargo) se añade desde una sola ventana, `features/customize`, que no tiene eventos ni modelo: lee el estado y llama a las acciones de la funcionalidad dueña de cada dato. Las frases son eventos de `menu` (`voice_line_added`, `voice_line_updated`, `voice_line_removed`, con su `VoiceLine` en `CharactersAcc`) y las ilustraciones, de `temporal` (`temporal_art_added`, `temporal_art_removed`, con su `TemporalArt` en `TemporalAcc`, la imagen en el almacén de binarios). Los binarios en uso se calculan en un solo sitio, `blobsInUse` (`src/domain/blobs.ts`), que usan la limpieza y la sincronización.

## Alternativas descartadas

Una funcionalidad `customize` dueña de todos los datos, con un evento genérico por «hueco» (`artwork_added { slot }`): separa cada dato de quien lo usa (el menú tendría que leer frases de otra funcionalidad y el encargo, sus ilustraciones) y obliga a validar huecos que no conoce. Frases e ilustraciones solo en este equipo (`localStorage`): el propietario quiere verlas en todos sus equipos. Seguir sumando cada conjunto de binarios a mano en cada `collect` y en la sincronización: con cuatro dueños, el quinto se olvidaría en algún sitio.

## Motivo

Cada dato conserva su modelo, sus guardas y su README en la funcionalidad que lo usa (como el resto de la app), y la ventana crece con una pestaña más por cada cosa personalizable sin tocar el dominio. Que sean eventos es la norma para lo que debe verse igual en todos los equipos.

## Consecuencias

`PROJECTION_VERSION` pasa a 12 (los acumuladores de personajes y encargos ganan campos; 47 tipos de evento). Las frases de un personaje se van con él al quitarlo. Lo de serie (`public/menu/`, `public/temporal/<tipo>/`) no se quita desde la app. La fila de abajo del menú pasa a cuatro tarjetas (Chronicle, Calendar, Search, Customize).
