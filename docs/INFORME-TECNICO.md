# Quests — Informe técnico de arquitectura

> **Copia del informe técnico a fecha de 2026-10-02.** El original vive como documento colaborativo en Claude: [Quests — Informe técnico de arquitectura](https://claude.ai/code/artifact/1cb3618f-d1e6-483e-a198-a1998279827b). Los diagramas de esta copia son capturas de ese documento (`docs/img/`).
>
> Las cifras de líneas de código y la tabla «Estructura del código» describen la **fase 1**. Después se añadieron idiomas (`src/i18n/`), el pomodoro como tipo de condición (`src/features/pomodoro/`), la música (`src/features/music/`) los objetos con rareza y drops (`src/features/items/`) y los encargos temporales con archivos adjuntos (`src/features/temporal/`). El diagrama de clases (imagen, redibujado el 2026-10-02) ya incluye el pomodoro, la música, los objetos (`ItemDef`, `Rarity`, `Drop`, `Pity`, `DropTable`) y los encargos temporales (`TemporalDef`, `TemporalState`, `TemporalKind`, `AttachmentRef`, `BlobStore`). La estructura vigente y las normas de trabajo están en [AGENTES.md](AGENTES.md).

---

## Resumen

La fase 1 está terminada: Quests ya funciona como app de escritorio en macOS (Tauri 2 + React 19 + TypeScript), con datos persistentes en SQLite y todas las animaciones del tablón. Son unas 1.930 líneas de TypeScript y 1.160 de CSS. Windows no se ha probado todavía y no hay tests automáticos.

Tres decisiones sostienen la escalabilidad del proyecto:

1. **Event sourcing.** No se guarda el estado («XP = 1150»), sino los hechos que lo producen. Así la sincronización entre dispositivos consiste en unir listas de eventos, sin conflictos de escritura.
2. **Dominio puro y separado de la UI.** Las reglas del juego (niveles, recompensas, estados) viven en `src/domain/` sin depender de React ni de Tauri. Se pueden testear y reutilizar en móvil o en un servidor.
3. **Almacenamiento detrás de una interfaz.** `EventStore` aísla SQLite. La fase 2 (Google Drive) y un posible backend futuro se enchufan ahí sin tocar la UI.

Para crecer con seguridad hay que resolver antes cuatro deudas: tests del dominio, versionado de eventos, orden por reloj híbrido en lugar del reloj de cada dispositivo, y snapshots para no recalcular todo el historial.

## Estado del proyecto

Todas las funciones de la fase 1 están hechas; la verificación ha sido manual (navegador integrado y app nativa en macOS).

| Funcionalidad | Estado | Cómo se verificó |
| --- | --- | --- |
| Tablón con pestañas por categoría (Élite, Repetible, Encargo) | Hecho | Prueba manual en navegador |
| Crear quest con objetivos, recompensa y tiempo de reaparición | Hecho | Prueba manual: formulario completo publicado |
| Aceptar: sello «EN CURSO», destello, temblor y grietas | Hecho | Capturas durante la animación |
| Progreso por objetivo con botones +/− | Hecho | Prueba manual |
| Reportar: tarjeta rota, «Quest Clear», contadores, «Level Up!» | Hecho | Capturas de la secuencia completa |
| Repetibles con espera («Vuelve en 20 h») | Hecho | Prueba manual tras corregir un fallo del sello |
| Abandonar y retirar quests | Hecho | Prueba manual |
| Niveles, rangos F–S, oro, huecos de quest activa | Hecho | Comprobado: 400 XP → nivel 3, 1.150 XP → nivel 4 |
| Persistencia SQLite en la app nativa | Hecho | Base `quests.db` inspeccionada con `sqlite3` |
| Atajos de teclado | Hecho | Flechas, Enter y X probados; la tecla `+` no se pudo probar |
| Sonidos sintetizados con botón de silencio | Hecho | Sin verificación auditiva |
| Build y prueba en Windows | Pendiente | — |
| Tests automáticos | Pendiente | — |
| Sincronización con Google Drive (fase 2) | Pendiente | Interfaz preparada en `EventStore` |

La base de datos de la app nativa está en `~/Library/Application Support/com.quests.app/quests.db` (macOS) y en `%APPDATA%\com.quests.app\` (Windows).

## Stack tecnológico

Tauri se eligió frente a Electron por tamaño (unos 10 MB frente a ~150 MB) y por tener un backend nativo en Rust donde irán OAuth y la sincronización. El resto es el ecosistema web estándar, el más rico para animaciones de interfaz.

| Capa | Tecnología | Versión | Papel | Por qué |
| --- | --- | --- | --- | --- |
| Contenedor de escritorio | Tauri | 2.12.1 | Ventana nativa, empaquetado, puente JS↔Rust | Binario pequeño, macOS + Windows (y móvil en el futuro) |
| Backend nativo | Rust (edición 2021) | 1.94.1 | Plugins, y en fase 2 OAuth y sync | Seguro, rápido, acceso al sistema y al llavero |
| Base de datos | SQLite vía tauri-plugin-sql (sqlx) | 2.5.0 / 0.8.6 | Almacén local de eventos | Embebida, sin servidor, transaccional |
| UI | React | 19.3.0 | Componentes de interfaz | Ecosistema y librerías de animación |
| Lenguaje | TypeScript | 6.0.3 | Tipado de dominio, eventos y UI | Errores en compilación, refactors seguros |
| Bundler | Vite | 8.3.1 | Servidor de desarrollo y build | Recarga en caliente, integrado con Tauri |
| Estado | Zustand | 5.0.15 | Store global (eventos, proyección, UI) | Mínimo, sin boilerplate, accesible fuera de React |
| Animación declarativa | Motion (Framer Motion) | 13.4.6 | Transiciones, layout, pestañas, paneles | Springs y animaciones de layout |
| Animación por línea de tiempo | GSAP | 3.15.0 | Sello, tarjeta rota, Quest Clear, Level Up | Secuencias precisas y encadenadas |
| Sonido | Web Audio API | nativo | Efectos sintetizados | Sin archivos de audio que empaquetar |
| Tipografía | Fontsource (Cormorant Garamond, Cinzel, Shippori Mincho) | 5.3.0 | Fuentes locales | Funciona sin conexión |
| Gestor de paquetes | pnpm | 11.8.0 | Dependencias JS | Rápido y determinista |

Para los idiomas se añadieron después i18next 26.4.2 y react-i18next 17.0.15 (español y japonés, unos 64 KB en el build). Todas las versiones son las instaladas en el repositorio a fecha de este informe.

## Arquitectura por capas

La app tiene dos procesos: el frontend en un WebView y un backend nativo en Rust. Toda la lógica de negocio vive en el dominio puro, en el centro.

![Arquitectura por capas: frontend, backend nativo y sync](img/arquitectura.png)

Las flechas bajan como comandos (`dispatch`) y suben como estado nuevo; ningún componente lee ni escribe SQLite directamente.

## Diagrama de clases

El modelo separa la definición inmutable de una quest (`QuestDef`) de su estado de juego (`QuestState`). Todo lo que hay en `GameState` se calcula; lo único que se guarda es `GameEvent`.

![Diagrama de clases: dominio, store y almacenamiento](img/diagrama-clases.png)

Son tipos de TypeScript, no clases con métodos: la lógica vive en funciones puras (`project`, `effectiveStatus`, `conditionsMet`), lo que facilita testearla. `quest_created` transporta un `QuestDef` completo y `quest_completed` una copia de `RewardDef`.

Una condición es de dos tipos: **contador** (`target` = cantidad, avanza con +1) o **pomodoro** (`target` = rondas, avanza con el tiempo). Cada ronda de pomodoro es concentración más descanso, salvo la última, que no tiene descanso porque la tarea ya ha terminado. Cada condición de pomodoro tiene su `Pomodoro` en `QuestState.pomodoros` (1 : 1); su estado guarda solo el avance en una línea de tiempo, así que sobrevive a cerrar la app. Los datos de la versión anterior, cuando el pomodoro era un objeto único de la quest, se convierten al leerlos (`legacy.ts`): es el primer caso real de versionado de eventos. La música (`MusicPlayer`) es la excepción deliberada: una preferencia de cada equipo, sin eventos ni sincronización, y por eso sí es una clase.

**Objetos.** `ItemDef` vive en el almanaque (`GameState.items`) y tiene nombre, rareza, tipo, descripción, imagen reducida y si sale en drops. `PlayerState` suma `inventory`, `discovered` y `pity`, todo calculado a partir de los eventos. `RewardDef.itemId` sustituye al antiguo texto `item`, que se convierte al leerlo (`features/items/legacy.ts`). Cada `Drop` de `quest_completed` copia su rareza, y `DropTable` define las probabilidades por rareza y las tiradas.

**Encargos temporales.** `TemporalDef` es algo con fecha (una cita, una entrega) que vive en su propio tablón, fuera de las quests: tipo de cartel (`TemporalKind`), dificultad de 1 a 5 calaveras, fecha (`dueAt`, o todo el día), lugar, notas, recompensa y adjuntos. `TemporalState` añade si está pendiente o cumplido, cuándo y lo ganado; están en `GameState.temporals`. Cumplir uno suma su XP y su oro al jugador. La urgencia (hoy, pronto, vencido) se calcula con la hora actual, sin eventos. Cada `AttachmentRef` lleva solo los metadatos y una miniatura: el archivo está en el almacén de binarios (`BlobStore`), con su SHA-256 como clave.

## Modelo de eventos y persistencia

Cada acción del usuario se registra como un evento inmutable. El estado se obtiene reproduciendo los eventos en orden (`ts`, luego `id`) con la función pura `project()`. Hay seis tipos de evento de quest, que son estos. El pomodoro añade otros cinco (`pomodoro_started`, `_paused`, `_resumed`, `_stopped` y `_break_skipped`), documentados en [src/features/pomodoro/README.md](../src/features/pomodoro/README.md). Los objetos añaden tres (`item_created`, `item_updated` e `item_deleted`), documentados en [src/features/items/README.md](../src/features/items/README.md). Los encargos temporales añaden seis (`temporal_created`, `_updated`, `_attached`, `_detached`, `_completed` y `_deleted`), documentados en [src/features/temporal/README.md](../src/features/temporal/README.md):

| Evento | Datos | Efecto en la proyección | Regla de conflicto |
| --- | --- | --- | --- |
| `quest_created` | `quest: QuestDef` completa | Añade la quest como `available` | Se ignora si el id ya existe |
| `quest_deleted` | `questId` | Elimina la quest | Los eventos posteriores sobre ella se ignoran |
| `quest_accepted` | `questId` | `available` o espera vencida → `active`; reinicia el progreso | Solo aplica desde un estado válido |
| `quest_abandoned` | `questId` | `active` → `available` (o `cooldown` si aún no venció) | Solo aplica si está activa |
| `progress_added` | `questId`, `conditionId`, `amount` (±1) | Suma al contador, limitado a [0, objetivo] | Delta, no valor absoluto: dos dispositivos suman en vez de pisarse |
| `quest_completed` | `questId`, `reward` (copia, con `itemId` garantizado), `drops` (botín ya tirado) | Suma XP, oro, objeto garantizado y drops; avanza el pity; repetible → `cooldown`, resto → `done` | Si dos dispositivos la completan sin conexión, solo cuenta la primera, botín incluido |

La recompensa se copia dentro de `quest_completed`. Así, editar una quest en el futuro no cambia la XP ya ganada. Lo mismo con el botín: se tira al reportar y el resultado se guarda en el evento, así que la proyección no depende del azar.

**Esquema SQLite** (creado al arrancar por `openSqliteStore()`):

```sql
CREATE TABLE events (
  id        TEXT PRIMARY KEY,      -- UUID v4 del evento
  device_id TEXT NOT NULL,         -- dispositivo que lo generó
  ts        INTEGER NOT NULL,      -- milisegundos desde epoch (reloj local)
  body      TEXT NOT NULL,         -- JSON con type + datos
  synced    INTEGER NOT NULL DEFAULT 0  -- 1 = ya subido a Drive
);
CREATE INDEX events_ts ON events (ts, id);
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- device_id, y en fase 2 cursores de sync
```

La inserción usa `INSERT OR IGNORE`, de modo que fusionar eventos remotos repetidos es seguro (idempotente). En el navegador, el mismo contrato se cumple sobre `localStorage`, solo para desarrollo.

Los archivos adjuntos de los encargos temporales no van en `events`, sino en una tabla aparte del mismo `quests.db` (ADR-11). En el navegador, en IndexedDB:

```sql
CREATE TABLE blobs (
  id      TEXT PRIMARY KEY,         -- SHA-256 del contenido
  mime    TEXT NOT NULL,
  size    INTEGER NOT NULL,
  data    TEXT NOT NULL,            -- base64 (el puente JS↔Rust viaja en JSON)
  created INTEGER NOT NULL,
  synced  INTEGER NOT NULL DEFAULT 0
);
```

## Ciclo de vida de una quest

Una quest tiene cuatro estados y cada transición corresponde a un evento. Para reportar, todos los objetivos tienen que estar cumplidos.

![Ciclo de vida de una quest: 4 estados](img/ciclo-de-vida-quest.png)

La espera no genera ningún evento: `effectiveStatus()` compara la hora actual con `availableAt`, así que una repetible vuelve sola al tablón aunque la app esté cerrada.

## Flujos principales

Todos los flujos siguen el mismo patrón: una acción valida, emite un evento, el store recalcula el estado y la UI reacciona animando el cambio.

**Aceptar una quest** (`Enter` o botón «Aceptar»):

1. `acceptQuest(id)` comprueba que la quest esté disponible y que queden huecos (`activas < player.maxActive`).
2. `dispatch({type: "quest_accepted"})` crea el evento con `id`, `deviceId` y `ts`.
3. El store recalcula `project(eventos)` y React vuelve a pintar.
4. `QuestCard` detecta el cambio a `active` y lanza la línea de tiempo GSAP: sello, sonido, temblor, destello y grietas.
5. El evento se escribe en SQLite de forma asíncrona.

**Reportar una quest** (`Enter` con todos los objetivos cumplidos):

1. `reportQuest(id)` guarda el `PlayerState` de antes.
2. Emite `quest_completed` con una copia de la recompensa.
3. Lee el `PlayerState` de después y abre `ClearOverlay` con ambos.
4. El overlay anima: tarjeta rota en 24 pedazos, «Quest Clear», contadores de XP y oro, barra de nivel y, si sube de nivel, «Level Up!».

**Sincronizar con Google Drive** (fase 2, propuesto):

1. Al abrir la app, cada 5 minutos y al cerrar: `store.unsynced()` devuelve los eventos locales no subidos.
2. Se añaden a `events-<deviceId>.jsonl` en la carpeta de la app en Drive; luego `markSynced(ids)`.
3. Se descargan los ficheros de los otros dispositivos a partir del último cursor guardado en `meta`.
4. `store.merge(remotos)` inserta solo los nuevos y se recalcula la proyección.
5. Cada dispositivo escribe solo en su propio fichero, así que nunca hay dos escritores sobre el mismo archivo.

## Estructura del código

Las dependencias van en un solo sentido: `components` → `store` → `domain` ← `storage`. El dominio no importa nada de React, Zustand ni Tauri; es la regla que hay que proteger al crecer.

| Módulo | Archivos | Líneas | Responsabilidad |
| --- | --- | --- | --- |
| `src/domain/` | types, events, projection, leveling, seed | 332 | Reglas del juego puras: tipos, eventos, proyección, curva de XP, rangos, datos de ejemplo |
| `src/storage/` | eventStore | 127 | Interfaz `EventStore` y sus dos implementaciones (SQLite y localStorage) |
| `src/store/` | game, actions | 158 | Store Zustand (eventos + estado + UI) y casos de uso (aceptar, progresar, reportar, abandonar) |
| `src/components/` | Header, Tabs, QuestCard, QuestDetail, CreateQuestModal, ClearOverlay, Footer | 1.041 | Interfaz y animaciones |
| `src/lib/` | sfx, id, time | 124 | Utilidades: sonido, UUID, PRNG con semilla, formato de tiempo |
| `src/App.tsx`, `main.tsx` | — | 152 | Composición, filtrado del tablón y navegación por teclado |
| `src/styles/` | theme, app | 1.164 | Tokens de color y tipografía; estilos de componentes |
| `src-tauri/` | lib.rs, tauri.conf.json, capabilities | ~40 | Ventana, plugin SQL y permisos mínimos (`sql:default`, `sql:allow-execute`) |

Convenciones a mantener:

- Toda escritura pasa por `dispatch(evento)`; ningún componente modifica el estado directamente.
- La lógica que decide (¿se puede aceptar?, ¿está completa?) vive en `domain/` o `store/actions.ts`, nunca en un componente.
- Las animaciones leen el cambio de estado; no lo provocan.

**Una carpeta por funcionalidad.** Cada funcionalidad nueva vive en `src/features/<nombre>/` con su modelo, eventos, acciones, componentes, textos y un `README.md` de diseño. Ya existen `pomodoro` (dominio, con eventos), `music` (servicio local, sin eventos), `items` (entidades propias, azar e imágenes) y `temporal` (sección propia, estado de UI propio y archivos adjuntos). El dominio importa solo el `model.ts` de cada funcionalidad, nunca su `index.ts`, para no crear ciclos con el store.

## Escalabilidad

La arquitectura escala bien en dispositivos y plataformas; el primer límite real será el volumen de eventos, y se resuelve con snapshots sin cambiar el modelo. Las cifras de capacidad son estimaciones, no mediciones.

| Dimensión | Situación actual | Cuándo se nota | Medida propuesta |
| --- | --- | --- | --- |
| Volumen de eventos | Cada acción recalcula todo el historial (O(n)) y la carga lee todos los eventos | Estimado: a partir de ~50.000 eventos (años de uso intenso) | Snapshot de la proyección cada N eventos + reproducir solo los posteriores; aplicar eventos de forma incremental en `dispatch` |
| Evolución del esquema | Los eventos no llevan versión | En el primer cambio de un evento ya sincronizado | Campo `v` en cada evento y funciones de migración (upcasters) al leer |
| Varios dispositivos | Orden por `ts` del reloj local | Si los relojes de dos equipos difieren varios minutos | Reloj lógico híbrido (HLC): `ts` + contador + `deviceId` |
| Sincronización | Interfaz lista (`unsynced`, `merge`, `markSynced`), sin implementación | Fase 2 | Un fichero JSONL por dispositivo en Drive; compactar a snapshot cuando superen ~1 MB |
| Escrituras en lote | `markSynced` y `merge` hacen una sentencia por evento | Al fusionar miles de eventos | Una transacción por lote |
| Plataformas | macOS probado; Windows sin probar | Ahora | CI con GitHub Actions y `tauri-action` que compile y pruebe en ambos |
| Móvil | No soportado | Si se decide sacar app móvil | Tauri 2 compila a iOS y Android; el dominio y el store se reutilizan tal cual |
| Backend propio | No hay | Si se quieren cuentas, social o web | Sustituir el sync de Drive por un servidor detrás de la misma interfaz `EventStore` |
| Equipo | Una persona, sin tests ni CI | Al entrar un segundo desarrollador | Tests del dominio con Vitest, lint, CI obligatorio antes de fusionar |
| Funcionalidad | Store único mezcla dominio y UI | Al pasar de ~10 pantallas | Separar `uiStore` del `gameStore`; un módulo por feature (quests, inventario, estadísticas). Los encargos temporales ya tienen su propio store de UI (`features/temporal/ui.ts`) |
| Archivos adjuntos | Tabla `blobs` en SQLite, por SHA-256; se borran los que nadie usa; sin sincronizar | Al sincronizar (fase 2) o con muchos PDF grandes | Subir cada archivo una sola vez por su hash (`unsynced` / `markSynced` en `BlobStore`); avisar del espacio ocupado |

## Deuda técnica y riesgos

Cinco puntos son de prioridad alta y conviene cerrarlos antes de empezar la sincronización: después, cambiar el formato de los eventos obliga a migrar datos de varios dispositivos.

| Prioridad | Problema | Riesgo | Solución |
| --- | --- | --- | --- |
| Alta | No hay tests automáticos | Romper las reglas de XP o de estados sin enterarse | Vitest sobre `projection` y `leveling` |
| Alta | Los eventos no tienen versión | Datos antiguos ilegibles tras cambiar un evento | Campo `v` + upcasters |
| Alta | Orden por reloj local | Eventos mal ordenados entre dispositivos | Reloj lógico híbrido (HLC) |
| Alta | Sin error boundary en React | Un fallo deja la ventana en negro (ocurrió durante las pruebas) | Error boundary con pantalla de recuperación |
| Alta | Tokens OAuth de la fase 2 sin destino seguro definido | Credenciales de Google expuestas en disco | Guardarlos en el llavero del sistema (crate `keyring`) |
| Media | Content Security Policy desactivada (`csp: null`) | Superficie de ataque si se carga contenido externo | CSP estricta en `tauri.conf.json`, con `blob:` en `img-src` y `frame-src` para el visor de adjuntos |
| Media | Windows sin probar | Diferencias de WebView2 frente a WKWebView en fuentes y animaciones | Build y prueba en CI |
| Media | App sin firma ni notarización, icono por defecto | Avisos de Gatekeeper y SmartScreen al instalar | Certificados de Apple y Windows; icono propio |
| Media | No respeta `prefers-reduced-motion` (parcial: las partículas y sacudidas de `src/lib/fx.ts`, que usa el cofre del botín, sí lo respetan) | Accesibilidad: animaciones intensas sin opción de reducirlas | Versión reducida de cada animación; extender `calm()` al resto |
| Baja | El límite [0, objetivo] del progreso depende del orden | Resultados distintos en casos raros de fusión | Aceptable; documentado |
| Baja | Resuelto: los textos estaban fijos en español | Ninguno ya | Hecho: i18next con español y japonés en `src/i18n/`, diccionarios tipados |
| Baja | No se pueden editar quests, solo crear y retirar | Fricción de uso | Evento `quest_updated` |

## Decisiones de arquitectura

Cada decisión queda registrada con la alternativa que se descartó, para no reabrirlas sin un motivo nuevo.

| # | Decisión | Alternativas descartadas | Motivo | Consecuencia |
| --- | --- | --- | --- | --- |
| ADR-01 | Tauri 2 como contenedor | Electron, Flutter, Godot/Unity, nativo por plataforma | Binario ~10 MB, Rust para sync/OAuth, ecosistema web para animaciones | Probar en dos motores web (WebKit en macOS, Chromium en Windows) |
| ADR-02 | Event sourcing en lugar de guardar estado | Tablas con estado actual + última escritura gana | Fusión sin conflictos entre dispositivos e historial completo | Hace falta versionado de eventos y snapshots al crecer |
| ADR-03 | SQLite local como fuente de verdad (local-first) | Base de datos remota, Supabase | Funciona sin conexión, sin coste ni servidor | La sincronización es responsabilidad de la app |
| ADR-04 | Google Drive como canal de sync, un fichero por dispositivo | Replicación MySQL, SQLite dentro de una carpeta de Drive | MySQL exige servidores siempre conectados; un SQLite compartido se corrompe con dos escritores | OAuth propio y app de Google Cloud en modo producción |
| ADR-05 | Zustand para el estado | Redux Toolkit, Context de React | Mínimo y accesible desde fuera de componentes (atajos, acciones) | Separar store de UI cuando crezca |
| ADR-06 | Motion + GSAP | Solo CSS, solo Motion, PixiJS | Motion para layout y transiciones; GSAP para secuencias largas encadenadas | Dos librerías que conocer; regla: GSAP solo en secuencias |
| ADR-07 | Sonido sintetizado con Web Audio | Archivos de audio | Cero recursos que empaquetar | Sonidos sencillos; se pueden sustituir por samples más adelante |
| ADR-08 | Fuentes locales con Fontsource | Google Fonts por red | La app funciona sin conexión | Solo el subconjunto latino: 372 KB de fuentes y 852 KB de frontend total (con los subconjuntos japoneses eran 26 MB) |
| ADR-09 | Drops aleatorios resueltos en la acción y guardados dentro de `quest_completed` | Tirar en la proyección con semilla; evento `item_dropped` aparte | La proyección sigue siendo determinista y el botín hereda la guarda contra completados duplicados | El pity se recalcula reproduciendo los drops; cambiar las tablas no altera lo ya ganado |
| ADR-10 | Imagen de los objetos reducida a 160 px y guardada como data URL en el evento | Ficheros en la carpeta de la app (plugin `fs`); imagen original | Se sincroniza con los demás eventos, sin plugin ni permisos nuevos | 3–30 KB por imagen dentro de SQLite; si se cambia mucho, valorar snapshots |
| ADR-11 | Adjuntos (PDF e imágenes de hasta 20 MB) en un almacén de binarios aparte, por su SHA-256: tabla `blobs` en SQLite e IndexedDB en el navegador; en el evento, solo la referencia y una miniatura de 320 px | El archivo dentro del evento como ADR-10; plugin `fs`; IndexedDB también en la app nativa | Un PDF de varios MB se leería en cada arranque y no cabe en `localStorage`; la misma conexión SQLite evita plugins y permisos nuevos; el hash evita duplicados entre dispositivos | La fase 2 tendrá que sincronizar binarios además de eventos; un dispositivo puede ver la referencia antes que el archivo («no está en este equipo») |
| ADR-12 | Encargos temporales como entidad y tablón propios (`TemporalDef`, sección aparte) | Una cuarta categoría de quest | Tienen fecha y se cumplen una vez: no se aceptan, no ocupan huecos ni tienen objetivos ni esperas | Comparten con las quests la recompensa (XP y oro suman al jugador), no `completedCount` ni los drops |

## Hoja de ruta

Recomiendo una fase corta de endurecimiento antes de la sincronización. Lo que se cambie en el formato de los eventos después de sincronizar obliga a migrar datos ya repartidos entre dispositivos.

![Hoja de ruta: 5 fases y 3 puertas](img/hoja-de-ruta.png)

No hay fechas comprometidas: cada fase termina cuando se cumple su puerta, no en un plazo.

**Siguientes pasos concretos:**

- [ ] Añadir Vitest y tests de `project()` y `levelFromXp()`
- [ ] Añadir el campo `v` a `EventMeta` y un upcaster vacío
- [ ] Sustituir `ts` por un reloj lógico híbrido
- [ ] Añadir un error boundary con pantalla de recuperación
- [ ] Configurar GitHub Actions con `tauri-action` para macOS y Windows
- [ ] Crear el proyecto en Google Cloud con un OAuth Client ID de tipo «Desktop app» (lo hace el propietario de la cuenta)
