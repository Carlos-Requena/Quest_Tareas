import { isMuted, onMutedChange, setMuted } from "../../lib/sfx";
import { DEFAULT_TRACK, TRACKS, trackUrl, type TrackId } from "./tracks";

export interface MusicState {
  /** Preferencia del usuario: quiere música. */
  enabled: boolean;
  /** Está sonando de verdad (el navegador puede bloquearlo hasta la primera interacción). */
  playing: boolean;
  /** El silencio general (botón ♪) está activo: la música calla aunque esté activada. */
  muted: boolean;
  volume: number;
  trackId: TrackId;
  loading: boolean;
  error?: string;
}

const STORAGE_KEY = "quests.music";
const FADE_IN_S = 1.5;
const FADE_OUT_S = 0.6;

function loadPrefs(): Partial<Pick<MusicState, "enabled" | "volume" | "trackId">> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * Reproductor de música de fondo. Es una clase de verdad (no tipos + funciones
 * puras como el dominio) porque envuelve recursos imperativos (<audio> y Web
 * Audio) con su propio ciclo de vida. Es una preferencia de este equipo: no usa
 * eventos ni se sincroniza. La interfaz se suscribe con useMusic().
 *
 * El volumen va por un GainNode de Web Audio y no por audio.volume: algunos
 * WebView ignoran audio.volume, y la ganancia permite fundidos exactos.
 */
export class MusicPlayer {
  private audio?: HTMLAudioElement;
  private ctx?: AudioContext;
  private gain?: GainNode;
  private blobUrls = new Map<TrackId, string>();
  private listeners = new Set<() => void>();
  private pauseTimer?: ReturnType<typeof setTimeout>;
  private unlock?: (e: Event) => void;
  private loading?: Promise<HTMLAudioElement>;
  private offMuted: () => void;
  private state: MusicState;

  constructor() {
    const p = loadPrefs();
    const trackId = TRACKS.some((t) => t.id === p.trackId) ? (p.trackId as TrackId) : DEFAULT_TRACK;
    this.state = {
      enabled: p.enabled ?? true,
      playing: false,
      muted: isMuted(),
      volume: typeof p.volume === "number" ? Math.min(1, Math.max(0, p.volume)) : 0.35,
      trackId,
      loading: false,
    };
    this.offMuted = onMutedChange((m) => this.onMasterMute(m));
  }

  // ── Suscripción (para useSyncExternalStore) ──
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  getSnapshot = () => this.state;

  private set(patch: Partial<MusicState>) {
    this.state = { ...this.state, ...patch };
    const { enabled, volume, trackId } = this.state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, volume, trackId }));
    } catch {
      // sin persistencia: la preferencia dura solo esta sesión
    }
    this.listeners.forEach((fn) => fn());
  }

  // ── Control ──
  async play() {
    this.set({ enabled: true, error: undefined });
    if (this.state.muted) return; // silencio general: se recuerda la preferencia, pero no suena
    try {
      const audio = await this.ensureAudio();
      if (!this.state.enabled || this.state.muted) return; // cambió mientras cargaba
      this.cancelPause();
      if (audio.paused) await audio.play();
      void this.ctx?.resume();
      this.set({ playing: true });
      this.rampTo(this.state.volume, FADE_IN_S);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        // El navegador exige un gesto del usuario: arrancará con la primera interacción.
        this.armAutoplay();
      } else {
        console.error(err);
        this.set({ playing: false, error: String(err) });
      }
    }
  }

  /** Apaga la música (preferencia del usuario). */
  pause() {
    this.set({ enabled: false });
    this.silence();
  }

  /** Botón de música o tecla M. Si todo está silenciado, quita el silencio y suena. */
  toggle() {
    if (this.state.muted) {
      setMuted(false); // onMasterMute(false) se encarga de reanudar
      if (!this.state.enabled) void this.play();
      return;
    }
    if (this.state.enabled && this.state.playing) this.pause();
    else void this.play();
  }

  setVolume(v: number) {
    const volume = Math.min(1, Math.max(0, v));
    this.set({ volume });
    if (this.state.playing) this.rampTo(volume, 0.05);
  }

  /** Si la preferencia es «con música», empieza con la primera tecla o clic. */
  armAutoplay() {
    if (!this.state.enabled || this.state.muted || this.state.playing || this.unlock) return;
    const unlock = (e: Event) => {
      this.disarm();
      // Si el gesto es un control de sonido (botones o tecla M), él decide.
      const onControl =
        e instanceof KeyboardEvent
          ? e.key.toLowerCase() === "m"
          : (e.target as Element | null)?.closest?.(".music, .mute");
      if (onControl) return;
      if (this.state.enabled && !this.state.playing) void this.play();
    };
    this.unlock = unlock;
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
  }

  /** Libera todo (recarga en caliente de Vite y cierre). */
  dispose() {
    this.disarm();
    this.cancelPause();
    this.offMuted();
    this.audio?.pause();
    this.audio = undefined;
    void this.ctx?.close();
    this.ctx = undefined;
    this.blobUrls.forEach((u) => URL.revokeObjectURL(u));
    this.blobUrls.clear();
    this.listeners.clear();
  }

  // ── Interno ──
  private onMasterMute(muted: boolean) {
    this.set({ muted });
    if (muted) this.silence();
    else if (this.state.enabled) void this.play();
  }

  /** Fundido a cero y pausa, sin tocar la preferencia `enabled`. */
  private silence() {
    this.set({ playing: false });
    this.disarm();
    this.rampTo(0, FADE_OUT_S);
    this.cancelPause();
    this.pauseTimer = setTimeout(() => this.audio?.pause(), FADE_OUT_S * 1000 + 50);
  }

  private cancelPause() {
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.pauseTimer = undefined;
  }

  private disarm() {
    if (!this.unlock) return;
    window.removeEventListener("pointerdown", this.unlock, true);
    window.removeEventListener("keydown", this.unlock, true);
    this.unlock = undefined;
  }

  /** Cambio de volumen suave por la ganancia (no depende de requestAnimationFrame). */
  private rampTo(target: number, seconds: number) {
    if (!this.ctx || !this.gain) return;
    const g = this.gain.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(target, now + seconds);
  }

  /**
   * Descarga la pista entera como Blob y la reproduce desde memoria (4,7 MB):
   * el <audio> no depende de peticiones por rangos al protocolo de Tauri.
   * <audio> → MediaElementSource → GainNode → altavoces.
   */
  private ensureAudio(): Promise<HTMLAudioElement> {
    if (this.audio) return Promise.resolve(this.audio);
    // Dos play() seguidos comparten la misma carga: nunca hay dos <audio>.
    this.loading ??= this.loadAudio().finally(() => (this.loading = undefined));
    return this.loading;
  }

  private async loadAudio(): Promise<HTMLAudioElement> {
    const id = this.state.trackId;
    let url = this.blobUrls.get(id);
    if (!url) {
      this.set({ loading: true });
      try {
        const res = await fetch(trackUrl(id));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        url = URL.createObjectURL(await res.blob());
        this.blobUrls.set(id, url);
      } finally {
        this.set({ loading: false });
      }
    }
    const audio = new Audio(url);
    audio.loop = true;
    audio.preload = "auto";

    this.ctx ??= new AudioContext();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;
    this.ctx.createMediaElementSource(audio).connect(this.gain).connect(this.ctx.destination);

    this.audio = audio;
    return audio;
  }
}

// Instancia única para toda la app, guardada en globalThis: aunque el módulo se
// evalúe dos veces (recarga en caliente que falla a medias), nunca hay dos
// reproductores sonando a la vez.
const KEY = "__questsMusicPlayer";
const g = globalThis as unknown as Record<string, MusicPlayer | undefined>;
export const music: MusicPlayer = (g[KEY] ??= new MusicPlayer());

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    music.dispose();
    if (g[KEY] === music) delete g[KEY];
  });
}
