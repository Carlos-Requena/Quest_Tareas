# Historial de verificación · Snapshot de la proyección

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/snapshot/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

**Tests** (`pnpm test`): esta funcionalidad trajo Vitest al proyecto, y con ella una batería de 231 tests en 13 archivos que cubre todo el dominio y el store. La lista completa está en [docs/COMO-FUNCIONA.md](../../../docs/COMO-FUNCIONA.md), sección 13. Los del snapshot:
- 25 historiales aleatorios de 400 eventos con todos los tipos, incluidos eventos imposibles, formatos antiguos (`item` de texto, pomodoro sin `conditionId`) y empates de `ts`. Cada uno se corta en 10 puntos (0, 1, 2, 37, 100, 199, 200, 333, 399, 400): snapshot → JSON → snapshot + cola tiene que coincidir con `project()` de todos.
- Los mismos historiales aplicados evento a evento sobre copias, como `dispatch`, sin modificar el estado anterior.
- `restore()` con un `EventStore` en memoria: sin snapshot, con uno válido (solo lee la cola), de otra versión y con un evento antiguo fusionado.
- El store entero en un navegador simulado (happy-dom): snapshot cada 100 eventos y su uso al volver a abrir, un snapshot falseado, el reloj atrasado, un `dispatch` durante un recálculo y las acciones de quests, encargos, objetos y pomodoro.

**Prueba de mutación:** se introdujeron 20 errores típicos en el código, uno a uno: cobrar una quest no activa, saltarse una guarda, pity mal contado, `since` que incluye el propio evento, `dispatch` que modifica el estado anterior… Los tests detectan 19. El que queda es una rama inalcanzable: al abandonar una quest, su espera ya ha vencido siempre, porque solo se acepta cuando vence. Por eso, cambiar `"cooldown"` por `"available"` en esa rama no altera nada. Sin el arreglo de `nextTs`, fallan 10 tests del store.

**En ejecución** (`pnpm dev`, navegador integrado, con 315 eventos):
- Primer arranque: guarda el snapshot (315 eventos, 8 KB, termina en el último evento) y la cabecera muestra lo mismo que `project()`.
- Segundo arranque: carga desde el snapshot sin errores.
- Snapshot falseado (+1.000 de oro): la verificación de desarrollo lo detecta, muestra el error y usa la proyección completa (355 G).
- Tres eventos con fecha anterior al snapshot (fusión simulada de otro dispositivo, +77 G): el recuento no cuadra, se recalcula todo (432 G) y se guarda un snapshot nuevo de 318 eventos.
- Aceptar una quest con el ratón, `dispatch` con el reloj atrasado a enero y 100 `dispatch` seguidos: el estado coincide con el completo y el snapshot pasa de 320 a 420 eventos justo al llegar a 100.

**App nativa** (`pnpm tauri dev`, macOS, sobre la base real del propietario con 165 eventos; antes se hizo una copia y al final se restauró idéntica, comprobada con SHA-256):

| Prueba | Qué se hizo | Resultado |
|---|---|---|
| A. Primer arranque | Abrir la app | Guarda el snapshot en `meta` a los ~6 s (116 KB, con las imágenes de los objetos). Coincide campo a campo con reproducir los 165 eventos (nivel 8, 5.770 XP, 3.010 G) |
| B. Snapshot + cola | Añadir un evento inocuo posterior y volver a abrir | 30 s abierta sin tocar el snapshot: lo usó, `since` devolvió el evento y la verificación de desarrollo coincidió (si no, lo habría reescrito) |
| C. Evento antiguo | Añadir un evento con fecha anterior al snapshot | A 1 s del arranque, `countUpTo` no cuadra, recalcula todo y guarda uno nuevo de 167 eventos |
| D. Snapshot falseado | +1.000 de oro en el snapshot | A 1 s del arranque lo detecta y lo reescribe con 3.010 G |

**Medido en el navegador** con 50.000 eventos sintéticos: reproducirlos todos tardó unos 29 ms (leer el JSON y `project()`), cargar el snapshot 0,2 ms y copiar el acumulador 0,01 ms. Ese historial solo tiene 6 quests, así que el estado es mucho más pequeño que uno real.

**No verificado:** cuánto se ahorra al arrancar con un historial nativo grande (la base real solo tiene 165 eventos), capturas de la ventana nativa (no hay permiso de grabación de pantalla) y Windows.
