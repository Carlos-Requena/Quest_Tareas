# Guía para agentes que trabajan en Quests

Normas obligatorias para cualquier agente (o persona) que haga tareas en este repositorio. Las secciones marcadas como **norma** no son sugerencias. Esta guía es corta a propósito: el detalle está en el documento que toca, y la sección 2 dice cuál.

---

## 1. Qué es Quests

App de escritorio (macOS y Windows) y de iPhone que convierte tareas en *quests* de estilo JRPG: tablón de quests con XP, niveles y oro; tablón de **encargos** con fecha (lo que se planifica a largo plazo); **calendario** con agenda personal; objetos, mercader, personaje y crónica en un **menú de opciones**. Interfaz en español y japonés. Los datos se sincronizan entre equipos por Google Drive. El catálogo completo de funcionalidades está en [INDEX.md](INDEX.md#funcionalidades).

- **Stack:** Tauri 2 (Rust) + React 19 + TypeScript 6 + Vite 8 + Zustand 5 + Motion + GSAP + i18next, con SQLite vía `tauri-plugin-sql`.
- **Modelo de datos:** *event sourcing* local-first. Se guardan **eventos inmutables** en SQLite y el estado se **calcula** reproduciéndolos (`project()`).
- **Idioma del proyecto:** el código, los comentarios, la documentación y la comunicación con el propietario van **en español**.

---

## 2. Norma: leer solo lo necesario

No cargues toda la documentación. Para tocar una funcionalidad basta con su `README.md`: su «Dependencias» dice si hace falta algo de otra (casi nunca) y su «Dónde está cada cosa», si lo tiene, lleva a los símbolos. Para todo lo demás (un archivo compartido, un procedimiento, el porqué de una decisión), el mapa por tarea está en [INDEX.md](INDEX.md#por-tarea).

---

## 3. Comandos

```bash
pnpm install            # dependencias
pnpm tauri dev          # app nativa con recarga en caliente (Vite en el puerto 1420, fijo)
pnpm dev                # solo la UI en el navegador; los datos van a localStorage
npx tsc --noEmit        # comprobar tipos
pnpm test               # tests (Vitest)
pnpm build              # tipos + build del frontend a dist/
pnpm docs:index         # regenera las tablas de docs/INDEX.md y docs/decisions/README.md
pnpm docs:check         # comprueba la documentación (la CI lo pasa)
pnpm tauri build        # instalador para el sistema actual
```

- El puerto **1420 es fijo** (`strictPort`). Si está ocupado, probablemente el propietario tiene la app abierta: **úsala** (`http://localhost:1420`) en vez de arrancar otra copia. Si arrancas un servidor tú, **páralo al terminar**.
- iPhone: [runbooks/compilar-ios.md](runbooks/compilar-ios.md). Sincronización (credenciales, segundo equipo): [runbooks/verificar-sync.md](runbooks/verificar-sync.md).
- La base de datos nativa está en `~/Library/Application Support/com.quests.app/quests.db` (macOS) y `%APPDATA%\com.quests.app\` (Windows). Cómo inspeccionarla: [runbooks/verificar-tauri.md](runbooks/verificar-tauri.md).
- **Norma: no borres nunca** `quests.db`, sus binarios ni el `localStorage` del propietario: es su progreso real. Para probar desde cero, usa el navegador (`pnpm dev`, que no sincroniza) con tu propia copia del `localStorage`. Si de verdad hay que dejar la app nativa vacía: solo con su **permiso explícito**, **moviendo** la base a una copia con fecha (nunca borrándola) y devolviéndola al terminar. Los dos procedimientos, paso a paso: [verificar-ui](runbooks/verificar-ui.md#empezar-de-cero-en-el-navegador) y [verificar-tauri](runbooks/verificar-tauri.md#empezar-de-cero).

---

## 4. Mapa del código

```
src/
  domain/       Dominio PURO: tipos, unión de eventos, versión (upcast.ts), proyección, niveles, datos de ejemplo
  storage/      EventStore (SQLite en Tauri, localStorage en el navegador) y BlobStore (binarios por SHA-256)
  store/        Store Zustand (game.ts: proyección incremental, estado de UI, dispatch) y casos de uso (actions.ts)
  components/   Interfaz común: Header, Tabs, QuestCard, QuestDetail, CreateQuestModal, ClearOverlay, Footer
  features/     UNA CARPETA POR FUNCIONALIDAD, cada una con su README.md (lista en docs/INDEX.md)
  i18n/         i18next: locales/es.ts (referencia) y locales/ja.ts, tipados
  lib/          sfx (Web Audio), fx (partículas y sacudidas), motion (salida de ventanas), id/PRNG, time
  styles/       theme.css (tokens) y app.css
  test/         Utilidades de los tests (streams.ts: historiales aleatorios; memory.ts: almacenes y Drive falsos)
public/         Archivos estáticos (música, vídeo de Hu Tao, personajes del menú, ilustraciones de los encargos)
src-tauri/      Rust: lib.rs (plugins y comandos), sync/ (OAuth y Drive), plugins/web-auth (iOS), capabilities, tauri.conf.json (CSP)
scripts/docs.mjs  Índices y comprobaciones de la documentación
docs/           Esta guía, INDEX, COMO-FUNCIONA, INFORME-TECNICO, decisions/, runbooks/, history/, templates/, img/
```

**Sentido de las dependencias (norma):**

```
components ──▶ store ──▶ domain ◀── storage
    │                      ▲
    └──▶ features/*/index  │  (el dominio solo importa features/*/model.ts, events.ts y legacy.ts)
```

---

## 5. Normas de arquitectura

### 5.1 Event sourcing

- **Toda escritura pasa por `dispatch(evento)`** (`src/store/game.ts`). Ningún componente ni acción modifica el estado directamente.
- **Los eventos guardados son inmutables.** Nunca se reescriben, se borran ni se «arreglan» en la base de datos.
- **Cambiar la forma de un evento o de `QuestDef` exige compatibilidad hacia atrás**: los datos antiguos se convierten **al leerlos** (*upcasting*). Si cambias la forma de un evento que ya existe, sube `EVENT_VERSION`, añade el paso en `UPCASTERS` y sube `PROJECTION_VERSION`. Un tipo de evento nuevo no sube `EVENT_VERSION`. Procedimiento: [runbooks/migrar-evento.md](runbooks/migrar-evento.md).
- **La proyección es tolerante:** cada `case` de `applyEvent` tiene una **guarda** que ignora eventos imposibles (completar una quest que no está activa). Así se fusionan eventos de varios equipos sin duplicar XP.
- **Sube `PROJECTION_VERSION`** si cambias el resultado de `project()` para eventos ya guardados (un `case`, una guarda, un *upcaster* o un `apply*Event`). Si no, la app nativa arrancará desde un snapshot calculado con la lógica vieja.
- **El acumulador (`ProjectionAcc`) solo guarda datos serializables** (`Map`, `Set`, objetos planos): se guarda como snapshot y se copia con `structuredClone`. Lo que depende del conjunto va en `finishProjection`.
- **El `ts` de un evento lo pone `dispatch`** con `nextTs` (reloj lógico híbrido). No construyas eventos con `ts` propio fuera de los tests.
- **Prefiere deltas a valores absolutos** (`progress_added { amount: +1 }`) y **copia en el evento lo que no debe cambiar después** (la recompensa en `quest_completed`, el precio en `gear_purchased`).

### 5.2 Dominio puro y tiempo

- `src/domain/` y los `model.ts` **no importan** React, Zustand, Tauri, `window` ni el DOM.
- **El dominio no llama a `Date.now()` ni a `Math.random()`.** El tiempo entra como parámetro (`now`) o viene del evento (`e.ts`); el azar entra como parámetro (`rnd`), se resuelve en la acción y su resultado se guarda en el evento.
- **Lo que depende del paso del tiempo se calcula, no se guarda**, y no genera eventos (el fin de una espera, las fases del pomodoro, los plazos). La excepción, con su porqué, son los fallos ([ADR-44](decisions/ADR-44-fallos.md)).
- La lógica que decide (¿se puede aceptar? ¿está completa?) vive en `domain/`, en un `model.ts` o en un `actions.ts`, **nunca en un componente**.

### 5.3 Qué va en eventos y qué no

| Va en eventos (se sincroniza) | No va en eventos |
|---|---|
| Todo lo que es del juego y debe verse igual en todos los equipos: quests y su progreso, encargos, agenda, objetos, compras, equipo puesto, personajes añadidos, deshacer y fallos | **Preferencias de cada equipo** en `localStorage` (idioma, silencio, música, vista del calendario, avisos…: lista generada en [INDEX.md](INDEX.md#preferencias-por-equipo)). **Lo que se calcula** (rachas, atributos, crónica, plazos, escaparate, rotación de personajes). **Lo que está en el código o en `public/`** (piezas y personajes de serie). La tabla `meta` guarda el snapshot, el `deviceId` y los cursores de la sincronización; el token de Google va al llavero |

**Norma, archivos:** en un evento solo va la referencia (nombre, tipo, tamaño, una miniatura pequeña y el `blobId`); el contenido va al almacén de binarios (`src/storage/blobStore.ts`) con su SHA-256 como clave. Nunca metas un archivo grande en un evento. El almacén lo comparten los adjuntos y las ilustraciones de los encargos, el mercader y los personajes: **antes de borrar un binario, comprueba que no lo use ninguno** (`blobsInUse`, en `src/domain/blobs.ts`; un dato nuevo con binarios se suma ahí).

### 5.4 Clases o funciones

- **Dominio:** tipos (`interface`) y funciones puras. Nada de `class` con estado mutable: tiene que serializarse como JSON y reconstruirse desde eventos.
- **Recursos imperativos** (audio, reproductores, conexiones): una `class` con instancia única, guardada en `globalThis` para sobrevivir a recargas en caliente (ejemplo: `MusicPlayer`). También el error boundary de React, que solo puede ser una clase.

---

## 6. Norma: una carpeta por funcionalidad

**Toda funcionalidad nueva va en `src/features/<nombre>/`**, con su `README.md` según [la plantilla](templates/feature-readme.md):

```
src/features/<nombre>/
├── README.md        OBLIGATORIO (plantilla: docs/templates/feature-readme.md)
├── index.ts         API pública para la interfaz
├── model.ts         Tipos y funciones puras (lo único, con events.ts y legacy.ts, que puede importar src/domain)
├── events.ts        Sus eventos, si los tiene (se suman a EventBody)
├── legacy.ts        Conversión de datos antiguos, si cambia algo ya guardado
├── actions.ts       Casos de uso: validan y llaman a dispatch
├── ui.ts            Estado de interfaz propio (Zustand), si lo necesita
├── i18n.ts          Textos es + ja (ja tipado como `typeof es`)
├── <nombre>.css     Estilos propios
└── components/      Componentes React
```

- **La integración fuera de la carpeta es mínima** (tipos, unión de eventos, proyección, diccionarios y el componente que la aloja) y se enumera en la sección «Integración» de su README.
- **El dominio nunca importa el `index.ts` de una funcionalidad**: reexporta `actions.ts`, que importa el store, y se crearía un ciclo. Una funcionalidad puede importar el `model.ts` de otra; si su lógica necesita la proyección (`effectiveStatus`), va en otro archivo (como `temporal/links.ts`).
- Cómo empezar una, con los ejemplos de cada tipo: [runbooks/nueva-funcionalidad.md](runbooks/nueva-funcionalidad.md).

---

## 7. Interfaz, animaciones y estilos

- **Textos:** nunca escribas texto visible a mano en un componente: `t("clave")`, con la clave en `es.ts` **y** en `ja.ts` (TypeScript falla si falta). Fuera de React, `i18n.t(...)`; en los avisos, `say(() => i18n.t(...))`, para que se traduzcan al cambiar de idioma.
- **No se traduce** lo que escribe el usuario. Las etiquetas decorativas en inglés (ELITE, REQUEST, QUEST CLEAR, LEVEL UP!, los rótulos del menú) se quedan en inglés a propósito. **Todo lo demás se traduce al japonés**, también lo que lo parece (las áreas conocidas, las piezas de serie), con el vocabulario de JRPG ya usado (受注する, 取りやめる, 必要な条件, 報酬, 貼り紙…) y ajustes con `:lang(ja)`.
- **Animaciones:** Motion para entrar, salir y layout; GSAP para secuencias encadenadas, con el patrón de `QuestCard`: estado anterior en un `useRef`, línea de tiempo solo en la transición que interesa, `gsap.set` en los demás casos y limpieza con `tl.kill()`, nunca `tl.progress(1)`. Si GSAP controla la visibilidad de un elemento, React no la controla también. Detalle en [COMO-FUNCIONA.md](COMO-FUNCIONA.md#9-las-animaciones-por-dentro).
- **Teléfono:** cada funcionalidad pone sus ajustes en un `@media (max-width: 760px)` **al final de su CSS**; el JavaScript solo distingue el teléfono cuando el CSS no basta (`isPhone()` / `useIsPhone()`). Nada solo con `hover`, botones de 40 px o más, campos de 16 px o más, y «Pulsa Enter» pasa a «Toca» (`KeyHint`). Si tocas una pantalla, mírala también a 402 × 874.
- **Ventanas:** el fondo sale con `BACKDROP_EXIT` y la ventana con `MODAL_EXIT` (`src/lib/motion.ts`); si no, el fondo invisible se traga el clic siguiente. Una ventana nueva se abre desde una tarjeta del menú de opciones, no desde un botón más en la cabecera.
- **Nada de saltos de layout** en controles: lo que se despliega va en capas absolutas.
- **Colores:** siempre los tokens de `theme.css`, sin colores sueltos. **Fuentes:** solo subconjuntos latinos (`@fontsource/<fuente>/latin-<peso>.css`); el japonés usa el mincho del sistema.
- **Sonido:** los efectos van en `src/lib/sfx.ts` y respetan `isMuted()`. **Celebraciones:** partículas y sacudidas con `src/lib/fx.ts`, que respeta «reducir movimiento»; las sacudidas mueven el contenido (`.cl-stage`), nunca una capa `position: fixed`.

---

## 8. Assets y Tauri

- **Archivos estáticos** en `public/`, nunca en `dist/` (se borra en cada build). **Vídeo** en MP4 (H.264) y WebM (VP9), sin audio, en bucle exacto y con póster. **Archivos del usuario**, en el almacén de binarios.
- **Permisos de Tauri:** explícitos y mínimos en `src-tauri/capabilities/default.json`; cada plugin nuevo necesita su permiso y su registro en `src-tauri/src/lib.rs`.
- **CSP (norma):** `app.security.csp` en `tauri.conf.json` solo permite lo propio (`'self'`, `data:` y `blob:` donde hace falta, e IPC). Nunca `csp: null`. Las llamadas a servicios de fuera las hace Rust (así se hizo Google Drive), de modo que la CSP no se abre; si algo tuviera que cargar de otro origen, se añade a la directiva exacta, también en `devCsp`, y se explica en [COMO-FUNCIONA.md](COMO-FUNCIONA.md#content-security-policy-csp).
- **Secretos:** nunca en el repositorio ni en SQLite. El refresh token de Google va al llavero del sistema y el access token solo vive en la memoria de Rust: **el JavaScript nunca ve un token**.

---

## 9. Norma: verificar antes de dar algo por terminado

1. `npx tsc --noEmit` sin errores, `pnpm test` en verde, `pnpm build` correcto y `pnpm docs:check` sin problemas. La CI (`.github/workflows/ci.yml`) lo repite en macOS y Windows y compila la app: tiene que quedar en verde antes de unir a `main`.
2. **Probarlo en ejecución**, no solo compilar: [runbooks/verificar-ui.md](runbooks/verificar-ui.md) (navegador, también a 402 × 874) y, si toca Rust o algo nativo, [runbooks/verificar-tauri.md](runbooks/verificar-tauri.md). Cada runbook tiene sus trampas conocidas del entorno.
3. **Lógica de dominio:** tests con Vitest (`*.test.ts` junto al módulo) con marcas de tiempo fijas; `src/test/streams.ts` tiene constructores y `randomStream(semilla, n)`. **Si añades un tipo de evento, añádelo a `randomStream`.**
4. **Lo que depende del tiempo:** no esperes; inyecta eventos con `ts` en el pasado en el `localStorage` de pruebas.
5. **Datos antiguos:** si cambias un formato, comprueba que los datos existentes se siguen viendo bien.
6. **Informa con honestidad:** di qué verificaste y cómo, y qué **no** (el sonido, Windows, la app empaquetada). Nunca presentes como probado algo que no lo está.

---

## 10. Norma: documentación, una fuente por tema

| Tema | Fuente única | En los demás sitios, solo un enlace |
|---|---|---|
| Normas de trabajo y comandos | Esta guía | — |
| Una funcionalidad: reglas, eventos, archivos, estado | Su `README.md` | Ni en esta guía ni en el informe |
| Mecanismos generales (store, proyección, i18n, Tauri, animaciones, sonido) | [COMO-FUNCIONA.md](COMO-FUNCIONA.md) | — |
| Arquitectura, modelo, escalabilidad, deuda y hoja de ruta | [INFORME-TECNICO.md](INFORME-TECNICO.md) | El documento publicado en Claude es una instantánea para leer; la fuente es el `.md` |
| Decisiones (ADR) | [decisions/](decisions/README.md), una por archivo | — |
| Procedimientos | [runbooks/](runbooks/) | — |
| Historia: fallos resueltos, cifras, verificaciones antiguas | [history/](history/README.md) | Nunca en los documentos vigentes |
| Lista de funcionalidades, eventos, preferencias, dependencias | [INDEX.md](INDEX.md), generado | — |
| Atajos de teclado globales | [README.md](../README.md) de la raíz | Los de cada ventana, en su README |

- **Solo lo vigente.** Los documentos dicen cómo es la app hoy. Nada de «antes…», «hasta que exista…» ni cifras que caducan (número de tests, líneas): lo que pasó va a `docs/history/` y las cifras actuales salen de los comandos. `pnpm docs:check` rechaza fuera del historial las cifras de tests y de líneas de código, y en toda la documentación los comandos que borrarían datos del propietario.
- **Al cambiar una funcionalidad**, actualiza su README (y su «Estado actual»); lo verificado se apunta arriba en `docs/history/verificacion/<nombre>.md`. **Una decisión de arquitectura** nueva es una ADR nueva. **Un evento nuevo** va en el `eventos:` del README y en `randomStream`. Después, `pnpm docs:index`.
- **Norma: el diagrama de clases se redibuja siempre** que cambie un tipo de `domain/types.ts`, un `model.ts`, `GameState`, `PlayerState` o la unión de eventos, en la misma tarea. Su actualización está reservada al agente Copilot asignado: Claude no modifica el widget del diagrama ni `docs/img/diagrama-clases.png`. Claude debe entregar el inventario estructurado de cambios con estado `PENDIENTE`; una nota genérica del tipo «el diagrama aún no incluye X» no vale. Procedimiento y plantilla: [runbooks/redibujar-diagramas.md](runbooks/redibujar-diagramas.md).

---

## 11. Deuda conocida: no la empeores

La lista vigente está en [INFORME-TECNICO.md](INFORME-TECNICO.md#deuda-técnica-y-riesgos) (tests que faltan, Windows sin abrir a mano, avisos del sistema sin ver, partes del iPhone sin probar…). Si tu tarea toca alguno de esos puntos, resuélvelo o, al menos, no añadas más casos, y actualiza la lista.

---

## 12. Cómo trabajar con el propietario

- Escribe en español, claro y directo. Explica las decisiones de diseño que tomes por tu cuenta y ofrece cambiarlas.
- Si una petición choca con estas normas (guardar algo en `dist/`, guardar estado en vez de eventos), **explica el motivo y propone la alternativa correcta** antes de actuar.
- Las preferencias del propietario que surjan en el trabajo se añaden aquí, en una línea, con el detalle en el README de su funcionalidad.

**Preferencias vigentes** (no se cambian sin preguntar):

- **Comprar tiene que costar, pero ser habitual**: precios altos por rareza y ranura, rango mínimo y escaparate semanal, con el oro calibrado para comprar a menudo. No cambies precios, ritmo de oro ni requisitos ([merchant](../src/features/merchant/README.md), [rewards](../src/features/rewards/README.md)).
- **La recompensa la calcula el juego** a partir de los objetivos y la categoría; nadie la escribe a mano ([rewards](../src/features/rewards/README.md)).
- **La mercancía se añade a mano y sin precio**: nombre, tipo, rareza, imagen y descripción; precio y rango los calcula el juego ([merchant](../src/features/merchant/README.md)).
- **Coleccionables únicos**: un repetido de cofre se quema; si no sale, se compra a Hu Tao, uno por semana y sin requisito de rango ([collectibles](../src/features/collectibles/README.md)).
- **El almanaque solo sirve para mirar**, con un libro por tipo de objeto; comprar es cosa de Hu Tao ([items](../src/features/items/README.md)).
- **Equipo de serie para todos**, inspirado en Mushoku Tensei, Re:Zero, Konosuba y los JRPG clásicos, con arte propio (nunca imágenes de las series), en el código ([armory](../src/features/armory/README.md)).
- **Los encargos son lo principal, pero la app abre en el Quest Board**; un encargo se clava sin aceptar y el filtro arranca en «Todos» ([temporal](../src/features/temporal/README.md)).
- **El calendario es donde se planifica** (Mi día · Semana · Día); los plazos quedan solo como filtro; la agenda no da XP ni oro ([calendar](../src/features/calendar/README.md), [agenda](../src/features/agenda/README.md)).
- **Fallar tiene consecuencia, pero solo constancia**: sin coste, queda en la crónica y se vuelve a clavar ([failure](../src/features/failure/README.md)).
- **Contactos escritos a mano**, no elegidos de la agenda del sistema ([contacts](../src/features/contacts/README.md)).
- **Una interfaz que no abrume**: la cabecera, con lo del día a día; lo demás, en el menú de opciones, con un personaje que rota cada día ([menu](../src/features/menu/README.md)).
- **Lo personalizable se añade desde una sola ventana** (Customize, en el menú): personajes (imagen, GIF o vídeo) con sus frases por hora, sin límite, cómo se mueven y lo que dicen como compañero en Mi día, e ilustraciones por tipo de encargo ([customize](../src/features/customize/README.md)).
- **Personajes vivos sin inventar arte**: se animan con código sobre su propia imagen (malla de WebGL y efectos) o con el vídeo que sube el propietario ([living](../src/features/living/README.md)).
- **El vídeo de Hu Tao es público** y va en el repositorio sin crédito ([merchant](../src/features/merchant/README.md)).

---

## 13. Checklist final de cada tarea

- [ ] La lógica nueva está en el dominio o en un `actions.ts`, no en componentes.
- [ ] Toda escritura pasa por `dispatch`; los eventos nuevos tienen guardas y están en `randomStream`.
- [ ] Si cambia el resultado de `project()` para eventos ya guardados, `PROJECTION_VERSION` está subida; los cambios de formato tienen *upcaster* y se han probado con datos antiguos.
- [ ] Cada funcionalidad nueva está en `src/features/<nombre>/` con su README según la plantilla.
- [ ] Los textos están en `es.ts` y `ja.ts`; los assets, en `public/`.
- [ ] Si cambia la interfaz, se ha mirado también a 402 × 874.
- [ ] `tsc`, `pnpm test`, `pnpm build` y `pnpm docs:check` pasan; se ha probado en ejecución y se ha dicho qué no se probó.
- [ ] Documentación al día (sección 10), con el diagrama de clases redibujado si cambió el modelo.
- [ ] El trabajo está en su rama y se une a `main` solo cuando todo lo anterior está hecho (sección 14).
- [ ] Servidores de pruebas parados, viewport del navegador restaurado y datos del propietario como estaban.

---

## 14. Norma: una rama por funcionalidad

**No se trabaja directamente en `main`.** Cada funcionalidad o arreglo va en su rama y se une a `main` al terminar.

1. **Antes de empezar**, parte de `main` actualizada: `git switch main && git pull`, y después `git switch -c feature/<nombre>` (`fix/<nombre>` para arreglos, `docs/<nombre>` para documentación), con el mismo `<nombre>` que la carpeta de la funcionalidad cuando la haya.
2. **Durante el trabajo**, commits pequeños con mensajes en español que digan qué cambia y por qué.
3. **Para unir a `main`**, completa el checklist de la sección 13. Si hay remoto, abre un pull request contra `main`; si no, `git switch main && git merge --no-ff feature/<nombre>`. Luego borra la rama.
4. **Commits, push y merge** solo con el visto bueno del propietario: pídelo al terminar e indica qué se verificó.

Si al empezar hay cambios sin commit en `main`, avisa al propietario y propón moverlos a su rama antes de seguir.
