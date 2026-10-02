import { create } from "zustand";
import type { EventBody, GameEvent } from "../domain/events";
import { compareEvents } from "../domain/events";
import { project } from "../domain/projection";
import type { Category, GameState } from "../domain/types";
import { seedEvents } from "../domain/seed";
import { openEventStore, type EventStore } from "../storage/eventStore";
import { uid } from "../lib/id";
import type { Drop } from "../features/items/model";

export type Tab = "all" | Category;

/** Sección de la ventana: el tablón de quests o el de encargos temporales. */
export type Section = "board" | "temporal";

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
  events: GameEvent[];
  state: GameState;

  // UI
  section: Section;
  tab: Tab;
  selectedId?: string;
  creating: boolean;
  clear?: ClearResult;
  collection?: CollectionTab;
  /** El texto es una función para traducirlo al pintar: así sigue al idioma activo. */
  toast?: { text: () => string; key: number };

  init(): Promise<void>;
  dispatch(body: EventBody): Promise<void>;
  setSection(section: Section): void;
  setTab(tab: Tab): void;
  select(id?: string): void;
  setCreating(v: boolean): void;
  setClear(c?: ClearResult): void;
  setCollection(tab?: CollectionTab): void;
  say(text: () => string): void;
}

let initOnce: Promise<void> | undefined;

export const useGame = create<GameStore>((set, get) => {
  const newEvent = (store: EventStore, body: EventBody) =>
    ({ ...body, id: uid(), deviceId: store.deviceId, ts: Date.now() }) as GameEvent;

  async function load() {
    try {
      const store = await openEventStore();
      let events = await store.all();
      if (events.length === 0) {
        for (const body of seedEvents()) await store.append(newEvent(store, body));
        events = await store.all();
      }
      set({ store, events, state: project(events), ready: true });
    } catch (err) {
      console.error(err);
      set({ error: String(err), ready: true });
    }
  }

  return {
    ready: false,
    events: [],
    state: project([]),
    section: "board",
    tab: "all",
    creating: false,

    init() {
      initOnce ??= load();
      return initOnce;
    },

    async dispatch(body) {
      const { store, events } = get();
      if (!store) return;
      const e = newEvent(store, body);
      const next = [...events, e].sort(compareEvents);
      set({ events: next, state: project(next) });
      await store.append(e);
    },

    setSection: (section) => set({ section }),
    setTab: (tab) => set({ tab }),
    select: (selectedId) => set({ selectedId }),
    setCreating: (creating) => set({ creating }),
    setClear: (clear) => set({ clear }),
    setCollection: (collection) => set({ collection }),
    say: (text) => {
      const key = Date.now();
      set({ toast: { text, key } });
      setTimeout(() => get().toast?.key === key && set({ toast: undefined }), 4500);
    },
  };
});
