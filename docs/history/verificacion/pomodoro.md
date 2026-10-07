# Historial de verificación · Pomodoro

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/pomodoro/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Datos antiguos (primera versión del pomodoro)

La conversión de `legacy.ts` se comprobó con datos antiguos reales: las quests con el pomodoro único (`pomodoroConfig`) se ven como un objetivo de 1 ronda y conservan su estado, incluida una ronda interrumpida en 33:25. Fue el primer caso real de versionado de eventos, antes de que existieran `v` y `UPCASTERS`.

## Registro hasta el 2026-10-07

Modelo (`model.ts` importado en el navegador, con marcas de tiempo fijas), plan de 4 × 25 min con 5 de descanso:

| Momento | Resultado |
|---|---|
| Total | 115:00 = 4 × 25 + 3 × 5 |
| t = 0 | Concentración, ronda 1/4, quedan 25:00 |
| t = 25 | Descanso tras la ronda 1, 1 completada, quedan 05:00 |
| t = 30 | Concentración, ronda 2/4 |
| t = 114 | Ronda 4/4, quedan 01:00 |
| t = 115 | Terminado, 4/4, **sin descanso final** |
| Pausa de 10 a 20 min | A los 30 quedan 05:00 de la ronda 1 |
| Pausa durante el descanso | El descanso también se congela |
| Saltar el descanso | Pasa a la ronda 2 con 25:00 |
| Terminar en la ronda 2 | Vuelve a reposo, conserva 1 ronda, parcial 10:00 |
| Volver a empezar | Continúa por la ronda 2 |
| 1 ronda de 90 + 15 | Termina a los 90 min |
| 3 × 10 sin descanso | Las rondas van seguidas |

Interfaz (navegador integrado):
- Quest de 4 rondas a mitad de la ronda 2: fila «1 / 4», anillo, marcadores e insignia «22:28 2/4».
- Quests con el pomodoro antiguo, convertidas.
- Formulario con contador y pomodoro de 3 × 45 + 10 («Total 2 h 35 min»), guardado con `kind` y rondas.

**No verificado**: el sonido de la campana y la app nativa en Windows.
