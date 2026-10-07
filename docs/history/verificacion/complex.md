# Historial de verificación · Quests complejas

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/complex/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-02 con `pnpm dev` en Chromium (Playwright).

- **Tipos y build:** `npx tsc --noEmit` y `pnpm build` correctos.
- **Dominio** (importando los módulos puros con marcas de tiempo fijas, en Madrid, Tokio y Ciudad de México): `recurs` en las cuatro combinaciones; `recurrenceMinutes` y `splitMinutes` con límites; un encargo con repetición de 3 días pasa a `cooldown` con `availableAt` exacto, sigue en espera 1 ms antes y vuelve justo a los 3 días; aceptarlo antes de tiempo se ignora; sin repetición acaba en `done`; `cleanRequires`; una quest bloqueada no se acepta y sí tras completar el requisito; `blockers`, `dependents`, `unlockedBetween`; un requisito retirado deja de bloquear; un requisito repetible basta con una vez.
- **Datos antiguos:** 32 eventos generados con la versión anterior (sembrado, aceptar, progresar, reportar con botín, repetible en espera, encargos cumplido y pendiente) se proyectan **idénticos** (jugador, quests, estados, esperas, encargos).
- **Interfaz:** formulario con repetición personalizada «cada 3 días» en un encargo (se guarda `cooldownMinutes: 4320` y al completarla vuelve en 3 días); requisito elegido en el desplegable; tarjeta con candado y «Requiere «Recado del Mercado»»; `Enter` sobre ella avisa «Bloqueada: antes completa…»; al completar el requisito, aviso de desbloqueo; japonés y ventana de 1.024 px.

**No verificado:** la app nativa (`pnpm tauri dev`), Windows, y escuchar los sonidos.

**Repetición por días (2026-10-06):** tests en `model.test.ts` (limpieza, siguiente día, fin de la racha, vuelta en la proyección con racha de 2) y en `features/today/model.test.ts` (salen cada día que tocan en el calendario); en el navegador, una quest de élite editada para repetirse martes y jueves sale en «Toca hoy» y el jueves en la semana.
