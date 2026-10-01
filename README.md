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

## Arquitectura

```
src/
  domain/      Lógica pura, sin UI
    types.ts        Quest, Condition, Reward, Player
    events.ts       Eventos inmutables (quest_created, quest_accepted, progress_added, quest_completed…)
    projection.ts   eventos → estado (quests, XP, nivel, oro, objetos)
    leveling.ts     Curva de XP, rangos F→S, huecos de quest activa
    seed.ts         Quests de ejemplo del primer arranque
  storage/
    eventStore.ts   SQLite (Tauri) o localStorage (navegador), append-only
  store/
    game.ts         Estado global (zustand): eventos + proyección + estado de UI
    actions.ts      Aceptar / progreso / reportar / abandonar
  components/      Header, Tabs, QuestCard, QuestDetail, CreateQuestModal, ClearOverlay, Footer
  lib/             sfx (WebAudio sintetizado), ids, tiempo
src-tauri/         Backend Rust (plugin SQL)
```

**Event sourcing:** nunca se guarda "XP = 1150"; se guardan los hechos y el estado se recalcula.
Así, fusionar datos de varios dispositivos consiste solo en unir eventos por `id` y ordenarlos por `ts`.

## Animaciones

| Momento | Efecto |
|---|---|
| Aceptar | Sello «EN CURSO» que golpea, destello radial, temblor y grietas que se dibujan |
| Progreso | Barra con muelle y sonido de *tick* |
| Reportar | La tarjeta se rompe en pedazos → «QUEST CLEAR» → contadores de XP/oro → barra de nivel |
| Subir de nivel | «LEVEL UP!» con destello y sonido de arpegio |

## Atajos

`↑↓←→` moverse · `Enter`/`A` aceptar o reportar · `+` progreso · `X` abandonar · `Q`/`E` categoría · `N` nueva quest

## Hoja de ruta

- [x] **Fase 1:** UI, animaciones, SQLite local con eventos
- [ ] **Fase 2:** sincronización con Google Drive
  - OAuth 2 PKCE con redirección a loopback desde Rust, scope `drive.file`
  - Cada dispositivo sube `events-<deviceId>.jsonl` a la carpeta `QuestsApp/`
  - Descargar los ficheros de los demás → `EventStore.merge()` → reproyectar
  - Publicar la app de Google Cloud en modo *In production* (en *Testing* el token caduca cada 7 días)
- [ ] Inventario/logros, estadísticas, quests diarias automáticas, icono propio
