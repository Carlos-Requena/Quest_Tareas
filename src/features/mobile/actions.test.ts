// @vitest-environment happy-dom
// Botón principal del detalle en el teléfono: aceptar cierra antes la hoja y espera a que salga,
// para que el sello «EN CURSO» se vea sobre la tarjeta. En el escritorio, y al reportar, va directo.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { questDef } from "../../test/streams";

vi.mock("../../lib/sfx", async () => (await import("../../test/sfxMock")).sfxMock());

/** matchMedia falso: la pantalla es de teléfono o no. */
function screen(phone: boolean) {
  window.matchMedia = ((media: string) => ({
    matches: phone,
    media,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

async function boot() {
  vi.resetModules();
  const { useGame } = await import("../../store/game");
  const { useMobileUi } = await import("./ui");
  const { detailPrimaryAction, SHEET_MS } = await import("./actions");
  await useGame.getState().init();
  await useGame.getState().dispatch({
    type: "quest_created",
    quest: questDef("q1", { createdAt: Date.now(), conditions: [{ id: "c", kind: "count", label: "x", target: 1 }] }),
  });
  const status = () => useGame.getState().state.quests.get("q1")!.status;
  return { useGame, useMobileUi, detailPrimaryAction, SHEET_MS, status };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("quests.lang", "es");
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("detailPrimaryAction", () => {
  it("en el teléfono, aceptar cierra el detalle y acepta cuando la hoja ya ha salido", async () => {
    screen(true);
    const b = await boot();
    b.useMobileUi.getState().openDetail("q1");
    vi.useFakeTimers({ toFake: ["setTimeout"] });

    const done = b.detailPrimaryAction("q1");
    expect(b.useMobileUi.getState().detail).toBeUndefined();
    // Hasta que la hoja no ha salido del todo, la quest sigue sin aceptar.
    await vi.advanceTimersByTimeAsync(b.SHEET_MS - 1);
    expect(b.status()).toBe("available");

    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(b.status()).toBe("active");
  });

  it("en el escritorio acepta en el acto y no toca el estado del teléfono", async () => {
    screen(false);
    const b = await boot();
    b.useMobileUi.getState().openDetail("q1");

    await b.detailPrimaryAction("q1");
    expect(b.status()).toBe("active");
    expect(b.useMobileUi.getState().detail).toBe("q1");
  });

  it("reportar no cierra el detalle: «Quest Clear» ya ocupa la pantalla", async () => {
    screen(true);
    const b = await boot();
    await b.detailPrimaryAction("q1");
    await b.useGame.getState().dispatch({ type: "progress_added", questId: "q1", conditionId: "c", amount: 1 });
    b.useMobileUi.getState().openDetail("q1");

    await b.detailPrimaryAction("q1");
    expect(b.status()).toBe("done");
    expect(b.useMobileUi.getState().detail).toBe("q1");
    expect(b.useGame.getState().clear?.questId).toBe("q1");
  });

  it("si el detalle abierto es de otra quest, no espera", async () => {
    screen(true);
    const b = await boot();
    b.useMobileUi.getState().openDetail("otra");

    await b.detailPrimaryAction("q1");
    expect(b.status()).toBe("active");
    expect(b.useMobileUi.getState().detail).toBe("otra");
  });
});
