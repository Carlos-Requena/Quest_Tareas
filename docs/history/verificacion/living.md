# Historial de verificación · Personajes vivos

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/living/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## 2026-10-08 · Primera versión: malla, efectos, entrada gacha y vídeo

En el navegador del panel (Chromium) con datos de prueba, primero contra el servidor de la app abierta del propietario y, cuando se paró, con un `pnpm dev` propio (parado al terminar).

- **Tipos, tests y build:** `npx tsc --noEmit`, `pnpm test` (496 tests en 42 archivos) y `pnpm build` correctos. Tests nuevos del estilo (parches que se suman, restablecer, campos fuera de rango, personajes que no existen o se quitaron) y de la detección de imágenes animadas (`media.test.ts`: PNG/APNG, WebP fijo y animado, GIF, AVIF y archivos cortos). Los dos eventos entran en `randomStream`.
- **Malla (1.280 × 800):** el menú pinta a Kazuma en un lienzo de WebGL (la imagen queda oculta como textura), con aura, barrido y destellos. Comparando dos fotogramas a 1,4 s: los pies no cambian nada (diferencia 0); el pecho y la cabeza sí (suben y se mecen con el cuerpo).
- **Pestaña Movimiento (japonés):** Aqua con viento intenso: el pelo de la izquierda ondea sin desgarros. Entrada gacha en la vista previa: silueta negra, destello con anillos y revelado.
- **Vídeo:** un WebM con transparencia generado en el navegador (`MediaRecorder`) y añadido con `addCharacter`: se reproduce en bucle en el menú, con el movimiento de CSS, sin malla ni brillo; su tarjeta en Customize también lo reproduce.
- **1.024 × 700 y 402 × 874 (español):** las filas de Movimiento no se pisan (tras dar al control su ancho natural) y, en el teléfono, el pie «Restablecer» queda al final (tras quitar el `min-height: 0` de la columna que se desplaza).
- **No se verificó:** la entrada gacha dentro del menú, la app nativa (macOS, Windows), el iPhone de verdad, un vídeo con transparencia en Safari, un GIF o APNG real y el sonido.
