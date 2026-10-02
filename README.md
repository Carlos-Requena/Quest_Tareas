# Quests

Tablón de misiones estilo JRPG para convertir tareas en *quests* con experiencia, niveles y recompensas.
App de escritorio para **macOS y Windows** con **Tauri 2 + React + TypeScript**.

## Desarrollo

```bash
pnpm install
pnpm tauri dev      # app nativa (SQLite)
pnpm dev            # solo la UI en el navegador (guarda en localStorage)
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
    projection.ts   eventos → estado (quests, XP, nivel, oro, inventario, almanaque)
    leveling.ts     Curva de XP, rangos F→S, huecos de quest activa
    seed.ts         Quests de ejemplo del primer arranque
  storage/
    eventStore.ts   SQLite (Tauri) o localStorage (navegador), append-only
  store/
    game.ts         Estado global (zustand): eventos + proyección + estado de UI
    actions.ts      Aceptar / progreso / reportar / abandonar
  components/      Header, Tabs, QuestCard, QuestDetail, CreateQuestModal, ClearOverlay, Footer
  lib/             sfx (WebAudio sintetizado), ids, tiempo
  i18n/            i18next: diccionarios es/ja tipados y selector de idioma
  features/        Una carpeta por funcionalidad, cada una con su README.md
    pomodoro/       Pomodoro como tipo de condición: N rondas, la última sin descanso
    music/          Música de fondo (las pistas van en public/music/, nunca en dist/)
    items/          Objetos con rareza: almanaque, inventario y drops al estilo Genshin
src-tauri/         Backend Rust (plugin SQL)
```

**Una carpeta por implementación:** cada funcionalidad nueva vive en `src/features/<nombre>/` con su modelo puro, eventos, acciones, componentes, estilos, textos y un `README.md` de diseño. Fuera de la carpeta solo se tocan los puntos de integración (tipos, unión de eventos, proyección y los componentes que la alojan). Ejemplo: [src/features/pomodoro/README.md](src/features/pomodoro/README.md).

**Event sourcing:** nunca se guarda "XP = 1150"; se guardan los hechos y el estado se recalcula.
Así, fusionar datos de varios dispositivos consiste solo en unir eventos por `id` y ordenarlos por `ts`.

## Animaciones

| Momento | Efecto |
|---|---|
| Aceptar | Sello «EN CURSO» que golpea, destello radial, temblor y grietas que se dibujan |
| Progreso | Barra con muelle y sonido de *tick* |
| Reportar | La tarjeta se rompe en pedazos → «QUEST CLEAR» → contadores de XP/oro → barra de nivel |
| Subir de nivel | «LEVEL UP!» con destello y sonido de arpegio |
| Botín | Cada objeto gira y brilla con el color de su rareza; más notas cuanto más raro |

## Objetos

Seis rarezas con su color: común (gris), poco común (verde), raro (azul), épico (morado), mítico (rojo) y legendario (dorado). Los objetos se crean en el almanaque (tecla `I`) con nombre, imagen, rareza, tipo y descripción. Cada quest da su objeto garantizado (opcional) y un botín aleatorio: 1 tirada estándar, o 2 mejoradas en las de élite, con pity como en Genshin. Detalles: [src/features/items/README.md](src/features/items/README.md).

## Idiomas

Español y japonés con i18next (`src/i18n/`). Selector `ES | 日本語` en la cabecera o tecla `L`.

## Atajos

`↑↓←→` moverse · `Enter`/`A` aceptar o reportar · `+` progreso · `X` abandonar · `Q`/`E` categoría · `N` nueva quest · `I` objetos · `L` idioma · `M` música

## Hoja de ruta

- [x] **Fase 1:** UI, animaciones, SQLite local con eventos
- [x] Idiomas español y japonés (i18next)
- [x] Pomodoro como tipo de condición, con rondas (`src/features/pomodoro/`)
- [x] Música de fondo (`src/features/music/`)
- [x] Objetos con rareza, inventario, almanaque y drops (`src/features/items/`)
- [ ] **Fase 2:** sincronización con Google Drive
  - OAuth 2 PKCE con redirección a loopback desde Rust, scope `drive.file`
  - Cada dispositivo sube `events-<deviceId>.jsonl` a la carpeta `QuestsApp/`
  - Descargar los ficheros de los demás → `EventStore.merge()` → reproyectar
  - Publicar la app de Google Cloud en modo *In production* (en *Testing* el token caduca cada 7 días)
- [ ] Logros, estadísticas, quests diarias automáticas, icono propio
