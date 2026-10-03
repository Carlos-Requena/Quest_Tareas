# Quests

Tablón de misiones estilo JRPG para convertir tareas en *quests* con experiencia, niveles y recompensas.
App para **macOS, Windows e iPhone** con **Tauri 2 + React + TypeScript**.

## Desarrollo

```bash
pnpm install
pnpm tauri dev      # app nativa (SQLite)
pnpm dev            # solo la UI en el navegador (guarda en localStorage)
pnpm test           # tests (Vitest)
pnpm tauri build    # instalador para la plataforma actual
pnpm tauri ios dev  # iPhone o simulador (antes: rustup target add aarch64-apple-ios aarch64-apple-ios-sim)
```

> **iPhone:** la misma app compilada para iOS, con interfaz de teléfono ([src/features/mobile/README.md](src/features/mobile/README.md)). Cómo instalarla en el iPhone con un Apple ID gratuito y las trampas del entorno: [docs/AGENTES.md](docs/AGENTES.md), «iPhone». Para sincronizar, un segundo cliente OAuth de tipo «iOS» en `src-tauri/google-client-ios.plist`.

> **Sincronización con Google Drive:** copia el JSON de tu cliente OAuth («App de escritorio», en Google Cloud) a `src-tauri/google-client.json`. Está en `.gitignore` y se incrusta al compilar. Sin él, la app funciona igual, pero sin sincronizar. En la CI, los secretos `QUESTS_GOOGLE_CLIENT_ID` y `QUESTS_GOOGLE_CLIENT_SECRET`.

> El instalador de Windows (`.msi` / `.exe`) se compila en Windows o en la CI: `.github/workflows/ci.yml` comprueba tipos, pasa los tests y compila la app en macOS y Windows en cada push y pull request, y deja los instaladores (sin firmar) como artefactos del run.

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
    events.ts       Eventos inmutables (quest_created, quest_accepted, progress_added, quest_completed…), con versión y reloj lógico híbrido
    upcast.ts       Versión de los eventos: los antiguos se convierten al leerlos, los de una versión futura se ignoran
    projection.ts   eventos → estado (quests, XP, nivel, oro, inventario, almanaque), de uno en uno (applyEvent)
    leveling.ts     Curva de XP y rangos F→S
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
    merchant/       Mercader (Hu Tao): catálogo de equipo y decoración, precios por rareza, escaparate semanal y compras
    equipment/      Personaje: el muñeco con su equipo, el armario y la decoración del menú (fondo y emblema)
    attributes/     Atributos: un nivel por cada área de las quests, con su radar
    recovery/       Error boundary: pantalla de recuperación si falla la interfaz, en vez de la ventana en negro
    sync/           Sincronización con Google Drive: un archivo de eventos por equipo y los adjuntos, con su nube en la cabecera
  test/            Utilidades de los tests (historiales aleatorios con semilla)
src-tauri/         Backend Rust: plugin SQL, inicio de sesión con Google y Drive (src/sync, token en el llavero); la CSP estricta está en tauri.conf.json
```

**Una carpeta por implementación:** cada funcionalidad nueva vive en `src/features/<nombre>/` con su modelo puro, eventos, acciones, componentes, estilos, textos y un `README.md` de diseño. Fuera de la carpeta solo se tocan los puntos de integración (tipos, unión de eventos, proyección y los componentes que la alojan). Ejemplo: [src/features/pomodoro/README.md](src/features/pomodoro/README.md).

**Event sourcing:** nunca se guarda "XP = 1150"; se guardan los hechos y el estado se recalcula.
Así, fusionar datos de varios dispositivos consiste solo en unir eventos por `id` y ordenarlos por `ts`, que es un reloj lógico híbrido: lo que haces después de ver un evento va siempre detrás de él, aunque tu reloj vaya algo atrasado. Cada evento lleva la versión de su formato (`v`) para poder cambiarlo sin romper los datos ya guardados.
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
| Comprar al mercader | Hu Tao comenta la pieza en su cuadro de diálogo; al pagar, un sello rojo «SOLD» cae sobre su escaparate con lluvia de monedas (y fanfarria y estrellas desde épico) |
| Ponerse una pieza | La pieza cae sobre el muñeco con un muelle, en el color de su rareza; lo mítico y lo legendario brillan |
| Botín | Un cofre que se abre con un clic: se carga de luz (su color sube de rareza), estalla con monedas y rayos y la interfaz vibra; cada objeto aterriza con un golpe proporcional a su rareza y los mejores traen fanfarria y rótulo |

## Objetos

Seis rarezas con su color: común (gris), poco común (verde), raro (azul), épico (morado), mítico (rojo) y legendario (dorado). Los objetos se crean en el almanaque (tecla `I`) con nombre, imagen, rareza, tipo y descripción. Cada quest da su objeto garantizado (opcional) y un botín aleatorio: 1 tirada estándar, o 2 mejoradas en las de élite, con pity como en Genshin. Detalles: [src/features/items/README.md](src/features/items/README.md).

## Mercader, personaje y atributos

- **Mercader** (tecla `C` o el farol de la cabecera): **Hu Tao** vende equipo para el personaje y decoración del menú. Comprar cuesta: el precio lo pone ella según la rareza y la ranura (de 1.200 G a 160.000 G), lo bueno pide rango (de F a A) y cada semana solo saca 5 piezas a su escaparate, más las recién añadidas. Trae **69 piezas de serie** inspiradas en Mushoku Tensei, Re:Zero, Konosuba y los JRPG clásicos ([src/features/armory/README.md](src/features/armory/README.md)), y se pueden añadir más a mano desde la tienda, sin precio. Detalles: [src/features/merchant/README.md](src/features/merchant/README.md).
- **Personaje** (tecla `P` o el yelmo de la cabecera): un muñeco que se pone lo que compras (cabeza, cuerpo, manos, pies, arma, escudo, capa y amuleto) y dos ranuras de decoración: el **fondo** de la app y el **emblema** de la cabecera. Detalles: [src/features/equipment/README.md](src/features/equipment/README.md).
- **Atributos**: cada área de las quests (Salud, Estudio…) sube de nivel con su XP, y se ven en un radar junto al muñeco. Las áreas habituales se traducen («Salud» y «健康» son la misma). Detalles: [src/features/attributes/README.md](src/features/attributes/README.md).

## Rachas, listas y crónica

- **Rachas**: las quests que se repiten cuentan las veces seguidas que las completas a tiempo, con una llama en la tarjeta. Detalles: [src/features/streaks/README.md](src/features/streaks/README.md).
- **Objetivo de tipo lista**: casillas que se marcan una a una («Hacer la maleta: pasaporte, cargador…»). Detalles: [src/features/checklist/README.md](src/features/checklist/README.md).
- **Crónica del aventurero** (tecla `J` o el libro de la cabecera): un diario gastado con lo que has hecho, día a día, con tus subidas de nivel y de atributo. Detalles: [src/features/chronicle/README.md](src/features/chronicle/README.md).

## Encargos temporales

Un tablón aparte (selector de la cabecera o tecla `T`) para lo que ocurre en una fecha: una cita con el médico, una entrega, un examen… Cada encargo es un cartel de pergamino clavado en un tablón de roble, con de 1 a 5 **calaveras rojas** según su dificultad, su fecha y hora (o todo el día), lugar, notas y recompensa en XP y oro. Se le pueden **adjuntar PDF e imágenes** (hasta 20 MB cada uno y 8 por encargo), que se ven en un visor dentro de la app. Los de hoy o vencidos se avisan al abrir la app, y los que tienen hora, 15 minutos antes. Un encargo se clava **sin aceptar** (sus quests esperan en reserva, fuera del Quest Board) y se **acepta** cuando se empieza, con su sello «ACCEPTED»; el tablón se filtra por Todos · Aceptados · Sin aceptar. Detalles: [src/features/temporal/README.md](src/features/temporal/README.md).

## Calendario y agenda

Una tercera sección (selector de la cabecera o tecla `S`): la **semana** con lo que hay que hacer cada día (quests con fecha límite, encargos y bloques de la agenda) y el **día por horas**, la agenda personal con bloques que se repiten ciertos días de la semana. Desde cada día se añade un bloque, una quest con esa fecha límite o un encargo. Detalles: [src/features/calendar/README.md](src/features/calendar/README.md) y [src/features/agenda/README.md](src/features/agenda/README.md).

## Contactos

Las quests y los encargos pueden llevar contactos (teléfono, correo, WhatsApp, enlace o dirección), elegidos en un desplegable, con un botón para llamar, escribir, abrir o ver cómo llegar. Detalles: [src/features/contacts/README.md](src/features/contacts/README.md).

## Quests complejas y plazos

- **Repetición:** cualquier quest puede volver al tablón tras completarla («cada 3 días», «cada 2 semanas»…), no solo las repetibles.
- **Requisitos:** una quest puede pedir otras; hasta completarlas sale con candado y no se puede aceptar. Al completar la última, avisa de lo que desbloquea. Detalles: [src/features/complex/README.md](src/features/complex/README.md).
- **Plazos:** los dos tablones tienen un filtro con contador (tecla `H`): **1 día** (hoy, mañana o vencido), **7 días**, **2 semanas**, **1 mes** y **+1 mes** (y **sin fecha** en el de quests). Las quests pueden tener fecha límite; las de un encargo toman la suya. Detalles: [src/features/horizon/README.md](src/features/horizon/README.md).
- **Encargos con quests:** al clavar un encargo se le pueden añadir quests (se crean solas en el Quest Board, si se quiere en cadena) o enlazar quests que ya existen. El encargo no se puede cumplir hasta terminarlas todas.

## Idiomas

Español y japonés con i18next (`src/i18n/`). Selector `ES | 日本語` en la cabecera o tecla `L`.

## Atajos

`↑↓←→` moverse · `Enter`/`A` aceptar o reportar · `+` progreso · `X` abandonar · `Q`/`E` categoría · `H` plazo (`Shift+H` hacia atrás) · `N` nueva quest · `T` tablón de encargos temporales · `S` calendario · `I` objetos · `C` mercader · `P` personaje · `J` crónica · `L` idioma · `M` música

En el tablón de encargos: `↑↓←→` moverse · `Enter` abrir el cartel · `H` plazo · `N` nuevo encargo · `T` volver al Quest Board. Con el cartel abierto: `Enter` aceptar (si no lo está) o cumplir · `E` editar · `Esc` cerrar.

En el calendario: `←→` semana o día anterior / siguiente · `V` semana ↔ día · `H` hoy · `N` bloque nuevo · `S` volver al Quest Board.

## Hoja de ruta

- [x] **Fase 1:** UI, animaciones, SQLite local con eventos
- [x] Idiomas español y japonés (i18next)
- [x] Pomodoro como tipo de condición, con rondas (`src/features/pomodoro/`)
- [x] Música de fondo (`src/features/music/`)
- [x] Objetos con rareza, inventario, almanaque y drops (`src/features/items/`)
- [x] Encargos temporales con calaveras, adjuntos PDF/imagen y recordatorios (`src/features/temporal/`)
- [x] Quests complejas: repetición y requisitos (`src/features/complex/`); plazos (`src/features/horizon/`); encargos enlazados con quests
- [x] Snapshot de la proyección (`src/features/snapshot/`) y tests con Vitest del dominio y el store (302)
- [x] Mercader con Hu Tao (`src/features/merchant/`), personaje con su equipo (`src/features/equipment/`) y atributos por área (`src/features/attributes/`)
- [x] Equipo de serie (`src/features/armory/`), rachas (`src/features/streaks/`), objetivo de tipo lista (`src/features/checklist/`) y crónica del aventurero (`src/features/chronicle/`)
- [x] **Fase 1.5 (endurecimiento):** eventos versionados, reloj lógico híbrido, error boundary (`src/features/recovery/`), CSP estricta y CI en verde en macOS y Windows (314 tests)
- [x] **Fase 2:** sincronización con Google Drive (`src/features/sync/`)
  - OAuth 2 PKCE con redirección a loopback desde Rust, scope `drive.file`, token en el llavero
  - Cada dispositivo sube `events-<deviceId>.jsonl` a la carpeta `QuestsApp/`, y los adjuntos como `blob-<sha256>`
  - Descargar los ficheros de los demás → `EventStore.merge()` → reproyectar
  - Pendiente: publicar la app de Google Cloud en modo *In production* (en *Testing* hay que volver a conectar cada 7 días) y probarla en Windows
- [x] Encargos aceptados y sin aceptar (`src/features/temporal/`), contactos (`src/features/contacts/`), calendario semanal (`src/features/calendar/`) y agenda por horas (`src/features/agenda/`)
- [ ] Logros, estadísticas, editar quests, consecuencias, icono propio
