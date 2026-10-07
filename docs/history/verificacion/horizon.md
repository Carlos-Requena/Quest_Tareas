# Historial de verificación · Plazos

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/horizon/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-02 con `pnpm dev` en Chromium (Playwright).

- **Dominio** (marcas de tiempo fijas, en Madrid, Tokio y Ciudad de México): los bordes de cada plazo (hoy ya pasado, ayer de todo el día, mañana a las 23:59, 2, 7, 8, 14, 15, 30 —cruzando el cambio de hora del 25 de octubre— y 31 días), `isOverdue`, `deadlineIn` al cruzar el cambio de hora, `questDue` (propia, del encargo, la más temprana, mismo día, encargo cumplido, quest completada), `countHorizons` y `filtersFor`.
- **Interfaz:** filtro del Quest Board con quests de todos los plazos (contadores correctos, «7 días» deja solo la de 7 días), tecla `H` en los dos tablones, filtro del tablón de encargos («1 día» deja «Dentista» y «Cumpleaños»), fecha límite «7 días» en el formulario, etiquetas «Mañana» / «En 12 días» / «Vencida» y calavera en las de un encargo, japonés y ventana mínima de 1.024 px (el filtro cabe; en el pie se oculta la pista de las flechas).

**No verificado:** la app nativa (`pnpm tauri dev`) y Windows.
