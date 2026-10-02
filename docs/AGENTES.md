# Guía para agentes que trabajan en Quests

Esta guía es para cualquier agente (o persona) que vaya a hacer tareas en este repositorio. Resume la arquitectura que describe el [informe técnico](INFORME-TECNICO.md) y fija **las normas de trabajo que hay que seguir**. Léela entera antes de tocar código; las secciones marcadas como **norma** no son sugerencias.

---

## 1. Qué es Quests, en 30 segundos

App de escritorio (macOS y Windows) que convierte tareas en *quests* de estilo JRPG: tablón con categorías, objetivos con contador o con pomodoro, XP, niveles, oro, objetos con rareza (inventario, almanaque y drops al estilo gacha) y animaciones (sello «EN CURSO», tarjeta que se rompe, «Quest Clear», «Level Up!»). Interfaz en español y japonés, con música de fondo.

- **Stack:** Tauri 2 (Rust) + React 19 + TypeScript 6 + Vite 8 + Zustand 5 + Motion + GSAP + i18next, con SQLite vía `tauri-plugin-sql`.
- **Modelo de datos:** *event sourcing* local-first. Se guardan **eventos inmutables** en SQLite y el estado se **calcula** reproduciéndolos (`project()`).
- **Idioma del proyecto:** el código, los comentarios, la documentación y la comunicación con el propietario van **en español**.

---

## 2. Qué leer y en qué orden

| Orden | Documento | Para qué |
|---|---|---|
| 1 | Esta guía | Normas y mapa del proyecto |
| 2 | [INFORME-TECNICO.md](INFORME-TECNICO.md) | Arquitectura, diagramas, eventos, escalabilidad, deuda, decisiones (ADR) y hoja de ruta |
| 3 | [COMO-FUNCIONA.md](COMO-FUNCIONA.md) | Mecanismos por dentro: Tauri, proyección, niveles, animaciones, sonido, i18n, fallos ya resueltos |
| 4 | `src/features/<nombre>/README.md` | Diseño de cada funcionalidad (`pomodoro`, `music` e `items`) |
| 5 | [README.md](../README.md) | Comandos y estructura resumida |

---

## 3. Comandos

```bash
pnpm install            # dependencias
pnpm tauri dev          # app nativa con recarga en caliente (Vite en el puerto 1420, fijo)
pnpm dev                # solo la UI en el navegador; los datos van a localStorage
npx tsc --noEmit        # comprobar tipos
pnpm build              # tipos + build del frontend a dist/
pnpm tauri build        # instalador para el sistema actual
```

- El puerto **1420 es fijo** (`strictPort`). Si ya está ocupado, probablemente el propietario tiene la app abierta: **úsala** (`http://localhost:1420`) en vez de arrancar otra copia. Si arrancas un servidor tú, **páralo al terminar**.
- La base de datos nativa está en `~/Library/Application Support/com.quests.app/quests.db` (macOS) y `%APPDATA%\com.quests.app\` (Windows). Para inspeccionarla: `sqlite3 <ruta> "SELECT json_extract(body,'$.type'), count(*) FROM events GROUP BY 1;"`.
- **No borres nunca** `quests.db` ni el `localStorage` del propietario sin su permiso explícito: es su progreso real.

---

## 4. Mapa del código

```
src/
  domain/            Dominio PURO (sin React, Zustand, Tauri ni DOM)
    types.ts           QuestDef, QuestState, ConditionDef (contador | pomodoro), PlayerState…
    events.ts          Unión EventBody (eventos de quest + PomodoroEventBody)
    projection.ts      project(eventos) → GameState; conditionProgress, conditionsMet(q, now)…
    leveling.ts        Curva de XP, rangos F→S, huecos de quest activa
    seed.ts            Quests de ejemplo del primer arranque (en el idioma activo)
  storage/
    eventStore.ts      Interfaz EventStore + SQLite (Tauri) + localStorage (navegador)
  store/
    game.ts            Store Zustand: eventos, estado proyectado, estado de UI, dispatch()
    actions.ts         Casos de uso: aceptar, progresar, reportar, abandonar
  components/        Interfaz (Header, Tabs, QuestCard, QuestDetail, CreateQuestModal, ClearOverlay, Footer)
  features/          UNA CARPETA POR FUNCIONALIDAD, cada una con su README.md
    pomodoro/          Pomodoro como tipo de condición (rondas; la última sin descanso)
    music/             Música de fondo (servicio local, sin eventos)
    items/             Objetos con rareza: almanaque, inventario, drops con pity (eventos item_*)
  i18n/              i18next: index.ts, locales/es.ts (referencia), locales/ja.ts, tipos
  lib/               sfx (Web Audio + silencio general), useMuted, id/PRNG, time (useNow, formatRemaining)
  styles/            theme.css (tokens), app.css (componentes)
public/music/        Pistas de música (Vite las copia a dist/music/)
src-tauri/           Rust: lib.rs (plugin SQL), tauri.conf.json, capabilities/default.json
docs/                Esta guía, informe técnico, cómo funciona, img/ con los diagramas
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
- **Cambiar la forma de un evento o de `QuestDef` exige compatibilidad hacia atrás**: los datos antiguos se convierten **al leerlos** (*upcasting*). Sigue el patrón de `src/features/pomodoro/legacy.ts`, que convierte el pomodoro antiguo en una condición de 1 ronda, y documéntalo en el README de la funcionalidad.
- **La proyección es tolerante:** cada `case` de `project()` tiene una **guarda** que ignora eventos imposibles (por ejemplo, completar una quest que no está activa). Así se fusionan eventos de varios dispositivos sin duplicar XP.
- **Prefiere deltas a valores absolutos** (`progress_added { amount: +1 }`), para que dos dispositivos sumen en vez de pisarse.
- **Copia en el evento lo que no debe cambiar a posteriori**, como la recompensa en `quest_completed`.

### 5.2 Dominio puro y tiempo

- `src/domain/` y los `model.ts` de las funcionalidades **no importan** React, Zustand, Tauri, `window` ni el DOM.
- **El dominio no llama a `Date.now()`.** El tiempo entra como parámetro (`now`) o viene del evento (`e.ts`). Ejemplos: `effectiveStatus(q, now)`, `viewPomodoro(p, plan, now)`, `conditionsMet(q, now)`.
- **Lo que depende del paso del tiempo se calcula, no se guarda**, y no genera eventos. Es el caso del fin de la espera de una repetible o de las fases y rondas del pomodoro.
- **El dominio tampoco llama a `Math.random()`.** El azar entra como parámetro (`rnd`) y se resuelve en la acción; su resultado se guarda en el evento (los drops van en `quest_completed`). Así la proyección es determinista.
- La lógica que decide (¿se puede aceptar? ¿está completa?) vive en `domain/` o en `store/actions.ts` (o en el `actions.ts` de la funcionalidad), **nunca en un componente**.

### 5.3 Qué va en eventos y qué no

| Va en eventos (se sincroniza) | No va en eventos (`localStorage`, por equipo) |
|---|---|
| Quests, aceptar, progreso, completar (con sus drops), pomodoros, objetos del almanaque (con su imagen) | Idioma (`quests.lang`), silencio general (`quests.muted`), música (`quests.music`), id del dispositivo en el navegador |

### 5.4 Clases o funciones

- **Dominio:** tipos (`interface`) más funciones puras. Nada de `class` con estado mutable: tiene que poder serializarse como JSON y reconstruirse desde eventos.
- **Recursos imperativos** (audio, reproductores, conexiones): se permite una `class` con instancia única. Ejemplo: `MusicPlayer`, guardado en `globalThis` para sobrevivir a recargas en caliente que fallan a medias.

---

## 6. Norma: una carpeta por implementación

**Toda funcionalidad nueva va en su propia carpeta `src/features/<nombre>/`**, con este contenido:

```
src/features/<nombre>/
├── README.md        OBLIGATORIO: requisitos, decisiones, diagramas, eventos, integración, verificación
├── index.ts         API pública para la interfaz
├── model.ts         Tipos y funciones puras (lo único que puede importar src/domain)
├── events.ts        Sus eventos, si los tiene (se suman a EventBody)
├── legacy.ts        Conversión de datos antiguos, si cambia algo ya guardado
├── actions.ts       Casos de uso: validan y llaman a dispatch
├── i18n.ts          Textos es + ja (ja tipado como `typeof es`)
├── <nombre>.css     Estilos propios (importados desde sus componentes)
└── components/      Componentes React
```

- **La integración fuera de la carpeta debe ser mínima:** tipos (`domain/types.ts`), la unión de eventos (`domain/events.ts`), la proyección (`domain/projection.ts`), los diccionarios (`i18n/locales/{es,ja}.ts`, montando `xxxEs` / `xxxJa`) y el componente que la aloja. Enuméralo en la tabla «Puntos de integración» del README.
- **El dominio nunca importa el `index.ts` de una funcionalidad**: ese archivo reexporta `actions.ts`, que importa el store, y se crearía un ciclo.
- Toma como plantilla `src/features/pomodoro/` (funcionalidad de dominio, con eventos) o `src/features/music/` (servicio local, sin eventos). `src/features/items/` es el ejemplo de funcionalidad con entidades propias, azar e imágenes.

---

## 7. Interfaz, animaciones y estilos

- **Textos:** nunca escribas texto visible a mano en un componente. Usa `t("clave")`. Las claves se añaden en `es.ts` (referencia) **y** en `ja.ts`; TypeScript falla si falta alguna. Fuera de React, usa `i18n.t(...)`. En los avisos, `say(() => i18n.t(...))` (una función, para que se traduzcan al cambiar de idioma).
- **No se traduce** lo que escribe el usuario (títulos, descripciones, objetivos). Las etiquetas decorativas en inglés (ELITE, REQUEST, QUEST CLEAR, LEVEL UP!) se quedan en inglés a propósito.
- **Japonés:** escribe con el vocabulario de JRPG ya usado (受注する, 取りやめる, 必要な条件, 報酬, 受注枠, 貼り紙…). Para ajustes tipográficos, usa selectores `:lang(ja)`.
- **Animaciones:** Motion para entrar, salir y layout; GSAP para secuencias encadenadas. Patrón de `QuestCard`:
  - guardar el estado anterior en un `useRef`;
  - lanzar la línea de tiempo solo en la transición que interesa;
  - en cualquier otro caso, fijar el estado final con `gsap.set`;
  - limpiar con `tl.kill()`, nunca con `tl.progress(1)`, porque reaplica estilos después de React.

  Si GSAP controla la visibilidad de un elemento, React no debe controlarla también.
- **Nada de saltos de layout** en controles: lo que se despliega va en capas absolutas (ver el volumen de `MusicControl`).
- **Colores:** usa siempre los tokens de `theme.css` (`--gold`, `--elite`, `--repeat`, `--request`, `--stamp`, las rarezas `--r-common` … `--r-legendary`…), sin colores sueltos.
- **Fuentes:** importa solo subconjuntos latinos (`@fontsource/<fuente>/latin-<peso>.css`). Los subconjuntos japoneses sumaban **26 MB**; el japonés usa el mincho del sistema.
- **Sonido:** los efectos van en `lib/sfx.ts` y respetan `isMuted()`. El botón ♪ de la cabecera es el **silencio general** (efectos y música).

---

## 8. Assets y Tauri

- **Archivos estáticos** (música, imágenes): en `public/`, nunca en `dist/`. `dist/` se borra entera en cada build y está en `.gitignore`.
- **Música:** se copia a `public/music/` y se registra en `src/features/music/tracks.ts` y en `i18n.ts`.
- **Permisos de Tauri:** se conceden de forma explícita y mínima en `src-tauri/capabilities/default.json`. Cada plugin nuevo necesita su permiso y su registro en `src-tauri/src/lib.rs`.
- **Secretos:** nunca en el repositorio ni en SQLite. Los tokens OAuth de la fase 2 irán al llavero del sistema.

---

## 9. Norma: verificar antes de dar algo por terminado

1. `npx tsc --noEmit` sin errores y `pnpm build` correcto.
2. **Probarlo en ejecución**, no solo compilar: `pnpm dev` en el navegador o `pnpm tauri dev` si toca Rust o algo nativo.
3. **Lógica de dominio:** comprueba casos concretos con marcas de tiempo fijas, importando el módulo puro (`await import('/src/features/x/model.ts')`). Hasta que haya Vitest, es la forma de verificar.
4. **Lo que depende del tiempo** (horas o minutos): no esperes. Inyecta eventos con `ts` en el pasado en el `localStorage` de pruebas del navegador y recarga.
5. **Datos antiguos:** si cambias un formato, comprueba que los datos existentes se siguen viendo bien.
6. **Informa con honestidad:** di qué verificaste y cómo, y qué **no** (por ejemplo, el sonido, Windows o la app empaquetada). Nunca presentes como probado algo que no lo está.

### Trampas conocidas del entorno de pruebas

- **Recarga en caliente de Vite:** un módulo editado se sirve como `archivo.ts?t=…`. Importar `/src/store/game.ts` a mano puede dar **otra instancia** del store. Recarga la página antes de inspeccionar estado.
- **Recargas que fallan a medias** al crear varios archivos seguidos: pueden dejar módulos viejos vivos. Recarga entera (⌘R) antes de concluir nada.
- **Pestaña en segundo plano** (`document.hidden`): `requestAnimationFrame` se frena y las animaciones de GSAP no avanzan. No es un fallo de la app.
- **Ventana emulada en el panel del navegador:** los clics por coordenadas pueden caer fuera. Comprueba con un registro de eventos antes de dar un botón por roto.

---

## 10. Documentación que hay que mantener al día

| Si cambias… | Actualiza |
|---|---|
| Una funcionalidad | Su `src/features/<nombre>/README.md` |
| Un mecanismo general (store, proyección, i18n, Tauri) | [COMO-FUNCIONA.md](COMO-FUNCIONA.md) |
| El modelo de datos, eventos o arquitectura | El [informe técnico](https://claude.ai/code/artifact/1cb3618f-d1e6-483e-a198-a1998279827b) (diagrama de clases), su copia [INFORME-TECNICO.md](INFORME-TECNICO.md) y `docs/img/` si cambian los diagramas |
| Una decisión de arquitectura | Añade una fila ADR (decisión, alternativas descartadas, motivo, consecuencia) |
| Comandos, estructura o atajos | [README.md](../README.md) y esta guía |

---

## 11. Deuda conocida: no la empeores

Prioridad alta, pendiente (fase 1.5 de la hoja de ruta):
- **Sin tests automáticos** (falta Vitest para `projection`, `leveling`, `pomodoro/model` y `legacy`).
- **Eventos sin campo `v`.** El *upcasting* ya existe en `legacy.ts`, pero falta versión explícita.
- **Orden por reloj local** (`ts`): falta un reloj lógico híbrido.
- **Sin error boundary:** un fallo de React deja la ventana en negro.
- **CSP desactivada** (`csp: null`) y **Windows sin probar**.

Si tu tarea toca alguno de estos puntos, aprovecha para resolverlo o, al menos, no añadas más casos.

---

## 12. Cómo trabajar con el propietario

- Escribe en español, claro y directo. Explica las decisiones de diseño que tomes por tu cuenta y ofrece cambiarlas.
- Si una petición choca con estas normas (por ejemplo, guardar algo en `dist/` o guardar estado en vez de eventos), **explica el motivo y propone la alternativa correcta** antes de actuar.
- Las preferencias del propietario que surjan en el trabajo (como «una carpeta por implementación») se añaden a esta guía.

---

## 13. Checklist final de cada tarea

- [ ] La lógica nueva está en el dominio o en `actions.ts`, no en componentes.
- [ ] Toda escritura de estado pasa por `dispatch`, y los eventos nuevos tienen guardas en `project()`.
- [ ] Los cambios de formato tienen *upcaster* y se ha probado con datos antiguos.
- [ ] Cada funcionalidad nueva está en `src/features/<nombre>/` con su README.
- [ ] Los textos están en `es.ts` y `ja.ts`.
- [ ] Los assets están en `public/`.
- [ ] `tsc` y `build` pasan, se ha probado en ejecución y se ha dicho qué no se probó.
- [ ] Documentación actualizada (sección 10).
- [ ] Servidores de pruebas parados y viewport del navegador restaurado.
