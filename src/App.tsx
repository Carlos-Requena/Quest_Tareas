import { useEffect, useMemo } from "react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { useGame } from "./store/game";
import { effectiveStatus } from "./domain/projection";
import type { Category } from "./domain/types";
import { abandonQuest, bumpNext, primaryAction } from "./store/actions";
import { useNow } from "./lib/time";
import { sfx } from "./lib/sfx";
import { Header } from "./components/Header";
import { Tabs, TABS } from "./components/Tabs";
import { QuestCard } from "./components/QuestCard";
import { QuestDetail } from "./components/QuestDetail";
import { Footer } from "./components/Footer";
import { CreateQuestModal } from "./components/CreateQuestModal";
import { ClearOverlay } from "./components/ClearOverlay";

const ORDER: Record<Category, number> = { elite: 0, repeat: 1, request: 2 };
const COLS = 2;

export default function App() {
  const ready = useGame((s) => s.ready);
  const error = useGame((s) => s.error);
  const init = useGame((s) => s.init);
  const quests = useGame((s) => s.state.quests);
  const tab = useGame((s) => s.tab);
  const selectedId = useGame((s) => s.selectedId);
  const select = useGame((s) => s.select);
  const now = useNow();

  useEffect(() => {
    init();
  }, [init]);

  const visible = useMemo(
    () =>
      [...quests.values()]
        .filter((q) => q.status !== "done" && (tab === "all" || q.category === tab))
        .sort((a, b) => ORDER[a.category] - ORDER[b.category] || a.createdAt - b.createdAt),
    [quests, tab],
  );

  const selected = visible.find((q) => q.id === selectedId) ?? visible[0];

  useEffect(() => {
    if (selected && selected.id !== selectedId) select(selected.id);
  }, [selected, selectedId, select]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState();
      if (s.creating || s.clear || e.metaKey || e.ctrlKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const idx = visible.findIndex((q) => q.id === selected?.id);
      const move = (d: number) => {
        const next = visible[Math.max(0, Math.min(visible.length - 1, idx + d))];
        if (next && next.id !== selected?.id) {
          sfx.move();
          select(next.id);
        }
      };
      const cycleTab = (d: number) => {
        const i = TABS.findIndex((t) => t.id === s.tab);
        sfx.move();
        s.setTab(TABS[(i + d + TABS.length) % TABS.length].id);
      };

      switch (e.key) {
        case "ArrowRight": move(1); break;
        case "ArrowLeft": move(-1); break;
        case "ArrowDown": move(COLS); break;
        case "ArrowUp": move(-COLS); break;
        case "q": cycleTab(-1); break;
        case "e": case "Tab": cycleTab(e.shiftKey ? -1 : 1); break;
        case "n": s.setCreating(true); break;
        case "Enter": case "a": if (selected) primaryAction(selected.id); break;
        case "x": case "Backspace": if (selected) abandonQuest(selected.id); break;
        case "+": case "=": if (selected) bumpNext(selected.id); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selected, select]);

  return (
    <div className="app">
      <div className="backdrop" />
      <Header />

      <main className="main">
        <aside className="board">
          <Tabs />
          <h3 className="sec-h board-h">
            <span className="gem" />
            <span className="tag">Postings</span>
            <span className="sec-sub">{visible.length} en el tablón</span>
            <span className="sec-line" />
          </h3>
          <div className="grid">
            {error && <p className="err">No se pudo abrir la base de datos: {error}</p>}
            <LayoutGroup>
              <AnimatePresence mode="popLayout">
                {ready &&
                  visible.map((q) => (
                    <QuestCard
                      key={q.id}
                      quest={q}
                      status={effectiveStatus(q, now)}
                      now={now}
                      selected={q.id === selected?.id}
                      onSelect={() => {
                        if (q.id !== selected?.id) sfx.move();
                        select(q.id);
                      }}
                    />
                  ))}
              </AnimatePresence>
            </LayoutGroup>
          </div>
        </aside>

        <div className="divider" />

        <QuestDetail quest={selected} status={selected && effectiveStatus(selected, now)} now={now} />
      </main>

      <Footer />
      <CreateQuestModal />
      <ClearOverlay />
    </div>
  );
}
