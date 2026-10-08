# Índice de la documentación

Qué leer para cada tarea. Las tablas de las secciones siguientes las escribe `pnpm docs:index` a partir del código y del frontmatter de los README, y `pnpm docs:check` (la CI) falla si se desfasan.

## Por tarea

| Quiero… | Lee, en este orden |
|---|---|
| Cambiar algo de una funcionalidad | Su README («Dependencias» dice si hace falta algo más; «Dónde está cada cosa», qué símbolo tocar) → [verificar-ui](runbooks/verificar-ui.md) |
| Tocar un archivo compartido (`src/App.tsx`, `src/components/*`, `src/domain/*`, `src/store/*`) | [Archivos compartidos](#archivos-compartidos--funcionalidades) (qué funcionalidades se integran ahí) → los README de esas → [COMO-FUNCIONA](COMO-FUNCIONA.md) si es un mecanismo general |
| Crear una funcionalidad | [nueva-funcionalidad](runbooks/nueva-funcionalidad.md) → [plantilla](templates/feature-readme.md) |
| Añadir un evento o cambiar uno | [migrar-evento](runbooks/migrar-evento.md) → [features/snapshot](../src/features/snapshot/README.md) si cambia la proyección |
| Entender el store, la proyección o el orden de los eventos | [COMO-FUNCIONA §4 y §7](COMO-FUNCIONA.md#4-event-sourcing-guardar-hechos-no-estado) |
| Tocar Rust, un plugin, un permiso o la CSP | [COMO-FUNCIONA §3](COMO-FUNCIONA.md#3-tauri-por-dentro-dos-procesos-y-un-puente) → [verificar-tauri](runbooks/verificar-tauri.md) |
| Compilar o probar en el iPhone | [compilar-ios](runbooks/compilar-ios.md) → [features/mobile](../src/features/mobile/README.md) |
| Tocar la sincronización | [features/sync](../src/features/sync/README.md) → [verificar-sync](runbooks/verificar-sync.md) |
| Cambiar una animación o un sonido | El README de su funcionalidad (sección «Interfaz») → [COMO-FUNCIONA §9 y §10](COMO-FUNCIONA.md#9-las-animaciones-por-dentro) |
| Cambiar textos o añadir un idioma | [COMO-FUNCIONA §12](COMO-FUNCIONA.md#12-idiomas-español-y-japonés) |
| Cambiar precios, XP, oro o probabilidades | **Pregunta antes al propietario** → [COMO-FUNCIONA §14](COMO-FUNCIONA.md#14-dónde-se-ajusta-el-equilibrio-del-juego) |
| Cambiar el modelo de datos | [INFORME, diagrama de clases](INFORME-TECNICO.md#diagrama-de-clases) → [redibujar-diagramas](runbooks/redibujar-diagramas.md) |
| Saber por qué algo es así | [decisions/](decisions/README.md) (la ADR que cite el README) |
| Saber qué falta por probar o arreglar | El «Estado actual» del README → [INFORME, deuda](INFORME-TECNICO.md#deuda-técnica-y-riesgos) |
| Saber qué pasó antes (fallos, cifras, verificaciones) | [history/](history/README.md) |
| Probar con la app vacía | [verificar-ui, empezar de cero](runbooks/verificar-ui.md#empezar-de-cero-en-el-navegador); la app nativa, solo con permiso: [verificar-tauri](runbooks/verificar-tauri.md#empezar-de-cero) |

## Documentos

Qué contiene cada documento y cuál es la fuente única de cada tema lo fija [AGENTES §10](AGENTES.md#10-norma-documentación-una-fuente-por-tema). Este índice solo ayuda a navegar: si algo de aquí choca con el documento que enlaza, manda el documento.

## Funcionalidades

Resumen, tipo y eventos salen del frontmatter de cada README; «Verificada» es la última verificación en ejecución de su «Estado actual».

<!-- generado:funcionalidades -->
> Esta tabla se genera con `pnpm docs:index`. No editar manualmente: los cambios se pierden al regenerarla.

| Funcionalidad | Tipo | Qué hace | Eventos | Verificada |
|---|---|---|---|---|
| [Agenda](../src/features/agenda/README.md) | dominio | Agenda personal por horas con bloques de un día o que se repiten ciertos días de la semana; sin XP ni oro. | `agenda_created`, `agenda_updated`, `agenda_skipped`, `agenda_deleted` | 2026-10-03 |
| [Equipo de serie](../src/features/armory/README.md) | dominio | 69 piezas de serie para el mercader (Mushoku Tensei, Re:Zero, Konosuba y JRPG clásicos), en el código y con arte SVG generado. | — | 2026-10-02 |
| [Atributos](../src/features/attributes/README.md) | dominio | Un nivel por cada área de las quests (Salud, Estudio…), calculado de las quests completadas y dibujado en un radar junto al muñeco. | — | 2026-10-02 |
| [Calendario](../src/features/calendar/README.md) | presentación | Tercera sección (tecla S) donde se planifica: Mi día, la semana con quests con fecha, encargos y agenda, y el día por horas. | — | 2026-10-06 |
| [Objetivo de tipo lista](../src/features/checklist/README.md) | dominio | Tercer tipo de objetivo, junto al contador y al pomodoro, con casillas que se marcan una a una. | `checklist_checked` | 2026-10-02 |
| [Crónica del aventurero](../src/features/chronicle/README.md) | dominio | Diario gastado con lo que has hecho cada día (quests, encargos, compras, fallos, subidas de nivel y de atributo), apuntado por la proyección. | — | 2026-10-02 |
| [Coleccionable de la semana](../src/features/collectibles/README.md) | dominio | Hu Tao vende cada semana un coleccionable de cofre mítico o superior que no tienes, caro y sin requisito de rango. | `collectible_purchased` | 2026-10-03 |
| [Compañero de Mi día](../src/features/companion/README.md) | dominio | Un personaje del menú acompaña en «Mi día» con un cuadro de diálogo de JRPG que comenta la situación del día, con frases de serie o escritas por el jugador. | `companion_chosen`, `companion_line_added`, `companion_line_updated`, `companion_line_removed` | 2026-10-08 |
| [Quests complejas](../src/features/complex/README.md) | dominio | Repetición en cualquier categoría (cada N horas o días, o ciertos días de la semana) y requisitos con candado entre quests. | — | 2026-10-06 |
| [Contactos](../src/features/contacts/README.md) | dominio | Teléfono, correo, WhatsApp, enlace o dirección en quests y encargos, con su botón para llamar, escribir, abrir o ver cómo llegar. | — | 2026-10-03 |
| [Personalización](../src/features/customize/README.md) | presentación | Ventana del menú (tarjeta Customize) para añadir personajes del menú (imagen, GIF o vídeo), lo que dicen en el menú y en «Mi día», cómo se mueven e ilustraciones de «Encargo cumplido». | — | 2026-10-08 |
| [Editar quests](../src/features/editing/README.md) | dominio | Editar una quest publicada con el mismo formulario (tecla R o ✎), con un parche que solo lleva lo que cambia. | `quest_updated` | 2026-10-06 |
| [Personaje](../src/features/equipment/README.md) | dominio | Muñeco que te representa con el equipo comprado puesto, su armario y la decoración del menú (fondo de la app y emblema de la cabecera). | `gear_equipped`, `gear_unequipped` | 2026-10-02 |
| [Fallos](../src/features/failure/README.md) | dominio | Al acabar el día de su fecha sin terminarla, la quest se fractura y el cartel del encargo se quema; sin coste y con «Volver a clavar». | `quest_failed`, `temporal_failed` | 2026-10-06 |
| [Plazos](../src/features/horizon/README.md) | dominio | Filtro de los dos tablones por lo que falta para la fecha (1 día, 7 días, 2 semanas, 1 mes, +1 mes) y fecha límite de las quests. | — | 2026-10-02 |
| [Objetos](../src/features/items/README.md) | dominio | Objetos con rareza y tipo fijo, inventario, cofre de botín con pity al estilo Genshin y un almanaque por tipo de objeto. | `item_created`, `item_updated`, `item_deleted` | 2026-10-03 |
| [Personajes vivos](../src/features/living/README.md) | presentación | Los personajes del menú respiran, se mecen y les da el viento (una malla de WebGL sobre su imagen), con aura, brillo, partículas y entrada gacha, a elegir para cada uno. | `character_style_set`, `character_style_reset` | 2026-10-08 |
| [Menú de opciones](../src/features/menu/README.md) | presentación | Pantalla de opciones (tecla O) al estilo del menú principal de un gacha, con el personaje del día, las tarjetas de cada sección en 3D y los ajustes. | `character_added`, `character_removed`, `voice_line_added`, `voice_line_updated`, `voice_line_removed` | 2026-10-08 |
| [Mercader](../src/features/merchant/README.md) | dominio | Hu Tao vende equipo para el muñeco y decoración del menú, con precio por rareza y ranura, rango mínimo y un escaparate semanal. | `gear_created`, `gear_updated`, `gear_deleted`, `gear_purchased` | 2026-10-02 |
| [Interfaz de teléfono](../src/features/mobile/README.md) | presentación | La misma app compilada para iPhone con interfaz de teléfono: barra de abajo, detalle y ventanas a pantalla completa y deslizar para pasar página. | — | 2026-10-07 |
| [Música de fondo](../src/features/music/README.md) | servicio | Música en bucle con fundidos y volumen, en los ajustes del menú y con la tecla M; preferencia de cada equipo, sin eventos. | — | 2026-10-07 |
| [Avisos del sistema](../src/features/notifications/README.md) | servicio | Avisos fuera de la app para pomodoros, encargos, agenda, fechas límite y rachas; programados en iOS y con un temporizador en el escritorio. | — | 2026-10-06 |
| [Pomodoro](../src/features/pomodoro/README.md) | dominio | Tipo de objetivo con rondas de concentración y descanso (la última sin descanso), calculado sobre una línea de tiempo que sobrevive a cerrar la app. | `pomodoro_started`, `pomodoro_paused`, `pomodoro_resumed`, `pomodoro_stopped`, `pomodoro_break_skipped` | 2026-10-02 |
| [Alta rápida](../src/features/quickadd/README.md) | presentación | Una línea con marcas (mañana, #área, @quién, !, x3) que publica una quest al vuelo desde el tablón o la hoja del teléfono. | — | 2026-10-06 |
| [Recuperación ante fallos](../src/features/recovery/README.md) | infraestructura | Error boundary en la raíz con una pantalla de recuperación, en vez de la ventana en negro, que deja reintentar sin perder nada. | — | 2026-10-02 |
| [Recompensa calculada](../src/features/rewards/README.md) | dominio | La XP y el oro salen de los objetivos y la categoría de cada quest, y la de un encargo de sus calaveras y sus quests; nadie los escribe a mano. | — | 2026-10-03 |
| [Búsqueda](../src/features/search/README.md) | presentación | Ventana (/ o ⌘K) que busca en quests, encargos, agenda y objetos sin tildes ni distinción de kana, y lleva a lo encontrado. | — | 2026-10-06 |
| [Snapshot de la proyección](../src/features/snapshot/README.md) | infraestructura | dispatch aplica solo el evento nuevo y el arranque parte de un snapshot guardado cada 100 eventos, en vez de reproducir todo el historial. | — | 2026-10-06 |
| [Rachas](../src/features/streaks/README.md) | dominio | Las quests que se repiten cuentan las veces seguidas completadas a tiempo, con una llama en la tarjeta; se calcula en la proyección. | — | 2026-10-06 |
| [Sincronización con Google Drive](../src/features/sync/README.md) | infraestructura | Cada equipo sube sus eventos a un archivo propio en Google Drive y baja los de los demás; los adjuntos viajan por su SHA-256. | — | 2026-10-06 |
| [Encargos temporales](../src/features/temporal/README.md) | dominio | Tablón aparte de carteles con fecha (citas, entregas), calaveras según la dificultad, adjuntos, quests enlazadas y aceptados o sin aceptar. | `temporal_created`, `temporal_updated`, `temporal_attached`, `temporal_detached`, `temporal_linked`, `temporal_unlinked`, `temporal_accepted`, `temporal_postponed`, `temporal_completed`, `temporal_deleted`, `temporal_art_added`, `temporal_art_removed` | 2026-10-08 |
| [Mi día](../src/features/today/README.md) | presentación | Primera vista del calendario, que responde a «¿qué hago ahora?»: lo que se pierde esta noche, lo que está en curso, rachas, lo que toca hoy y la agenda. | — | 2026-10-06 |
| [Deshacer](../src/features/undo/README.md) | dominio | Lo hecho por error se deshace unos minutos (⌘Z o el botón del aviso) con otro evento que la proyección salta. | `event_undone` | 2026-10-06 |
<!-- /generado:funcionalidades -->

## Archivos compartidos → funcionalidades

Sale de los imports: qué funcionalidades usa cada archivo de fuera de `src/features/`. Si tocas uno de estos archivos, son los README que pueden importar.

<!-- generado:archivos-compartidos -->
> Esta tabla se genera con `pnpm docs:index`. No editar manualmente: los cambios se pierden al regenerarla.

| Archivo | Funcionalidades que importa |
|---|---|
| `src/App.tsx` | [agenda](../src/features/agenda/README.md), [calendar](../src/features/calendar/README.md), [chronicle](../src/features/chronicle/README.md), [complex](../src/features/complex/README.md), [customize](../src/features/customize/README.md), [editing](../src/features/editing/README.md), [equipment](../src/features/equipment/README.md), [failure](../src/features/failure/README.md), [horizon](../src/features/horizon/README.md), [items](../src/features/items/README.md), [menu](../src/features/menu/README.md), [merchant](../src/features/merchant/README.md), [mobile](../src/features/mobile/README.md), [music](../src/features/music/README.md), [notifications](../src/features/notifications/README.md), [pomodoro](../src/features/pomodoro/README.md), [quickadd](../src/features/quickadd/README.md), [search](../src/features/search/README.md), [sync](../src/features/sync/README.md), [temporal](../src/features/temporal/README.md), [undo](../src/features/undo/README.md) |
| `src/components/ClearOverlay.tsx` | [items](../src/features/items/README.md), [mobile](../src/features/mobile/README.md) |
| `src/components/CreateQuestModal.tsx` | [attributes](../src/features/attributes/README.md), [checklist](../src/features/checklist/README.md), [complex](../src/features/complex/README.md), [contacts](../src/features/contacts/README.md), [editing](../src/features/editing/README.md), [horizon](../src/features/horizon/README.md), [items](../src/features/items/README.md), [pomodoro](../src/features/pomodoro/README.md), [rewards](../src/features/rewards/README.md) |
| `src/components/Footer.tsx` | [calendar](../src/features/calendar/README.md), [menu](../src/features/menu/README.md), [temporal](../src/features/temporal/README.md) |
| `src/components/Header.tsx` | [equipment](../src/features/equipment/README.md), [menu](../src/features/menu/README.md), [search](../src/features/search/README.md), [temporal](../src/features/temporal/README.md) |
| `src/components/QuestCard.tsx` | [complex](../src/features/complex/README.md), [contacts](../src/features/contacts/README.md), [horizon](../src/features/horizon/README.md), [pomodoro](../src/features/pomodoro/README.md), [streaks](../src/features/streaks/README.md), [temporal](../src/features/temporal/README.md) |
| `src/components/QuestDetail.tsx` | [attributes](../src/features/attributes/README.md), [checklist](../src/features/checklist/README.md), [complex](../src/features/complex/README.md), [contacts](../src/features/contacts/README.md), [editing](../src/features/editing/README.md), [horizon](../src/features/horizon/README.md), [items](../src/features/items/README.md), [mobile](../src/features/mobile/README.md), [pomodoro](../src/features/pomodoro/README.md), [streaks](../src/features/streaks/README.md), [temporal](../src/features/temporal/README.md) |
| `src/domain/blobs.ts` | [menu](../src/features/menu/README.md), [merchant](../src/features/merchant/README.md), [temporal](../src/features/temporal/README.md) |
| `src/domain/events.ts` | [agenda](../src/features/agenda/README.md), [checklist](../src/features/checklist/README.md), [collectibles](../src/features/collectibles/README.md), [companion](../src/features/companion/README.md), [editing](../src/features/editing/README.md), [equipment](../src/features/equipment/README.md), [failure](../src/features/failure/README.md), [items](../src/features/items/README.md), [living](../src/features/living/README.md), [menu](../src/features/menu/README.md), [merchant](../src/features/merchant/README.md), [pomodoro](../src/features/pomodoro/README.md), [temporal](../src/features/temporal/README.md), [undo](../src/features/undo/README.md) |
| `src/domain/projection.ts` | [agenda](../src/features/agenda/README.md), [attributes](../src/features/attributes/README.md), [checklist](../src/features/checklist/README.md), [chronicle](../src/features/chronicle/README.md), [collectibles](../src/features/collectibles/README.md), [companion](../src/features/companion/README.md), [complex](../src/features/complex/README.md), [contacts](../src/features/contacts/README.md), [editing](../src/features/editing/README.md), [equipment](../src/features/equipment/README.md), [failure](../src/features/failure/README.md), [items](../src/features/items/README.md), [living](../src/features/living/README.md), [menu](../src/features/menu/README.md), [merchant](../src/features/merchant/README.md), [pomodoro](../src/features/pomodoro/README.md), [rewards](../src/features/rewards/README.md), [streaks](../src/features/streaks/README.md), [temporal](../src/features/temporal/README.md), [undo](../src/features/undo/README.md) |
| `src/domain/seed.ts` | [items](../src/features/items/README.md), [pomodoro](../src/features/pomodoro/README.md) |
| `src/domain/types.ts` | [agenda](../src/features/agenda/README.md), [attributes](../src/features/attributes/README.md), [checklist](../src/features/checklist/README.md), [chronicle](../src/features/chronicle/README.md), [companion](../src/features/companion/README.md), [contacts](../src/features/contacts/README.md), [equipment](../src/features/equipment/README.md), [items](../src/features/items/README.md), [living](../src/features/living/README.md), [menu](../src/features/menu/README.md), [merchant](../src/features/merchant/README.md), [pomodoro](../src/features/pomodoro/README.md), [streaks](../src/features/streaks/README.md), [temporal](../src/features/temporal/README.md) |
| `src/i18n/locales/es.ts` | 32 funcionalidades (montan sus textos o tipos) |
| `src/i18n/locales/ja.ts` | 32 funcionalidades (montan sus textos o tipos) |
| `src/main.tsx` | [recovery](../src/features/recovery/README.md) |
| `src/store/actions.ts` | [checklist](../src/features/checklist/README.md), [complex](../src/features/complex/README.md), [items](../src/features/items/README.md), [streaks](../src/features/streaks/README.md), [temporal](../src/features/temporal/README.md), [undo](../src/features/undo/README.md) |
| `src/store/game.ts` | [items](../src/features/items/README.md), [snapshot](../src/features/snapshot/README.md) |
| `src/test/memory.ts` | [sync](../src/features/sync/README.md) |
| `src/test/streams.ts` | [agenda](../src/features/agenda/README.md), [companion](../src/features/companion/README.md), [items](../src/features/items/README.md), [menu](../src/features/menu/README.md), [merchant](../src/features/merchant/README.md), [temporal](../src/features/temporal/README.md) |
<!-- /generado:archivos-compartidos -->

## Dependencias entre funcionalidades

Sale de los imports. Cada README explica en «Dependencias» para qué usa cada una (`pnpm docs:check` lo exige).

<!-- generado:dependencias -->
> Esta tabla se genera con `pnpm docs:index`. No editar manualmente: los cambios se pierden al regenerarla.

| Funcionalidad | Usa (importa) | La usan |
|---|---|---|
| [agenda](../src/features/agenda/README.md) | undo | calendar, failure, notifications, search, today |
| [armory](../src/features/armory/README.md) | items, merchant | chronicle, equipment, items, merchant |
| [attributes](../src/features/attributes/README.md) | — | chronicle, equipment |
| [calendar](../src/features/calendar/README.md) | agenda, chronicle, editing, equipment, failure, merchant, mobile, search, temporal, today | menu, mobile, search, temporal, today |
| [checklist](../src/features/checklist/README.md) | — | editing, rewards, search |
| [chronicle](../src/features/chronicle/README.md) | armory, attributes, items, mobile, streaks | calendar, menu, temporal, today |
| [collectibles](../src/features/collectibles/README.md) | items, merchant | menu, merchant |
| [companion](../src/features/companion/README.md) | living, menu, streaks, today | customize, today |
| [complex](../src/features/complex/README.md) | horizon | editing, failure, notifications, temporal, today |
| [contacts](../src/features/contacts/README.md) | — | editing, temporal |
| [customize](../src/features/customize/README.md) | companion, equipment, living, menu, mobile, temporal | menu |
| [editing](../src/features/editing/README.md) | checklist, complex, contacts, pomodoro, rewards, undo | calendar, failure, menu, quickadd, temporal |
| [equipment](../src/features/equipment/README.md) | armory, attributes, items, merchant | calendar, customize, living, menu, merchant, temporal |
| [failure](../src/features/failure/README.md) | agenda, complex, editing, mobile, temporal | calendar, menu, notifications, search, temporal, today |
| [horizon](../src/features/horizon/README.md) | temporal | complex, quickadd, temporal |
| [items](../src/features/items/README.md) | armory, merchant, mobile | armory, chronicle, collectibles, equipment, menu, merchant, search |
| [living](../src/features/living/README.md) | equipment, menu | companion, customize, menu |
| [menu](../src/features/menu/README.md) | calendar, chronicle, collectibles, customize, editing, equipment, failure, items, living, merchant, mobile, music, notifications, quickadd, search, sync, temporal | companion, customize, living, mobile, temporal |
| [merchant](../src/features/merchant/README.md) | armory, collectibles, equipment, items | armory, calendar, collectibles, equipment, items, menu, temporal |
| [mobile](../src/features/mobile/README.md) | calendar, menu, quickadd, temporal | calendar, chronicle, customize, failure, items, menu, temporal |
| [music](../src/features/music/README.md) | — | menu |
| [notifications](../src/features/notifications/README.md) | agenda, complex, failure, pomodoro, streaks, temporal | menu |
| [pomodoro](../src/features/pomodoro/README.md) | — | editing, notifications |
| [quickadd](../src/features/quickadd/README.md) | editing, horizon, rewards, undo | menu, mobile |
| [recovery](../src/features/recovery/README.md) | — | — |
| [rewards](../src/features/rewards/README.md) | checklist, temporal | editing, quickadd, temporal |
| [search](../src/features/search/README.md) | agenda, calendar, checklist, failure, items, temporal | calendar, menu, temporal |
| [snapshot](../src/features/snapshot/README.md) | undo | — |
| [streaks](../src/features/streaks/README.md) | — | chronicle, companion, notifications, today |
| [sync](../src/features/sync/README.md) | — | menu |
| [temporal](../src/features/temporal/README.md) | calendar, chronicle, complex, contacts, editing, equipment, failure, horizon, menu, merchant, mobile, rewards, search, undo | calendar, customize, failure, horizon, menu, mobile, notifications, rewards, search, today |
| [today](../src/features/today/README.md) | agenda, calendar, chronicle, companion, complex, failure, streaks, temporal | calendar, companion |
| [undo](../src/features/undo/README.md) | — | agenda, editing, quickadd, snapshot, temporal |
<!-- /generado:dependencias -->

## Eventos → funcionalidad

Sale de `src/domain/events.ts` y de los `events.ts` de cada funcionalidad.

<!-- generado:eventos -->
> Esta tabla se genera con `pnpm docs:index`. No editar manualmente: los cambios se pierden al regenerarla.

53 tipos de evento en el código.

| Evento | Dónde se documenta |
|---|---|
| `agenda_created` | [agenda](../src/features/agenda/README.md) |
| `agenda_deleted` | [agenda](../src/features/agenda/README.md) |
| `agenda_skipped` | [agenda](../src/features/agenda/README.md) |
| `agenda_updated` | [agenda](../src/features/agenda/README.md) |
| `character_added` | [menu](../src/features/menu/README.md) |
| `character_removed` | [menu](../src/features/menu/README.md) |
| `character_style_reset` | [living](../src/features/living/README.md) |
| `character_style_set` | [living](../src/features/living/README.md) |
| `checklist_checked` | [checklist](../src/features/checklist/README.md) |
| `collectible_purchased` | [collectibles](../src/features/collectibles/README.md) |
| `companion_chosen` | [companion](../src/features/companion/README.md) |
| `companion_line_added` | [companion](../src/features/companion/README.md) |
| `companion_line_removed` | [companion](../src/features/companion/README.md) |
| `companion_line_updated` | [companion](../src/features/companion/README.md) |
| `event_undone` | [undo](../src/features/undo/README.md) |
| `gear_created` | [merchant](../src/features/merchant/README.md) |
| `gear_deleted` | [merchant](../src/features/merchant/README.md) |
| `gear_equipped` | [equipment](../src/features/equipment/README.md) |
| `gear_purchased` | [merchant](../src/features/merchant/README.md) |
| `gear_unequipped` | [equipment](../src/features/equipment/README.md) |
| `gear_updated` | [merchant](../src/features/merchant/README.md) |
| `item_created` | [items](../src/features/items/README.md) |
| `item_deleted` | [items](../src/features/items/README.md) |
| `item_updated` | [items](../src/features/items/README.md) |
| `pomodoro_break_skipped` | [pomodoro](../src/features/pomodoro/README.md) |
| `pomodoro_paused` | [pomodoro](../src/features/pomodoro/README.md) |
| `pomodoro_resumed` | [pomodoro](../src/features/pomodoro/README.md) |
| `pomodoro_started` | [pomodoro](../src/features/pomodoro/README.md) |
| `pomodoro_stopped` | [pomodoro](../src/features/pomodoro/README.md) |
| `progress_added` | [núcleo (informe)](INFORME-TECNICO.md) |
| `quest_abandoned` | [núcleo (informe)](INFORME-TECNICO.md) |
| `quest_accepted` | [núcleo (informe)](INFORME-TECNICO.md) |
| `quest_completed` | [núcleo (informe)](INFORME-TECNICO.md) |
| `quest_created` | [núcleo (informe)](INFORME-TECNICO.md) |
| `quest_deleted` | [núcleo (informe)](INFORME-TECNICO.md) |
| `quest_failed` | [failure](../src/features/failure/README.md) |
| `quest_updated` | [editing](../src/features/editing/README.md) |
| `temporal_accepted` | [temporal](../src/features/temporal/README.md) |
| `temporal_art_added` | [temporal](../src/features/temporal/README.md) |
| `temporal_art_removed` | [temporal](../src/features/temporal/README.md) |
| `temporal_attached` | [temporal](../src/features/temporal/README.md) |
| `temporal_completed` | [temporal](../src/features/temporal/README.md) |
| `temporal_created` | [temporal](../src/features/temporal/README.md) |
| `temporal_deleted` | [temporal](../src/features/temporal/README.md) |
| `temporal_detached` | [temporal](../src/features/temporal/README.md) |
| `temporal_failed` | [failure](../src/features/failure/README.md) |
| `temporal_linked` | [temporal](../src/features/temporal/README.md) |
| `temporal_postponed` | [temporal](../src/features/temporal/README.md) |
| `temporal_unlinked` | [temporal](../src/features/temporal/README.md) |
| `temporal_updated` | [temporal](../src/features/temporal/README.md) |
| `voice_line_added` | [menu](../src/features/menu/README.md) |
| `voice_line_removed` | [menu](../src/features/menu/README.md) |
| `voice_line_updated` | [menu](../src/features/menu/README.md) |
<!-- /generado:eventos -->

## Preferencias por equipo

Las claves de `localStorage` (e IndexedDB) que usa el código. No van en eventos ni se sincronizan.

<!-- generado:preferencias -->
> Esta tabla se genera con `pnpm docs:index`. No editar manualmente: los cambios se pierden al regenerarla.

| Clave | Dónde se documenta |
|---|---|
| `quests.blobs` | [Núcleo: base de IndexedDB de los adjuntos (solo en el navegador)](COMO-FUNCIONA.md#6-almacenamiento-sqlite-y-su-sustituto-en-el-navegador) |
| `quests.calendarView` | [Calendario](../src/features/calendar/README.md) |
| `quests.deviceId` | [Núcleo: id del dispositivo (solo en el navegador)](COMO-FUNCIONA.md#6-almacenamiento-sqlite-y-su-sustituto-en-el-navegador) |
| `quests.events` | [Núcleo: eventos (solo en el navegador, `pnpm dev`)](COMO-FUNCIONA.md#6-almacenamiento-sqlite-y-su-sustituto-en-el-navegador) |
| `quests.failSeen` | [Fallos](../src/features/failure/README.md) |
| `quests.lang` | [Núcleo: idioma de la interfaz](COMO-FUNCIONA.md#12-idiomas-español-y-japonés) |
| `quests.menuCharacter` | [Menú de opciones](../src/features/menu/README.md) |
| `quests.music` | [Música de fondo](../src/features/music/README.md) |
| `quests.muted` | [Núcleo: silencio general (efectos y música)](COMO-FUNCIONA.md#10-el-sonido-sintetizado-sin-archivos) |
| `quests.notify` | [Avisos del sistema](../src/features/notifications/README.md) |
| `quests.notifyIds` | [Avisos del sistema](../src/features/notifications/README.md) |
| `quests.snapshot` | [Snapshot de la proyección](../src/features/snapshot/README.md) |
| `quests.synced` | [Núcleo: eventos ya subidos (solo en el navegador)](COMO-FUNCIONA.md#6-almacenamiento-sqlite-y-su-sustituto-en-el-navegador) |
| `quests.temporalAccept` | [Encargos temporales](../src/features/temporal/README.md) |
<!-- /generado:preferencias -->
