# Historial de verificación · Música de fondo

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/music/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## La primera pista, en `dist/`

La primera pista se dejó en `dist/assets/Musica/` y se movió a `public/music/`; el siguiente build borró la carpeta original. De ahí la norma de no dejar nada en `dist/`.

## Registro hasta el 2026-10-07

En el navegador integrado:
- El servidor sirve `/music/%E9%85%92%E5%A0%B4.mp3` (`200`, `audio/mpeg`, 4.742.929 bytes).
- Al cargar, el control espera la primera interacción y lo indica en su descripción emergente.
- Un clic en el tablón la arranca, con **una sola** descarga de la pista.
- `M` pausa y reanuda; la preferencia persiste en `localStorage`.
- El volumen cambia la **ganancia real** del audio (0,15 → 0,15; 0,8 → 0,8).
- ♪ silencia todo (ganancia 0 y pausa) y al quitarlo vuelve al volumen anterior; el botón de música estando silenciado quita el silencio; con la música apagada, ♪ no la enciende.
- `pnpm build` coloca la pista en `dist/music/`.

**No verificado:**
- Que suene de verdad: en la prueba no hay salida de audio audible; se comprobó el estado del reproductor.
- La app empaquetada (`tauri build`) en macOS y Windows.
