// Vibración del iPhone (plugin haptics de Tauri): la acompaña a los sonidos de sfx.ts. Es una
// preferencia de este equipo (`quests.haptics`), aparte del silencio: quitar el sonido no quita la
// vibración. En el escritorio y en el navegador no hace nada (ni carga el plugin).

type Impact = "light" | "medium" | "heavy" | "soft" | "rigid";
type Outcome = "success" | "warning" | "error";

const KEY = "quests.haptics";

/** Solo en la app nativa de un teléfono: en el escritorio el plugin existe pero no vibra. */
export const hapticsAvailable = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window && /iPhone|iPad|iPod|Android/.test(navigator.userAgent);

let on = (() => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
})();

export const isHapticsOn = () => on;
export function setHapticsOn(v: boolean) {
  on = v;
  try {
    localStorage.setItem(KEY, v ? "on" : "off");
  } catch {
    // Sin almacenamiento: vale para esta sesión.
  }
}

type Plugin = typeof import("@tauri-apps/plugin-haptics");
let plugin: Promise<Plugin> | undefined;
const load = () => (plugin ??= import("@tauri-apps/plugin-haptics"));

/** Ejecuta `fn` con el plugin si toca vibrar; los fallos se ignoran (la vibración es un adorno). */
function run(fn: (p: Plugin) => Promise<unknown>) {
  if (!on || !hapticsAvailable()) return;
  void load()
    .then(fn)
    .catch(() => {});
}

// Los toques de selección pueden llegar seguidos (pasar de pestaña en pestaña): uno cada 40 ms basta.
let lastTick = 0;

export const haptic = {
  /** Cambiar de pestaña, de página, de filtro: el «clic» de un selector. */
  selection() {
    const now = performance.now();
    if (now - lastTick < 40) return;
    lastTick = now;
    run((p) => p.selectionFeedback());
  },
  /** Un golpe: cuanto más importante, más fuerte. */
  impact(style: Impact = "medium") {
    run((p) => p.impactFeedback(style));
  },
  /** El resultado de algo: bien, cuidado o mal. */
  outcome(type: Outcome) {
    run((p) => p.notificationFeedback(type));
  },
  /** Varios golpes encadenados (subir de nivel, el cofre): `[estilo, ms desde ahora]`. */
  pattern(steps: [Impact, number][]) {
    if (!on || !hapticsAvailable()) return;
    for (const [style, at] of steps) setTimeout(() => run((p) => p.impactFeedback(style)), at);
  },
};
