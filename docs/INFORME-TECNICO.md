# Quests — Informe técnico de arquitectura

> **Este archivo es la fuente del informe.** El [documento publicado en Claude](https://claude.ai/code/artifact/1cb3618f-d1e6-483e-a198-a1998279827b) conserva los diagramas editables (de ahí salen las imágenes de `docs/img/`) y es una instantánea para leer: si difiere de este archivo, manda este. Las decisiones están en [decisions/](decisions/README.md); la historia (fases, cifras de cada época, fallos resueltos), en [history/](history/CHANGELOG-TECNICO.md); el estado de cada funcionalidad, en su README (resumen en [INDEX.md](INDEX.md#funcionalidades)).

---

## Resumen

Quests es una app de escritorio (macOS y Windows) y de iPhone que convierte tareas en *quests* de estilo JRPG, hecha con Tauri 2 + React 19 + TypeScript. Las fases 1 (base local), 1.5 (endurecimiento) y 2 (sincronización con Google Drive) están terminadas, la app de iPhone funciona y la fase 3 (producto y distribución) va por la mitad: ya están editar, deshacer, el alta rápida, los fallos, Mi día, la búsqueda, los avisos del sistema, el menú de opciones y el icono propio; faltan los logros, las estadísticas, las animaciones reducidas y los instaladores firmados.

Tres decisiones sostienen la escalabilidad del proyecto:

1. **Event sourcing.** No se guarda el estado («XP = 1150»), sino los hechos que lo producen. La sincronización entre equipos consiste en unir listas de eventos, sin conflictos de escritura ([ADR-02](decisions/ADR-02-event-sourcing.md)).
2. **Dominio puro y separado de la interfaz.** Las reglas del juego viven en `src/domain/` y en los `model.ts` de cada funcionalidad, sin React ni Tauri: se testean solas y se reutilizan en el iPhone sin cambios.
3. **Almacenamiento detrás de una interfaz.** `EventStore` aísla SQLite; la sincronización y un posible backend futuro se enchufan ahí sin tocar la interfaz.

Los eventos llevan versión ([ADR-24](decisions/ADR-24-eventos-versionados.md)) y se ordenan con un reloj lógico híbrido ([ADR-25](decisions/ADR-25-reloj-hibrido.md)); el arranque parte de un snapshot ([ADR-16](decisions/ADR-16-snapshot.md)); la interfaz tiene un error boundary, la CSP es estricta y la CI pasa tipos, tests y build en macOS y Windows en cada push.

## Estado por plataforma

| Plataforma | Estado | Sin probar |
|---|---|---|
| **macOS** | App nativa que usa el propietario, con sus datos reales; sincroniza con Google Drive | Lo nativo de las funcionalidades más nuevas (el «Estado actual» de cada README) |
| **Windows** | La CI compila el instalador y pasa los tests; el propietario sincronizó con Drive (2026-10-06) | La app a fondo: fuentes, animaciones y visor de PDF de WebView2 |
| **iPhone** | Release firmada con un Apple ID gratuito e instalada; el propietario sincroniza con ella (2026-10-06) | Lo propio del teléfono, en el «Estado actual» de [mobile](../src/features/mobile/README.md#estado-actual) |
| **Navegador** (`pnpm dev`) | Donde se verifica cada funcionalidad en ejecución, en escritorio y a 402 × 874 | — |

La fecha de la última verificación de cada funcionalidad está en [INDEX.md](INDEX.md#funcionalidades) y lo que le falta, en su README.

## Stack tecnológico

Tauri se eligió frente a Electron por tamaño (unos 10 MB frente a ~150 MB) y por tener un backend nativo en Rust donde viven OAuth y la sincronización ([ADR-01](decisions/ADR-01-tauri.md)). El resto es el ecosistema web estándar, el más rico para animaciones. Las versiones exactas están en `package.json`, `pnpm-lock.yaml` y `src-tauri/Cargo.lock`.

| Capa | Tecnología | Papel | Por qué |
|---|---|---|---|
| Contenedor | Tauri 2 | Ventana nativa, empaquetado, puente JS↔Rust | Binario pequeño; macOS, Windows e iOS con el mismo código |
| Backend nativo | Rust | Plugins, OAuth, llavero y llamadas a Drive | Seguro, con acceso al sistema; el token nunca llega al WebView |
| Base de datos | SQLite vía `tauri-plugin-sql` (sqlx) | Almacén local de eventos y binarios | Embebida, sin servidor, transaccional |
| Interfaz | React 19 + TypeScript 6 | Componentes con tipos | Ecosistema de animación y refactors seguros |
| Bundler | Vite 8 | Servidor de desarrollo y build | Recarga en caliente, integrado con Tauri |
| Estado | Zustand 5 | Store global y stores de interfaz por funcionalidad | Mínimo y accesible fuera de los componentes ([ADR-05](decisions/ADR-05-zustand.md)) |
| Animación | Motion + GSAP 3 | Transiciones y layout; secuencias encadenadas | Cada una para lo suyo ([ADR-06](decisions/ADR-06-motion-y-gsap.md)) |
| Idiomas | i18next + react-i18next | Español y japonés, diccionarios tipados | Claves comprobadas al compilar |
| Sonido | Web Audio API | Efectos sintetizados | Sin archivos que empaquetar ([ADR-07](decisions/ADR-07-sonido-sintetizado.md)) |
| Tipografía | Fontsource (subconjunto latino) | Fuentes locales | Funciona sin conexión ([ADR-08](decisions/ADR-08-fuentes-locales.md)) |
| Tests | Vitest + happy-dom | Dominio, store y sincronización | Rápidos y con zona horaria fija |

## Arquitectura por capas

La app tiene dos procesos: el frontend en un WebView y un backend nativo en Rust. La lógica de negocio vive en el dominio puro, en el centro.

![Arquitectura por capas: frontend, backend nativo y sync](img/arquitectura.png)

Los comandos bajan como eventos (`dispatch`) y el estado nuevo sube; ningún componente lee ni escribe SQLite directamente. Cada funcionalidad (`src/features/<nombre>/`) aporta su modelo puro al dominio y sus componentes a la interfaz. Las dependencias van en un solo sentido: `components` → `store` → `domain` ← `storage` ([AGENTES §4](AGENTES.md#4-mapa-del-código)).

## Diagrama de clases

El modelo separa la definición de una quest (`QuestDef`, lo que viaja en el evento) de su estado de juego (`QuestState`). Todo lo que hay en `GameState` se calcula; lo único que se guarda es `GameEvent`.

![Diagrama de clases: dominio, store y almacenamiento](img/diagrama-clases.png)

Son tipos de TypeScript, no clases con métodos: la lógica vive en funciones puras (`project`, `effectiveStatus`, `conditionsMet`). Por áreas:

- **Quests.** `QuestDef` lleva categoría, objetivos (`ConditionDef`: contador, pomodoro o lista de casillas), recompensa calculada (`RewardDef`, con el objeto garantizado), y de forma opcional repetición (`cooldownMinutes` o `repeatDays`), requisitos (`requires`), fecha límite (`dueAt`) y contactos (`ContactRef`). `QuestState` añade el estado (`available`, `active`, `cooldown`, `done`), el progreso de cada objetivo (`progress`, `pomodoros`, `checked`), `completions`, `lastCompletedAt`, la racha (`Streak`), `failedAt`, y dos campos calculados: `temporalId` (su encargo pendiente) y `reserved` (en reserva). `QuestPatch` es el parche de `quest_updated`.
- **Objetos.** `ItemDef` (rareza, `ItemKind` fijo, imagen reducida, si sale en los cofres) vive en `GameState.items`. `PlayerState` suma `inventory`, `discovered`, `pity` y `collectiblesBought`. Cada `Drop` de `quest_completed` copia su rareza.
- **Encargos.** `TemporalDef` (tipo de cartel, calaveras, fecha, lugar, notas, adjuntos `AttachmentRef`, quests enlazadas `questIds`, contactos, `planned`) y `TemporalState` (pendiente o hecho, `acceptedAt`, `completedAt`, `failedAt`, `earned`, `linkedAt`) en `GameState.temporals`. Los archivos están en el `BlobStore`.
- **Mercader y personaje.** `GearDef` (ranura `GearSlot`, rareza, icono y, en los fondos, `GearArt` en el `BlobStore`) en `GameState.gear`, que junta el catálogo del jugador y las piezas de serie. `PlayerState` suma `owned` (cada `Purchase` con su precio copiado), `equipped` y `attributes` (un `Attribute` por área).
- **Agenda y menú.** `AgendaDef` / `AgendaState` (día `AAAA-MM-DD`, minutos, `AgendaRepeat`, días quitados) en `GameState.agenda`; `CharacterDef` (con su `CharacterArt` en el `BlobStore`) en `GameState.characters`. Ninguno toca al jugador.
- **Calculado sin estado propio.** La crónica (`ChronicleEntry` en `GameState.chronicle`, apuntada por la proyección), los plazos (`Horizon`), el escaparate (`Showcase`), Mi día (`TodayPlan`), la búsqueda (`SearchHit`), el alta rápida (`QuickQuest`), los avisos (`Reminder`) y la rotación de personajes.
- **Infraestructura.** `ProjectionAcc` (el acumulador, con `deletedQuests`, que guarda el `Snapshot`), `GameStore` (`projected`, `state`, `dispatch` que devuelve el evento guardado), `EventStore` (`since`, `countUpTo`, `byDevice`, `merge`…), `BlobStore` (`ids`, `readBase64`) y los tipos de la sincronización (`RemoteFile`, `Cursors`, `SyncReport`, `SyncState` en Rust).

El detalle de cada tipo está en el README de su funcionalidad. Si cambia el modelo, el diagrama se redibuja en la misma tarea ([runbook](runbooks/redibujar-diagramas.md)).

## Modelo de eventos y persistencia

Cada acción se registra como un evento inmutable y el estado se obtiene reproduciendo los eventos en orden (`ts`, luego `id`) con la función pura `project()`. Hay seis tipos de evento del núcleo (abajo); el resto los declara cada funcionalidad en su `events.ts`, y la lista completa, con dónde se documenta cada uno, se genera desde el código en [INDEX.md](INDEX.md#eventos--funcionalidad).

| Evento | Datos | Efecto en la proyección | Regla de conflicto |
|---|---|---|---|
| `quest_created` | `quest: QuestDef` completa | Añade la quest como `available`, con la recompensa calculada | Se ignora si el id ya existe o se retiró |
| `quest_deleted` | `questId` | Elimina la quest y deja su id retirado | Los eventos posteriores sobre ella se ignoran |
| `quest_accepted` | `questId` | `available` o espera vencida → `active`; reinicia el progreso | Solo desde un estado válido, con sus requisitos completados y fuera de la reserva |
| `quest_abandoned` | `questId` | `active` → `available` (o `cooldown` si aún no venció) | Solo si está activa |
| `progress_added` | `questId`, `conditionId`, `amount` (±1) | Suma al contador, limitado a [0, objetivo] | Delta, no valor absoluto: dos equipos suman en vez de pisarse |
| `quest_completed` | `questId`, `reward` (copia), `drops` (botín ya tirado) | Suma XP, oro y objetos; avanza el pity, la racha, el atributo y la crónica; si se repite → `cooldown`, si no → `done` | Si dos equipos la completan sin conexión, solo cuenta la primera, botín incluido |

- **Orden:** el `ts` lo pone `dispatch` con `nextTs`, un reloj lógico híbrido: como mínimo el último evento aplicado + 1 ms (sea de este equipo o de otro), salvo que ese vaya más de `MAX_DRIFT_MS` por delante del reloj ([COMO-FUNCIONA](COMO-FUNCIONA.md#el-orden)).
- **Versión:** cada evento lleva `v` (`EVENT_VERSION`); los antiguos se convierten al leerlos con `UPCASTERS` y los de una versión futura se ignoran hasta actualizar ([runbook](runbooks/migrar-evento.md)).
- **Proyección:** `PROJECTION_VERSION` (`src/domain/projection.ts`) sube cada vez que cambia el resultado de `project()` para eventos ya guardados; el snapshot de otra versión se descarta. Su historia está en el [changelog](history/CHANGELOG-TECNICO.md#versiones-de-la-proyección).
- **Copias:** la recompensa va copiada en `quest_completed` y `temporal_completed`, el precio en `gear_purchased` y `collectible_purchased`, y el botín ya tirado en `quest_completed`: cambiar fórmulas, precios o tablas no altera lo ya ganado o pagado.

**Esquema SQLite** (creado al arrancar por `openSqliteStore()`):

```sql
CREATE TABLE events (
  id        TEXT PRIMARY KEY,      -- UUID v4 del evento
  device_id TEXT NOT NULL,         -- equipo que lo generó
  ts        INTEGER NOT NULL,      -- reloj lógico híbrido, en milisegundos
  body      TEXT NOT NULL,         -- JSON con type, v y datos
  synced    INTEGER NOT NULL DEFAULT 0  -- 1 = ya subido a Drive
);
CREATE INDEX events_ts ON events (ts, id);
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- device_id, snapshot, cursores y cuenta de la sincronización
CREATE TABLE blobs (
  id      TEXT PRIMARY KEY,         -- SHA-256 del contenido
  mime    TEXT NOT NULL,
  size    INTEGER NOT NULL,
  data    TEXT NOT NULL,            -- base64 (el puente JS↔Rust viaja en JSON)
  created INTEGER NOT NULL,
  synced  INTEGER NOT NULL DEFAULT 0
);
```

La inserción usa `INSERT OR IGNORE`, así que fusionar eventos remotos repetidos es seguro. En el navegador, el mismo contrato se cumple sobre `localStorage` (eventos) e IndexedDB (binarios), solo para desarrollo.

## Ciclo de vida de una quest

Una quest tiene cuatro estados y cada transición es un evento. Para reportar, todos los objetivos tienen que estar cumplidos.

![Ciclo de vida de una quest](img/ciclo-de-vida-quest.png)

- **La espera no genera eventos:** `effectiveStatus()` compara la hora con `availableAt`, así que una quest que se repite vuelve sola al tablón aunque la app esté cerrada.
- **Bloqueada y en reserva no son estados:** una quest con requisitos pendientes (`prerequisitesMet`) o de un encargo sin aceptar (`reserved`) sigue en `available`, pero no se puede aceptar.
- **Fallar** (`quest_failed`, al acabar el día de su fecha sin completarla) la deja en `done` con `failedAt`, sin recompensa ([failure](../src/features/failure/README.md)).

## Flujos principales

Todos siguen el mismo patrón: una acción valida, emite un evento, el store aplica ese evento sobre la proyección y la interfaz anima el cambio.

**Aceptar una quest** (`Enter` o «Aceptar»):

1. `acceptQuest(id)` comprueba que esté disponible, que no le falten requisitos y que no esté en reserva.
2. `dispatch({type: "quest_accepted"})` completa el evento (`id`, `deviceId`, `ts`, `v`), lo aplica sobre una copia del acumulador (`applyEvent` + `finishProjection`) y React vuelve a pintar.
3. `QuestCard` detecta el paso a `active` y lanza la línea de tiempo GSAP: sello, sonido, temblor, destello y grietas.
4. El evento se escribe en SQLite de forma asíncrona y el aviso ofrece «Deshacer».

**Reportar una quest** (`Enter` con todos los objetivos cumplidos):

1. `reportQuest(id)` guarda el `PlayerState` de antes y tira el botín (`rollDrops`).
2. Emite `quest_completed` con la recompensa y los drops copiados.
3. Abre `ClearOverlay` con el jugador de antes y el de después: tarjeta rota, «Quest Clear», contadores de XP y oro, barra de nivel, «Level Up!» si toca y el cofre del botín.

**Sincronizar con Google Drive** ([sync](../src/features/sync/README.md)):

1. Al abrir la app, cada 5 minutos, al volver a la ventana, al ocultarla con algo sin subir y al cerrarla, `runSync` lista los archivos de Quests en Drive (lo hace Rust, con el token del llavero).
2. Baja los archivos de los otros equipos cuya `version` cambió desde el último cursor y `store.merge` inserta solo los eventos nuevos; si entró algo, recalcula la proyección.
3. Si hay eventos sin subir, sube el archivo entero del equipo y marca como subidos los que leyó antes de subir.
4. Sube los binarios que se usan y faltan en Drive, y baja los que faltan aquí. Cada equipo escribe solo en su archivo.

## Escalabilidad

| Dimensión | Situación actual | Cuándo se nota | Medida propuesta |
|---|---|---|---|
| Volumen de eventos | Cada acción aplica solo su evento; el arranque carga el último snapshot (cada 100 eventos) y lee solo los posteriores | Cada acción copia el estado entero, y un evento antiguo fusionado obliga a reproducirlo todo | Medir en la app nativa con un historial grande |
| Deriva de relojes | Reloj lógico híbrido con una deriva máxima (`MAX_DRIFT_MS`) | Un equipo con más retraso que esa deriva respecto a lo aplicado recalcula todo en cada acción hasta que su reloj lo alcanza | Recalcular desde el snapshot anterior en vez de desde cero |
| Deshacer | Cada deshacer reproduce todo el historial | Con historiales muy largos | Igual que el anterior |
| Sincronización | Un JSONL por equipo, reescrito entero cuando hay novedades | Cuando un equipo pase de unos MB de eventos | Partir el archivo por meses o compactar a snapshot |
| Binarios | Tabla `blobs` por SHA-256; se sincronizan los que se usan, uno por archivo | Con muchos PDF grandes; los que dejan de usarse no se borran de Drive | Borrar de Drive los huérfanos; avisar del espacio ocupado |
| Plataformas | macOS, Windows (CI) e iOS | Si se quiere Android | Tauri compila a Android; faltaría el inicio de sesión de Google con Custom Tabs (`web-auth` solo tiene iOS) |
| Backend propio | No hay | Si se quieren cuentas, funciones sociales o web | Un servidor detrás de la misma interfaz `EventStore` |
| Equipo | Una persona; CI en macOS y Windows | Al entrar un segundo desarrollador | Lint y CI obligatoria antes de fusionar (protección de `main`) |

## Deuda técnica y riesgos

La lista vigente. Lo resuelto pasa al [changelog](history/CHANGELOG-TECNICO.md). Si una tarea toca uno de estos puntos, se resuelve o, al menos, no se añaden casos ([AGENTES §11](AGENTES.md#11-deuda-conocida-no-la-empeores)).

| Prioridad | Problema | Riesgo | Solución |
|---|---|---|---|
| Media | Sin tests del almacén de binarios real (IndexedDB y SQLite), de los adjuntos de las acciones de encargos, de los componentes React ni de las animaciones | Romper los adjuntos o la interfaz sin enterarse | Tests de `blobStore` y de los componentes |
| Media | Windows sin probar a fondo: la CI compila y pasa los tests, y la sincronización funciona, pero nadie ha revisado la app (fuentes, animaciones, visor de PDF de WebView2) | Diferencias de WebView2 frente a WKWebView | Instalar el artefacto de la CI en un Windows real y recorrer la app |
| Media | iPhone: partes sin probar en el teléfono (lista en [mobile](../src/features/mobile/README.md#estado-actual)); con un Apple ID gratuito, la app caduca a los 7 días | Fallos que solo se ven en el teléfono | Probarlas en el iPhone; TestFlight con la cuenta de desarrollador de pago |
| Media | Avisos del sistema sin ver de verdad en ningún sistema, y en el escritorio no avisan con la app cerrada ([notifications](../src/features/notifications/README.md#estado-actual)) | Que un aviso no salga o salga dos veces | Probarlos en el simulador y el iPhone; en el escritorio, avisos programados desde Rust |
| Media | Sincronización: casos sin probar con Drive de verdad (lista en [sync](../src/features/sync/README.md#estado-actual)); la app de Google Cloud sigue en «Testing» (la sesión caduca cada 7 días) | Adjuntos que no llegan; volver a conectar cada semana | Probarlos con dos equipos; publicarla en «In production» (hoja de ruta) |
| Media | La CSP estricta no se ha revisado a simple vista en la ventana nativa (se probó la misma política en Chromium) | Algo que no carga (vídeo, PDF, fondo) | Si algo no carga, mirar primero la CSP |
| Media | App sin firma ni notarización | Avisos de Gatekeeper y SmartScreen al instalar | Certificados de Apple y Windows |
| Media | «Reducir movimiento» solo se respeta en parte: las celebraciones de `src/lib/fx.ts`, los encargos, los fallos y el menú sí; el sello, «Quest Clear» y «Level Up!» no | Animaciones intensas sin opción de reducirlas | Versión reducida de cada animación, con `calm()` |
| Baja | El límite [0, objetivo] del progreso depende del orden | Resultados distintos en casos raros de fusión | Aceptable; documentado |

## Decisiones de arquitectura

Cada decisión está en su archivo, con lo que se descartó y por qué, para no reabrirla sin un motivo nuevo: [índice de ADR](decisions/README.md). Las que sostienen el proyecto son ADR-01 (Tauri), ADR-02 (event sourcing), ADR-03 (local-first), ADR-16 (snapshot), ADR-24 y ADR-25 (versión y orden de los eventos) y ADR-28 y ADR-29 (sincronización desde Rust, un archivo por equipo).

## Hoja de ruta

Cada fase termina cuando se cumple su puerta, no en un plazo.

![Hoja de ruta: fases y puertas](img/hoja-de-ruta.png)

**Pendiente:**

- [ ] Publicar la app de Google Cloud en «In production» (en pruebas, la sesión caduca cada 7 días).
- [ ] Recorrer la app en un Windows real con el instalador de la CI.
- [ ] Ver los avisos del sistema de verdad en el iPhone, macOS y Windows.
- [ ] Logros y estadísticas.
- [ ] Versión reducida de las animaciones que aún no respetan «reducir movimiento».
- [ ] Instaladores firmados y notarizados (puerta de la fase 3: probados en macOS y Windows).
