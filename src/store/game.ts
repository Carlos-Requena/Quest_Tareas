import { create } from "zustand";
import { EVENT_VERSION, nextTs, type EventBody, type EventPos, type GameEvent } from "../domain/events";
import { finishProjection, project } from "../domain/projection";
import type { Category, GameState } from "../domain/types";
import { seedEvents } from "../domain/seed";
import { openEventStore, type EventStore } from "../storage/eventStore";
import { uid } from "../lib/id";
import type { Drop } from "../features/items/model";
import {
  applyAll,
  cloneAcc,
  emptyProjected,
  goesAfter,
  rebuild as rebuildProjection,
  restore,
  saveSnapshot,
  SNAPSHOT_EVERY,
  verifyAgainstFull,
  type Projected,
} from "../features/snapshot";

export type Tab = "all" | Category;

/** Sección de la ventana: el tablón de quests, el de encargos temporales o el calendario (features/calendar). */
export type Section = "board" | "temporal" | "calendar";

/** Pestaña abierta en la ventana de objetos (inventario, almanaque o probabilidades). */
export type CollectionTab = "inventory" | "almanac" | "rates";

export interface ClearResult {
  questId: string;
  before: GameState["player"];
  after: GameState["player"];
  /** Objeto garantizado de la quest, si existía al reportarla. */
  guaranteed?: string;
  drops: Drop[];
}

interface GameStore {
  ready: boolean;
  error?: string;
  store?: EventStore;
  /** Proyección en memoria: acumulador y último evento aplicado. Los eventos viven en el almacén. */
  projected: Projected;
  state: GameState;

  // UI
  section: Section;
  tab: Tab;
  selectedId?: string;
  creating: boolean;
  clear?: ClearResult;
  collection?: CollectionTab;
  /**
   * El texto es una función para traducirlo al pintar: así sigue al idioma activo.
   * `action`: un botón en el aviso (por ejemplo, «Deshacer», features/undo).
   */
  toast?: { text: () => string; key: number; action?: ToastAction };

  init(): Promise<void>;
  /** Guarda el evento y lo aplica. Devuelve el evento guardado (con su id), o nada si aún no hay almacén. */
  dispatch(body: EventBody): Promise<GameEvent | undefined>;
  /** Recalcula todo desde los eventos (tras fusionar eventos de otro dispositivo, por ejemplo). */
  rebuild(): Promise<void>;
  setSection(section: Section): void;
  setTab(tab: Tab): void;
  select(id?: string): void;
  setCreating(v: boolean): void;
  setClear(c?: ClearResult): void;
  setCollection(tab?: CollectionTab): void;
  say(text: () => string, action?: ToastAction): void;
}

/** Botón de un aviso: su texto (traducido al pintar) y lo que hace. */
export interface ToastAction {
  label: () => string;
  run(): void;
}

let initOnce: Promise<void> | undefined;
/** Eventos que tenía el último snapshot guardado. */
let snapCount = 0;
/** Los snapshots se guardan de uno en uno, en orden. */
let saving = Promise.resolve();
let rebuilding: Promise<void> | undefined;

/** Guarda un snapshot si han pasado SNAPSHOT_EVERY eventos desde el anterior (o si se fuerza). */
function maybeSnapshot(p: Projected, force = false) {
  if (!force && p.count - snapCount < SNAPSHOT_EVERY) return;
  snapCount = p.count;
  // `p.acc` no se vuelve a modificar: cada dispatch trabaja sobre una copia.
  saving = saving.then(() => saveSnapshot(p));
}

export const useGame = create<GameStore>((set, get) => {
  /** Los eventos de este equipo van siempre después del último aplicado (reloj híbrido, ver nextTs). */
  const newEvent = (store: EventStore, body: EventBody, last?: EventPos) =>
    ({ ...body, id: uid(), deviceId: store.deviceId, ts: nextTs(Date.now(), last), v: EVENT_VERSION }) as GameEvent;

  async function load() {
    try {
      const store = await openEventStore();
      let r = await restore(store);
      if (r.count === 0) {
        let last: EventPos | undefined;
        for (const body of seedEvents()) {
          const e = newEvent(store, body, last);
          await store.append(e);
          last = e;
        }
        r = await rebuildProjection(store);
      }
      // En desarrollo, se comprueba que el snapshot da lo mismo que reproducirlo todo.
      if (import.meta.env.DEV && r.snapCount > 0) {
        const full = await verifyAgainstFull(store, r);
        if (full) r = { ...full, snapCount: 0 };
      }
      snapCount = r.snapCount;
      set({ store, projected: r, state: finishProjection(r.acc), ready: true });
      maybeSnapshot(r);
    } catch (err) {
      console.error(err);
      set({ error: String(err), ready: true });
    }
  }

  return {
    ready: false,
    projected: emptyProjected(),
    state: project([]),
    section: "board",
    tab: "all",
    creating: false,

    init() {
      initOnce ??= load();
      return initOnce;
    },

    async dispatch(body) {
      if (rebuilding) await rebuilding;
      const { store, projected } = get();
      if (!store) return;
      const e = newEvent(store, body, projected.last);
      // Reloj del equipo más de MAX_DRIFT_MS por detrás de lo aplicado: el evento cae en medio del historial y hay que recalcular.
      // Deshacer (features/undo) cambia el pasado: también se recalcula todo.
      if (!goesAfter(projected, e) || e.type === "event_undone") {
        await store.append(e);
        await get().rebuild();
        return e;
      }
      // Solo el evento nuevo, sobre una copia: el estado anterior no cambia.
      const next = applyAll({ ...projected, acc: cloneAcc(projected.acc) }, [e]);
      set({ projected: next, state: finishProjection(next.acc) });
      await store.append(e);
      maybeSnapshot(next);
      return e;
    },

    rebuild() {
      const { store } = get();
      if (!store) return Promise.resolve();
      rebuilding ??= rebuildProjection(store)
        .then((r) => {
          snapCount = 0;
          set({ projected: r, state: finishProjection(r.acc) });
          maybeSnapshot(r, true);
        })
        .finally(() => (rebuilding = undefined));
      return rebuilding;
    },

    setSection: (section) => set({ section }),
    setTab: (tab) => set({ tab }),
    select: (selectedId) => set({ selectedId }),
    setCreating: (creating) => set({ creating }),
    setClear: (clear) => set({ clear }),
    setCollection: (collection) => set({ collection }),
    say: (text, action) => {
      const key = Date.now() + Math.random();
      set({ toast: { text, key, action } });
      // Con un botón, un poco más: da tiempo a leerlo y pulsarlo.
      setTimeout(() => get().toast?.key === key && set({ toast: undefined }), action ? 7000 : 4500);
    },
  };
});
