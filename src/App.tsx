import { useEffect, useMemo } from "react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { useTranslation } from "react-i18next";
import { toggleLang } from "./i18n";
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
import { PomodoroWatcher } from "./features/pomodoro";
import { music } from "./features/music";
import { CollectionModal } from "./features/items";
import { TemporalBoard, TemporalOverlays, switchSection, temporalBusy } from "./features/temporal";
import { HorizonFilter, countHorizons, cycleHorizon, matchesHorizon, questDue, useHorizonUi } from "./features/horizon";
import { blockers } from "./features/complex";
import { MerchantModal, merchantBusy, openMerchant } from "./features/merchant";
import { Backdrop, CharacterModal, characterBusy, openCharacter } from "./features/equipment";
import { ChronicleModal, chronicleBusy, openChronicle } from "./features/chronicle";

const ORDER: Record<Category, number> = { elite: 0, repeat: 1, request: 2 };
const COLS = 2;

export default function App() {
  const ready = useGame((s) => s.ready);
  const error = useGame((s) => s.error);
  const init = useGame((s) => s.init);
  const quests = useGame((s) => s.state.quests);
  const temporals = useGame((s) => s.state.temporals);
  const tab = useGame((s) => s.tab);
  const horizon = useHorizonUi((s) => s.filter.board);
  const selectedId = useGame((s) => s.selectedId);
  const select = useGame((s) => s.select);
  const section = useGame((s) => s.section);
  const now = useNow();
  const { t } = useTranslation();

  useEffect(() => {
    init();
  }, [init]);

  // Quests de la pestaña; el plazo (features/horizon) se cuenta sobre ellas y luego filtra.
  const inTab = useMemo(
    () =>
      [...quests.values()]
        .filter((q) => q.status !== "done" && (tab === "all" || q.category === tab))
        .sort((a, b) => ORDER[a.category] - ORDER[b.category] || a.createdAt - b.createdAt),
    [quests, tab],
  );
  const counts = useMemo(() => countHorizons(inTab, (q) => questDue(q, temporals), now), [inTab, temporals, now]);
  const visible = useMemo(() => inTab.filter((q) => matchesHorizon(horizon, questDue(q, temporals), now)), [inTab, horizon, temporals, now]);

  const selected = visible.find((q) => q.id === selectedId) ?? visible[0];

  useEffect(() => {
    if (selected && selected.id !== selectedId) select(selected.id);
  }, [selected, selectedId, select]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState();
      if (s.creating || s.clear || s.collection || temporalBusy() || merchantBusy() || characterBusy() || chronicleBusy() || e.metaKey || e.ctrlKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Teclas comunes a los dos tablones.
      const common: Record<string, () => void> = {
        t: () => switchSection(),
        i: () => (sfx.move(), s.setCollection("inventory")),
        c: () => (sfx.move(), openMerchant()),
        p: () => (sfx.move(), openCharacter()),
        j: () => (sfx.move(), openChronicle()),
        l: () => (sfx.move(), toggleLang()),
        m: () => music.toggle(),
        h: () => (sfx.move(), cycleHorizon(s.section, 1)),
        H: () => (sfx.move(), cycleHorizon(s.section, -1)),
      };
      if (common[e.key]) {
        common[e.key]();
        e.preventDefault();
        return;
      }
      // El tablón de encargos temporales maneja sus propias teclas (TemporalBoard).
      if (s.section !== "board") return;

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
      <Backdrop />
      <Header />

      {section === "temporal" ? (
        <main className="main main-temporal">
          <TemporalBoard />
        </main>
      ) : (
        <main className="main">
          <aside className="board">
            <Tabs />
            <HorizonFilter section="board" counts={counts} />
            <h3 className="sec-h board-h">
              <span className="gem" />
              <span className="tag">Postings</span>
              <span className="sec-sub">{t("board.onBoard", { n: visible.length })}</span>
              <span className="sec-line" />
            </h3>
            <div className="grid">
              {error && <p className="err">{t("app.dbError", { error })}</p>}
              <LayoutGroup>
                <AnimatePresence mode="popLayout">
                  {ready &&
                    visible.map((q) => (
                      <QuestCard
                        key={q.id}
                        quest={q}
                        status={effectiveStatus(q, now)}
                        now={now}
                        due={questDue(q, temporals)}
                        lock={blockers(q, quests)}
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
      )}

      <Footer />
      <CreateQuestModal />
      <ClearOverlay />
      <CollectionModal />
      <MerchantModal />
      <CharacterModal />
      <ChronicleModal />
      <PomodoroWatcher />
      <TemporalOverlays />
    </div>
  );
}
