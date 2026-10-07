# Quests

Tablón de misiones estilo JRPG para convertir tareas en *quests* con experiencia, niveles y recompensas. App para **macOS, Windows e iPhone** con **Tauri 2 + React + TypeScript**, local-first (eventos en SQLite) y sincronizada entre equipos por Google Drive.

- **Quest Board:** quests con objetivos (contador, pomodoro o lista), que se repiten o piden otras antes, con XP, oro, rachas, botín en un cofre y animaciones («EN CURSO», «QUEST CLEAR», «LEVEL UP!»).
- **Encargos:** un tablón aparte para lo que tiene fecha (citas, entregas), con calaveras según la dificultad, adjuntos y quests enlazadas; se clavan sin aceptar y se aceptan al empezarlos.
- **Calendario:** Mi día, la semana y una agenda personal por horas.
- **Menú de opciones:** el mercader (Hu Tao), el personaje con su equipo y sus atributos, los objetos y el almanaque, la crónica del aventurero y los ajustes, con un personaje que cambia cada día.
- **Día a día:** editar, deshacer, alta rápida de una línea, fallos que se fracturan o se queman, búsqueda y avisos del sistema. En español y japonés, con música de fondo.

La lista completa, con un enlace al diseño de cada funcionalidad, está en [docs/INDEX.md](docs/INDEX.md#funcionalidades).

## Empezar

```bash
pnpm install
pnpm tauri dev      # app nativa (SQLite)
pnpm dev            # solo la interfaz en el navegador (datos en localStorage)
```

Todos los comandos (tests, build, documentación, instaladores) están en [docs/AGENTES.md](docs/AGENTES.md#3-comandos). El iPhone, en [docs/runbooks/compilar-ios.md](docs/runbooks/compilar-ios.md). Para sincronizar hace falta la credencial de Google en `src-tauri/google-client.json` (fuera del repositorio; sin ella la app funciona igual, sin sincronizar): [docs/runbooks/verificar-sync.md](docs/runbooks/verificar-sync.md).

La CI (`.github/workflows/ci.yml`) comprueba tipos, tests y documentación y compila la app en macOS y Windows en cada push y pull request; los instaladores (sin firmar) quedan como artefactos del run.

## Documentación

- **[docs/AGENTES.md](docs/AGENTES.md)**: normas obligatorias para agentes y colaboradores, comandos y mapa del código. Su sección 10 dice qué documento es la fuente de cada tema.
- **[docs/INDEX.md](docs/INDEX.md)**: qué leer para cada tarea, y las tablas generadas desde el código (funcionalidades, eventos, dependencias, preferencias).
- **`src/features/<nombre>/README.md`**: todo lo de cada funcionalidad ([plantilla](docs/templates/feature-readme.md)).

`CLAUDE.md` y `AGENTS.md` dirigen a los agentes a la guía.

## Atajos

**En el Quest Board:** `↑↓←→` moverse · `Enter`/`A` aceptar o reportar · `+` progreso · `X` abandonar · `R` editar · `Q`/`E` categoría · `H` plazo (`Shift+H` hacia atrás) · `N` alta rápida · `Shift+N` formulario completo · `⌘Z` deshacer.

**En cualquier sección:** `T` tablón de encargos · `S` calendario · `O` menú de opciones (`Esc` u `O` para volver) · `/` o `⌘K` buscar · `I` objetos · `C` mercader · `P` personaje · `J` crónica · `L` idioma · `M` música.

**En el tablón de encargos:** `↑↓←→` moverse · `Enter` abrir el cartel · `H` plazo · `N` nuevo encargo · `T` volver al Quest Board. Con el cartel abierto: `Enter` aceptar (si no lo está) o cumplir · `E` editar · `Esc` cerrar.

**En el calendario:** `←→` semana o día anterior / siguiente (desde Mi día, el día por horas) · `V` Mi día → semana → día · `H` hoy · `N` bloque nuevo · `S` volver al Quest Board.

Las teclas de cada ventana (mercader, personaje, crónica…) están en el README de su funcionalidad.
