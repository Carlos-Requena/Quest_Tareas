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
import { QuestDetail, Toast } from "./components/QuestDetail";
import { Footer } from "./components/Footer";
import { CreateQuestModal } from "./components/CreateQuestModal";
import { ClearOverlay } from "./components/ClearOverlay";
import { PomodoroWatcher } from "./features/pomodoro";
import { SyncWatcher } from "./features/sync";
import { music } from "./features/music";
import { CollectionModal } from "./features/items";
import { TemporalBoard, TemporalOverlays, switchSection, temporalBusy } from "./features/temporal";
import { HorizonFilter, countHorizons, cycleHorizon, matchesHorizon, questDue, useHorizonUi } from "./features/horizon";
import { blockers } from "./features/complex";
import { MerchantModal, merchantBusy, openMerchant } from "./features/merchant";
import { Backdrop, CharacterModal, characterBusy, openCharacter } from "./features/equipment";
import { ChronicleModal, chronicleBusy, openChronicle } from "./features/chronicle";
import { DetailBack, MobileCreate, MobileNav, isPhone, useMobileUi } from "./features/mobile";
import { CalendarView, calendarBusy, toggleCalendar } from "./features/calendar";
import { AgendaFormModal } from "./features/agenda";
import { EditQuestModal, editingBusy, openEdit } from "./features/editing";
import { undoLast } from "./features/undo";
import { FailureOverlay, FailureWatcher, failureBusy } from "./features/failure";
import { QuickAddForm, QuickAddSheet, quickBusy, useQuickUi } from "./features/quickadd";
import { SearchModal, openSearch, searchBusy } from "./features/search";
import { NotificationScheduler } from "./features/notifications";
import { MenuScreen, menuBusy, openMenu } from "./features/menu";
import { CustomizeWindow, customizeBusy } from "./features/customize";

const ORDER: Record<Category, number> = { elite: 0, repeat: 1, request: 2 };
const COLS = 2;

// Este archivo tiene varias responsabilidades.
//  Inicializa la aplicación, lee el estado del juego filtrando quests según el tipo.
// Se encarga de aplicar plazos. Mantiene selección y navegación de quests. Renderiza la UI principal (tablón, detalle, modales).
// Se encarga de crear un listener global para el teclado.
// Elige la sección en la que se está.
// Monta overlays, además de adaptar la UI a escritorio o teléfono (detalles a pantalla completa, menú inferior, etc).

// Resumimos lo principal en App: lo que hace el usuario
// Actions: que operación se solicita (aceptar, abandonar, completar, etc).
// Domain: el calculo de operaciones sobre el estado del juego (proyecciones, plazos, bloqueos, etc).
// Game Store: registra eventos de usuario y actualiza el estado del juego (quests, temporals, etc).

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
        // Las de un encargo sin aceptar esperan en reserva (features/temporal).
        .filter((q) => q.status !== "done" && !q.reserved && (tab === "all" || q.category === tab))
        .sort((a, b) => ORDER[a.category] - ORDER[b.category] || a.createdAt - b.createdAt),
    [quests, tab],
  );
  const counts = useMemo(() => countHorizons(inTab, (q) => questDue(q, temporals), now), [inTab, temporals, now]);
  const visible = useMemo(() => inTab.filter((q) => matchesHorizon(horizon, questDue(q, temporals), now)), [inTab, horizon, temporals, now]);

  const selected = visible.find((q) => q.id === selectedId) ?? visible[0];

  useEffect(() => {
    if (selected && selected.id !== selectedId) select(selected.id);
  }, [selected, selectedId, select]);

  // Teléfono (features/mobile): el detalle va a pantalla completa mientras su quest siga a la vista.
  const detailId = useMobileUi((s) => s.detail);
  const detailOpen = detailId !== undefined && section === "board" && detailId === selected?.id;
  useEffect(() => {
    if (detailId !== undefined && !detailOpen) useMobileUi.getState().closeDetail();
  }, [detailId, detailOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState();
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      const busy = s.creating || s.clear || s.collection || temporalBusy() || merchantBusy() || characterBusy() || chronicleBusy() || calendarBusy() || editingBusy() || failureBusy() || searchBusy() || quickBusy() || menuBusy() || customizeBusy();
      // ⌘Z / Ctrl+Z: deshacer lo último (features/undo). ⌘K / Ctrl+K: buscar (features/search).
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && !typing && !busy) {
        const key = e.key.toLowerCase();
        if (key === "z") {
          e.preventDefault();
          void undoLast();
        } else if (key === "k") {
          e.preventDefault();
          openSearch();
        }
        return;
      }
      if (busy || e.metaKey || e.ctrlKey || typing) return;

      // Teclas comunes a los dos tablones y al calendario (que no tiene plazos: H no hace nada).
      const board = s.section === "calendar" ? undefined : s.section;
      const common: Record<string, () => void> = {
        t: () => switchSection(),
        i: () => (sfx.move(), s.setCollection("inventory")),
        c: () => (sfx.move(), openMerchant()),
        p: () => (sfx.move(), openCharacter()),
        j: () => (sfx.move(), openChronicle()),
        l: () => (sfx.move(), toggleLang()),
        m: () => music.toggle(),
        s: () => toggleCalendar(),
        // El menú de opciones (features/menu): con él abierto, su teclado manda (O o Escape lo cierran).
        o: () => openMenu(),
        "/": () => openSearch(),
        h: () => board && (sfx.move(), cycleHorizon(board, 1)),
        H: () => board && (sfx.move(), cycleHorizon(board, -1)),
      };
      if (common[e.key]) {
        common[e.key]();
        e.preventDefault();
        return;
      }
      // El tablón de encargos temporales y el calendario manejan sus propias teclas.
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
        // N apunta una quest en la línea rápida (features/quickadd); Mayús+N abre el formulario completo.
        case "n": useQuickUi.getState().focus(); break;
        case "N": s.setCreating(true); break;
        case "r": if (selected) openEdit(selected.id); break;
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
    <div className={`app ${detailOpen ? "m-detail" : ""}`}>
      <Backdrop />
      <Header />

      {section === "temporal" ? (
        <main className="main main-temporal">
          <TemporalBoard />
        </main>
      ) : section === "calendar" ? (
        <main className="main main-calendar">
          <CalendarView />
        </main>
      ) : (
        <main className="main">
          <aside className="board">
            <QuickAddForm />
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
                          if (q.id !== selected?.id || isPhone()) sfx.move();
                          select(q.id);
                          if (isPhone()) useMobileUi.getState().openDetail(q.id);
                        }}
                      />
                    ))}
                </AnimatePresence>
              </LayoutGroup>
            </div>
          </aside>

          <div className="divider" />

          {/* En el escritorio, m-sheet no cuenta (display: contents); en el teléfono es la hoja a pantalla completa. */}
          <div className="m-sheet">
            <DetailBack />
            <QuestDetail quest={selected} status={selected && effectiveStatus(selected, now)} now={now} />
          </div>
        </main>
      )}

      <Footer />
      <MobileNav />
      <MobileCreate />
      <div className="m-toast">
        <Toast />
      </div>
      <MenuScreen />
      <CreateQuestModal />
      <ClearOverlay />
      <CollectionModal />
      <MerchantModal />
      <CharacterModal />
      <ChronicleModal />
      <CustomizeWindow />
      <PomodoroWatcher />
      <SyncWatcher />
      <TemporalOverlays />
      <AgendaFormModal />
      <EditQuestModal />
      <QuickAddSheet />
      <SearchModal />
      <FailureOverlay />
      <FailureWatcher />
      <NotificationScheduler />
    </div>
  );
}
