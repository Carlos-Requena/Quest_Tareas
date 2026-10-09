# Historial de verificación · Snapshot de la proyección

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/snapshot/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## 2026-10-09 · Copia selectiva en dispatch (ADR-54)

**Tests:** `applyNext` evento a evento sobre 25 historiales aleatorios de 300 eventos coincide con `project()` cada 60 eventos y al final; con 8 semillas más, el acumulador anterior se congela a fondo (`freeze` de Immer, Map y Set incluidos) antes de cada evento y nada escribe en él; un evento que no cambia nada devuelve el mismo acumulador; aceptar una quest copia esa quest y comparte el resto (y la vista reutiliza `items`, `temporals`, `gear`, `chronicle`, `agenda`, `characters`, `companion` y `player`). El test estricto destapó que el valor (`reward`) de un encargo cumplido o quemado dependía de si se había asentado antes: arreglado con `fixValue` y `PROJECTION_VERSION` 14; sin el arreglo fallan 5 semillas y el test del encargo quemado.

**Dominio (Node, Apple M4 Pro):** tu historial real (326 eventos) y la misma mezcla de actividad repetida 13, 52 y 156 semanas. Coste de aplicar un evento en `dispatch` (antes: `structuredClone` + `applyEvent` + `finishProjection`; ahora: `applyNext` + `viewProjection`):

| Historial | Quests | Antes, aceptar | Ahora, aceptar | Antes, evento sin cambios | Ahora |
|---|---|---|---|---|---|
| real (326 eventos) | 9 | 0,16 ms | 0,03 ms | 0,21 ms | 0,006 ms |
| ~3 meses (2.315) | 100 | 0,85 ms | 0,08 ms | 0,85 ms | 0,015 ms |
| ~1 año (8.282) | 373 | 3,06 ms | 0,21 ms | 2,98 ms | 0,055 ms |
| ~3 años (24.194) | 1.101 | 9,49 ms | 0,56 ms | 9,45 ms | 0,15 ms |

**Interfaz, build de producción con el perfilador de React** (Chromium del panel; sin la escritura de `localStorage`, que en la app nativa es SQLite asíncrono). Componentes repintados y tiempo de `dispatch`, mediana de 8–10:

| Escenario | Antes, sin cambios | Ahora | Antes, aceptar/abandonar | Ahora |
|---|---|---|---|---|
| Real · tablón | 136 · 8,3 ms | 0 · 0,2 ms | 137 · 6,5 ms | 73 · 5,4 ms |
| Real · encargos | 107 · 2,6 ms | 0 · 0,1 ms | 107 · 2,7 ms | 17 · 1,2 ms |
| Real · Mi día | 95 · 3,7 ms | 0 · 0,2 ms | 97 · 4,8 ms | 33 · 3,4 ms |
| 1 año · tablón (54 tarjetas) | 657 · 17,6 ms | 0 · 0,3 ms | 657 · 19,1 ms | 386 · 5–7 ms |
| 1 año · encargos | 1.147 · 23,4 ms | 0 · 0,3 ms | 1.147 · 25,3 ms | 17 · 2,8 ms |
| 1 año · Mi día | 253 · 6,6 ms | 0 · 0,3 ms | 253 · 7,8 ms | 33 · 3,5 ms |
| 1 año · Semana | 989 · 105 ms | 0 · 0,3 ms | 989 · 145 ms | 25 · 6,7 ms |

**App nativa de macOS (WKWebView)**, `tauri dev` con el identificador `com.quests.perf` (base propia, copia de la real y la de un año), el frontend de producción con perfilador y la sincronización y los avisos sustituidos por versiones vacías (no podía tocar Drive aunque el llavero comparte la sesión). `dispatch` con la escritura real en SQLite, mediana de 10:

| Escenario | Antes, sin cambios | Ahora | Antes, aceptar/abandonar | Ahora |
|---|---|---|---|---|
| Real · tablón | 20 ms | 2 ms | 20 ms | 16 ms |
| Real · encargos | 16 ms | 2 ms | 17 ms | 4 ms |
| Real · Mi día | 13 ms | 2 ms | 15 ms | 7 ms |
| 1 año · tablón | 91 ms (p90 154) | 3 ms | 83 ms (p90 103) | 6 ms |
| 1 año · encargos | 178 ms (p90 286) | 2 ms | 167 ms (p90 267) | 4 ms |
| 1 año · Mi día | 41 ms | 3 ms | 45 ms | 4 ms |

El arranque (recargando la ventana) no cambia: ~105–120 ms con la base real en las dos versiones. Con la ventana tapada, macOS frena el WebView y todo sale más lento por igual: las comparaciones se hicieron con la ventana en el mismo estado.

**Recorrido en el navegador** (`pnpm dev`, datos de ejemplo): seleccionar con clic y con flechas, aceptar con `a`, las tres secciones, las tres vistas del calendario y el menú, sin errores en consola.

**Sin verificar:** el iPhone (necesita instalar una build de medición); Windows; las animaciones de entrada y salida de las tarjetas a simple vista (el panel del navegador estaba oculto y la ventana nativa no se capturó).

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
