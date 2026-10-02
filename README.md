# Quests

Tablón de misiones estilo JRPG para convertir tareas en *quests* con experiencia, niveles y recompensas.
App de escritorio para **macOS y Windows** con **Tauri 2 + React + TypeScript**.

## Desarrollo

```bash
pnpm install
pnpm tauri dev      # app nativa (SQLite)
pnpm dev            # solo la UI en el navegador (guarda en localStorage)
pnpm test           # tests (Vitest)
pnpm tauri build    # instalador para la plataforma actual
```

> El instalador de Windows (`.msi` / `.exe`) se compila en Windows o en CI (GitHub Actions con `tauri-action`).

## Documentación

| Documento | Contenido |
|---|---|
| [docs/AGENTES.md](docs/AGENTES.md) | **Guía obligatoria para agentes y colaboradores**: normas, mapa del código, verificación |
| [docs/INFORME-TECNICO.md](docs/INFORME-TECNICO.md) | Informe técnico: arquitectura, diagramas, eventos, escalabilidad, deuda, ADR, hoja de ruta |
| [docs/COMO-FUNCIONA.md](docs/COMO-FUNCIONA.md) | Cómo funciona cada mecanismo por dentro |
| `src/features/*/README.md` | Diseño de cada funcionalidad |

`CLAUDE.md` y `AGENTS.md` (en la raíz) dirigen a los agentes a la guía automáticamente.

## Arquitectura

> Explicación detallada de cómo funciona cada pieza por dentro: [docs/COMO-FUNCIONA.md](docs/COMO-FUNCIONA.md)

```
src/
  domain/      Lógica pura, sin UI
    types.ts        Quest, Condition, Reward, Player
    events.ts       Eventos inmutables (quest_created, quest_accepted, progress_added, quest_completed…)
    projection.ts   eventos → estado (quests, XP, nivel, oro, inventario, almanaque), de uno en uno (applyEvent)
    leveling.ts     Curva de XP, rangos F→S, huecos de quest activa
    seed.ts         Quests de ejemplo del primer arranque
  storage/
    eventStore.ts   SQLite (Tauri) o localStorage (navegador), append-only
    blobStore.ts    Archivos adjuntos por su SHA-256: tabla blobs (Tauri) o IndexedDB (navegador)
  store/
    game.ts         Estado global (zustand): proyección incremental + estado de UI
    actions.ts      Aceptar / progreso / reportar / abandonar
  components/      Header, Tabs, QuestCard, QuestDetail, CreateQuestModal, ClearOverlay, Footer
  lib/             sfx (WebAudio sintetizado), ids, tiempo
  i18n/            i18next: diccionarios es/ja tipados y selector de idioma
  features/        Una carpeta por funcionalidad, cada una con su README.md
    pomodoro/       Pomodoro como tipo de condición: N rondas, la última sin descanso
    music/          Música de fondo (las pistas van en public/music/, nunca en dist/)
    items/          Objetos con rareza: almanaque, inventario y drops al estilo Genshin
    temporal/       Encargos temporales: tablón aparte con calaveras, adjuntos PDF/imagen, quests enlazadas y sus animaciones
    complex/        Quests complejas: repetición tras completarlas (cualquier categoría) y requisitos
    horizon/        Plazos: clasificar quests y encargos por lo que falta (1 día, 7 días, 2 semanas, 1 mes, +1 mes)
    snapshot/       Snapshot de la proyección: cada clic aplica solo su evento y el arranque no reproduce todo el historial
  test/            Utilidades de los tests (historiales aleatorios con semilla)
src-tauri/         Backend Rust (plugin SQL)
```

**Una carpeta por implementación:** cada funcionalidad nueva vive en `src/features/<nombre>/` con su modelo puro, eventos, acciones, componentes, estilos, textos y un `README.md` de diseño. Fuera de la carpeta solo se tocan los puntos de integración (tipos, unión de eventos, proyección y los componentes que la alojan). Ejemplo: [src/features/pomodoro/README.md](src/features/pomodoro/README.md).

**Event sourcing:** nunca se guarda "XP = 1150"; se guardan los hechos y el estado se recalcula.
Así, fusionar datos de varios dispositivos consiste solo en unir eventos por `id` y ordenarlos por `ts`.
Para no reproducir todo el historial en cada arranque, cada 100 eventos se guarda un *snapshot* del estado calculado (una caché: se puede borrar sin perder nada). Detalles: [src/features/snapshot/README.md](src/features/snapshot/README.md).

## Animaciones

| Momento | Efecto |
|---|---|
| Aceptar | Sello «EN CURSO» que golpea, destello radial, temblor y grietas que se dibujan |
| Progreso | Barra con muelle y sonido de *tick* |
| Reportar | La tarjeta se rompe en pedazos → «QUEST CLEAR» → contadores de XP/oro → barra de nivel |
| Subir de nivel | «LEVEL UP!» con destello y sonido de arpegio |
| Clavar un encargo temporal | El texto irrumpe gigante con estela de zoom y golpea el pergamino, un destello lo recorre, la cabecera se enciende en rojo, las calaveras se estampan una a una con su mancha de tinta y la «cámara» se lanza contra el pergamino hasta fundirse en blanco; el cartel cae en el tablón con su chincheta |
| Cumplir un encargo temporal | Texto dorado gigante, fogonazo con destellos horizontales y rayos, silueta del aventurero, calaveras que se vuelven de oro y un contador de oro que gira como una tragaperras hasta la campanilla |
| Botín | Un cofre que se abre con un clic: se carga de luz (su color sube de rareza), estalla con monedas y rayos y la interfaz vibra; cada objeto aterriza con un golpe proporcional a su rareza y los mejores traen fanfarria y rótulo |

## Objetos

Seis rarezas con su color: común (gris), poco común (verde), raro (azul), épico (morado), mítico (rojo) y legendario (dorado). Los objetos se crean en el almanaque (tecla `I`) con nombre, imagen, rareza, tipo y descripción. Cada quest da su objeto garantizado (opcional) y un botín aleatorio: 1 tirada estándar, o 2 mejoradas en las de élite, con pity como en Genshin. Detalles: [src/features/items/README.md](src/features/items/README.md).

## Encargos temporales

Un tablón aparte (selector de la cabecera o tecla `T`) para lo que ocurre en una fecha: una cita con el médico, una entrega, un examen… Cada encargo es un cartel de pergamino clavado en un tablón de roble, con de 1 a 5 **calaveras rojas** según su dificultad, su fecha y hora (o todo el día), lugar, notas y recompensa en XP y oro. Se le pueden **adjuntar PDF e imágenes** (hasta 20 MB cada uno y 8 por encargo), que se ven en un visor dentro de la app. Los de hoy o vencidos se avisan al abrir la app, y los que tienen hora, 15 minutos antes. Detalles: [src/features/temporal/README.md](src/features/temporal/README.md).

## Quests complejas y plazos

- **Repetición:** cualquier quest puede volver al tablón tras completarla («cada 3 días», «cada 2 semanas»…), no solo las repetibles.
- **Requisitos:** una quest puede pedir otras; hasta completarlas sale con candado y no se puede aceptar. Al completar la última, avisa de lo que desbloquea. Detalles: [src/features/complex/README.md](src/features/complex/README.md).
- **Plazos:** los dos tablones tienen un filtro con contador (tecla `H`): **1 día** (hoy, mañana o vencido), **7 días**, **2 semanas**, **1 mes** y **+1 mes** (y **sin fecha** en el de quests). Las quests pueden tener fecha límite; las de un encargo toman la suya. Detalles: [src/features/horizon/README.md](src/features/horizon/README.md).
- **Encargos con quests:** al clavar un encargo se le pueden añadir quests (se crean solas en el Quest Board, si se quiere en cadena) o enlazar quests que ya existen. El encargo no se puede cumplir hasta terminarlas todas.

## Idiomas

Español y japonés con i18next (`src/i18n/`). Selector `ES | 日本語` en la cabecera o tecla `L`.

## Atajos

`↑↓←→` moverse · `Enter`/`A` aceptar o reportar · `+` progreso · `X` abandonar · `Q`/`E` categoría · `H` plazo (`Shift+H` hacia atrás) · `N` nueva quest · `T` tablón de encargos temporales · `I` objetos · `L` idioma · `M` música

En el tablón de encargos: `↑↓←→` moverse · `Enter` abrir el cartel · `H` plazo · `N` nuevo encargo · `T` volver al Quest Board. Con el cartel abierto: `Enter` cumplir · `E` editar · `Esc` cerrar.

## Hoja de ruta

- [x] **Fase 1:** UI, animaciones, SQLite local con eventos
- [x] Idiomas español y japonés (i18next)
- [x] Pomodoro como tipo de condición, con rondas (`src/features/pomodoro/`)
- [x] Música de fondo (`src/features/music/`)
- [x] Objetos con rareza, inventario, almanaque y drops (`src/features/items/`)
- [x] Encargos temporales con calaveras, adjuntos PDF/imagen y recordatorios (`src/features/temporal/`)
- [x] Quests complejas: repetición y requisitos (`src/features/complex/`); plazos (`src/features/horizon/`); encargos enlazados con quests
- [x] Snapshot de la proyección (`src/features/snapshot/`) y 231 tests con Vitest del dominio y el store
- [ ] **Fase 2:** sincronización con Google Drive
  - OAuth 2 PKCE con redirección a loopback desde Rust, scope `drive.file`
  - Cada dispositivo sube `events-<deviceId>.jsonl` a la carpeta `QuestsApp/`
  - Descargar los ficheros de los demás → `EventStore.merge()` → reproyectar
  - Publicar la app de Google Cloud en modo *In production* (en *Testing* el token caduca cada 7 días)
- [ ] Logros, estadísticas, quests diarias automáticas, icono propio
