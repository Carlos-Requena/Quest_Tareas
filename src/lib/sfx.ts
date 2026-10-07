// Efectos de sonido sintetizados con WebAudio: sin archivos de audio que empaquetar.

let ctx: AudioContext | undefined;
let bus: AudioNode | undefined;
let muted = localStorage.getItem("quests.muted") === "1";
const mutedListeners = new Set<(muted: boolean) => void>();

/** Silencio general (botón ♪ de la cabecera): efectos y música. */
export const isMuted = () => muted;
export function setMuted(v: boolean) {
  if (v === muted) return;
  muted = v;
  localStorage.setItem("quests.muted", v ? "1" : "0");
  mutedListeners.forEach((fn) => fn(v));
}
export function onMutedChange(fn: (muted: boolean) => void) {
  mutedListeners.add(fn);
  return () => void mutedListeners.delete(fn);
}

function ac() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Salida común con compresor: las celebraciones suman muchas capas y no deben saturar. */
function out() {
  if (!bus) {
    const a = ac();
    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(a.destination);
    bus = comp;
  }
  return bus;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, attack = 0.01) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(out());
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

/** Tono que se desliza de `from` a `to` Hz mientras crece (cargas y caídas). */
function sweep(from: number, to: number, start: number, dur: number, type: OscillatorType, gain: number) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  const t0 = a.currentTime + start;
  o.type = type;
  o.frequency.setValueAtTime(from, t0);
  o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.85);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.08);
  o.connect(g).connect(out());
  o.start(t0);
  o.stop(t0 + dur + 0.12);
}

function noise(dur: number, gain: number, cutoff: number) {
  const a = ac();
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  const src = a.createBufferSource();
  const f = a.createBiquadFilter();
  const g = a.createGain();
  src.buffer = buf;
  f.type = "lowpass";
  f.frequency.value = cutoff;
  g.gain.value = gain;
  src.connect(f).connect(g).connect(out());
  src.start();
}

/**
 * Ruido filtrado con barrido de frecuencia y envolvente propia: silbidos, papel, chasquidos.
 * `attack` es lo que tarda en llegar al máximo (un silbido que crece lo tiene largo).
 */
function hiss(start: number, dur: number, gain: number, type: BiquadFilterType, from: number, to = from, attack = 0.005, q = 1) {
  const a = ac();
  const t0 = a.currentTime + start;
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  const f = a.createBiquadFilter();
  const g = a.createGain();
  src.buffer = buf;
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(attack, dur * 0.9));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(out());
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** Acorde de orquesta (sierras con un filtro que se cierra): el «golpe» de la música. */
function stab(freqs: number[], start: number, dur: number, gain: number) {
  const a = ac();
  const t0 = a.currentTime + start;
  const f = a.createBiquadFilter();
  const g = a.createGain();
  f.type = "lowpass";
  f.frequency.setValueAtTime(2600, t0);
  f.frequency.exponentialRampToValueAtTime(420, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  f.connect(g).connect(out());
  for (const fr of freqs)
    for (const det of [-6, 6]) {
      const o = a.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = fr;
      o.detune.value = det;
      o.connect(f);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }
}

/** Nota de celesta: fundamental limpia con un armónico brillante que se apaga antes. */
function celesta(freq: number, start: number, dur: number, gain: number) {
  tone(freq, start, dur, "sine", gain);
  tone(freq * 2, start, dur * 0.55, "sine", gain * 0.35);
  tone(freq * 4, start, dur * 0.25, "sine", gain * 0.12);
}

/** Campanilla: parciales inarmónicos como una campana pequeña de metal. */
function chime(freq: number, start: number, dur: number, gain: number) {
  [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(freq * m, start, dur / (1 + i * 0.6), "sine", gain / (1 + i * 1.4)));
}

export const sfx = {
  move() {
    if (muted) return;
    tone(1400, 0, 0.04, "sine", 0.03);
  },
  stamp() {
    if (muted) return;
    noise(0.18, 0.5, 1800);
    tone(85, 0, 0.22, "sine", 0.5);
    tone(170, 0, 0.08, "triangle", 0.15);
  },
  tick() {
    if (muted) return;
    tone(880, 0, 0.06, "triangle", 0.08);
    tone(1320, 0.03, 0.08, "sine", 0.05);
  },
  cancel() {
    if (muted) return;
    tone(330, 0, 0.12, "triangle", 0.1);
    tone(220, 0.07, 0.16, "triangle", 0.1);
  },
  shatter() {
    if (muted) return;
    noise(0.5, 0.35, 6000);
    [2400, 3100, 2800, 3600].forEach((f, i) => tone(f, i * 0.04, 0.25, "sine", 0.03));
  },
  clear() {
    if (muted) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.08 * i, 0.6, "triangle", 0.12));
  },
  levelUp() {
    if (muted) return;
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone(f, 0.07 * i, 0.9, "triangle", 0.11),
    );
  },
  /** Revelado de un drop: más notas cuanto mayor es la rareza (0 común … 5 legendario). */
  reveal(tier: number) {
    if (muted) return;
    const notes = [659.25, 783.99, 987.77, 1174.66, 1318.5, 1567.98];
    for (let i = 0; i <= tier; i++) tone(notes[i], i * 0.055, 0.5 + tier * 0.08, "triangle", 0.06 + tier * 0.012);
    if (tier >= 4) [2093, 2637, 3136].forEach((f, i) => tone(f, 0.35 + i * 0.07, 0.9, "sine", 0.035));
  },
  /** Lluvia de monedas: tintineos agudos a destiempo. */
  coins(n = 8) {
    if (muted) return;
    for (let i = 0; i < n; i++) {
      const t = i * 0.045 + Math.random() * 0.03;
      const f = 2200 + Math.random() * 1400;
      tone(f, t, 0.09, "triangle", 0.035);
      tone(f * 1.5, t + 0.01, 0.12, "sine", 0.02);
    }
  },
  /** El cofre cae sobre la mesa. */
  chestLand() {
    if (muted) return;
    noise(0.12, 0.35, 700);
    tone(70, 0, 0.25, "sine", 0.4);
  },
  /** El cofre se carga de energía: zumbido que sube de tono y latidos graves. */
  chestCharge(dur: number) {
    if (muted) return;
    sweep(60, 330, 0, dur, "sawtooth", 0.03);
    sweep(120, 660, 0, dur, "triangle", 0.05);
    sweep(900, 2600, dur * 0.45, dur * 0.55, "sine", 0.022);
    for (let i = 0; i < 6; i++) tone(48 + i * 7, (i * dur) / 6, 0.14, "sine", 0.1 + i * 0.025);
  },
  /** La luz del cofre sube de rareza (paso 0, 1, 2…): campanada cada vez más aguda. */
  chestUpgrade(step: number) {
    if (muted) return;
    const f = [987.77, 1318.5, 1760, 2349.3][Math.min(step, 3)];
    tone(f, 0, 0.4, "triangle", 0.11);
    tone(f * 1.5, 0.04, 0.45, "sine", 0.06);
    tone(f * 2, 0.08, 0.55, "sine", 0.035);
    noise(0.16, 0.12, 6500);
  },
  /** El cofre estalla: golpe grave, caída de tono, acorde y brillo que crecen con la rareza (0 … 5). */
  chestOpen(tier: number) {
    if (muted) return;
    noise(0.9, 0.42, 1400 + tier * 500);
    sweep(190, 36, 0, 0.6, "sine", 0.5);
    tone(52, 0, 0.9, "sine", 0.35);
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093];
    chord.slice(0, 3 + tier).forEach((f, i) => tone(f, 0.08 + i * 0.035, 1.1 + tier * 0.2, "triangle", 0.05));
    [2637, 3136, 3951, 4699].forEach((f, i) => tone(f, 0.25 + i * 0.07, 1.3, "sine", 0.018 + tier * 0.004));
  },
  /** Fanfarria al revelar un objeto épico o mejor (3 épico, 4 mítico, 5 legendario). */
  fanfare(tier: number) {
    if (muted) return;
    const notes =
      tier >= 5
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093]
        : tier >= 4
          ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
          : [587.33, 739.99, 880, 1174.66];
    notes.forEach((f, i) => tone(f, i * 0.055, 0.22, "square", 0.022));
    const end = notes.length * 0.055;
    notes.slice(-3).forEach((f) => tone(f, end, 1.7, "triangle", 0.06));
    if (tier >= 5) for (let i = 0; i < 12; i++) tone(2000 + Math.random() * 2600, end + 0.15 + i * 0.08, 0.35, "sine", 0.018);
  },
  /** Pasar página del almanaque. */
  page() {
    if (muted) return;
    noise(0.22, 0.12, 2600);
    noise(0.08, 0.06, 5000);
  },
  /** Campana de fin de concentración: dos golpes con armónicos. */
  bell() {
    if (muted) return;
    [0, 0.45].forEach((t) => {
      tone(880, t, 1.6, "sine", 0.16);
      tone(1760, t, 1.1, "sine", 0.05);
      tone(2637, t, 0.6, "sine", 0.025);
    });
  },

  // ───── Encargos temporales (src/features/temporal) ─────
  // Imitan los dos vídeos de referencia: el texto que irrumpe con un silbido y un
  // golpe de orquesta en do mayor; el destello agudo; el sello de cada calavera; y,
  // al cumplir, el estallido brillante, el tic-tic del contador, la campanilla en do7
  // y la melodía re-fa-mi-fa-sol-mi-fa que resuelve en fa mayor.

  /** El texto se acerca a toda velocidad: silbido que sube de tono y de volumen. */
  posterWhoosh(dur = 0.34) {
    if (muted) return;
    hiss(0, dur + 0.05, 0.32, "bandpass", 260, 3200, dur * 0.85, 0.9);
    hiss(0, dur + 0.05, 0.12, "highpass", 2500, 7000, dur * 0.9);
    sweep(70, 150, 0, dur, "sine", 0.12);
  },
  /** El texto golpea el pergamino: bombo, palmada de papel y acorde de orquesta (do mayor). */
  posterSlam() {
    if (muted) return;
    sweep(120, 40, 0, 0.38, "sine", 0.55);
    hiss(0, 0.14, 0.5, "bandpass", 1500, 700, 0.003, 0.7);
    hiss(0, 0.5, 0.14, "lowpass", 900, 200, 0.004);
    stab([130.81, 196, 261.63, 329.63, 392], 0.0, 1.1, 0.045);
    tone(65.41, 0, 0.9, "triangle", 0.18);
  },
  /** El destello recorre las letras: «shing» agudo y chispas que suben. */
  glint() {
    if (muted) return;
    hiss(0, 0.32, 0.07, "highpass", 6000, 9000, 0.12);
    [2637, 3136, 3951, 4699, 5274].forEach((f, i) => tone(f, 0.03 + i * 0.045, 0.32, "sine", 0.028));
  },
  /** Una calavera se estampa: golpe húmedo de sello y nota sombría que sube con cada una (0, 1, 2…). */
  skullStamp(i = 0) {
    if (muted) return;
    sweep(105, 44, 0, 0.2, "sine", 0.5);
    hiss(0, 0.11, 0.38, "bandpass", 900, 260, 0.003, 1.4);
    hiss(0.01, 0.05, 0.1, "highpass", 3500, 2000, 0.002);
    const minor = [146.83, 174.61, 220, 293.66, 349.23, 440];
    tone(minor[Math.min(i, minor.length - 1)], 0.01, 0.45, "square", 0.022);
    tone(minor[Math.min(i, minor.length - 1)] / 2, 0.01, 0.5, "triangle", 0.08);
  },
  /** Chincheta que se clava en la madera. */
  pin() {
    if (muted) return;
    hiss(0, 0.035, 0.18, "highpass", 3200, 2600, 0.002);
    sweep(560, 300, 0, 0.07, "triangle", 0.2);
    tone(140, 0.01, 0.12, "sine", 0.18);
  },
  /** Papel que se rasga (0–1: un trozo o el cartel entero). */
  paperRip(amount = 1) {
    if (muted) return;
    const n = Math.round(6 + amount * 12);
    for (let i = 0; i < n; i++) {
      const f = 1400 + Math.random() * 3200;
      hiss(i * (0.32 / n) + Math.random() * 0.012, 0.05 + Math.random() * 0.05, 0.14 + Math.random() * 0.1, "bandpass", f, f * 0.7, 0.003, 1.2);
    }
  },
  /** Cartel que se despliega en grande. */
  unfold() {
    if (muted) return;
    hiss(0, 0.26, 0.12, "bandpass", 900, 2600, 0.08, 0.8);
    hiss(0.12, 0.12, 0.06, "highpass", 4000, 3000, 0.01);
  },
  /** Encargo cumplido: estallido brillante con crepitar de chispas y un acorde radiante en fa mayor. */
  clearBurst() {
    if (muted) return;
    hiss(0, 1.5, 0.36, "lowpass", 9000, 1200, 0.006);
    sweep(150, 38, 0, 0.6, "sine", 0.5);
    for (let i = 0; i < 34; i++) tone(3800 + Math.random() * 5200, 0.02 + Math.random() * 0.9, 0.018, "square", 0.012 + Math.random() * 0.012);
    [349.23, 440, 523.25, 698.46, 880].forEach((f, i) => tone(f, 0.04 + i * 0.03, 1.8, "triangle", 0.045, 0.12));
    [1396.9, 1760, 2093].forEach((f, i) => tone(f, 0.2 + i * 0.06, 1.4, "sine", 0.022, 0.2));
  },
  /** Una calavera vencida se vuelve de oro (0, 1, 2…): campanilla que sube. */
  purify(i = 0) {
    if (muted) return;
    const f = [987.77, 1174.66, 1318.5, 1567.98, 1760][Math.min(i, 4)];
    chime(f, 0, 0.7, 0.07);
    hiss(0, 0.12, 0.05, "highpass", 6000, 8000, 0.005);
  },
  /** Los dígitos giran como una tragaperras: tic-tic rápido durante `dur` segundos. */
  slotRoll(dur: number) {
    if (muted) return;
    const step = 0.034;
    for (let t = 0, i = 0; t < dur; t += step, i++) tone(i % 2 ? 3300 : 2900, t, 0.012, "square", 0.018);
  },
  /** Un dígito se detiene. */
  slotStop() {
    if (muted) return;
    tone(1800, 0, 0.05, "square", 0.03);
    tone(900, 0, 0.08, "triangle", 0.06);
  },
  /** El contador se fija: campanilla en do7 con brillo. */
  slotDing() {
    if (muted) return;
    chime(2093, 0, 1.4, 0.12);
    chime(1046.5, 0, 1.6, 0.06);
    hiss(0, 0.4, 0.05, "highpass", 7000, 9000, 0.01);
  },
  /** Melodía de cierre (re-fa-mi-fa-sol-mi-fa → fa mayor), como la del vídeo. */
  clearMelody() {
    if (muted) return;
    const notes = [587.33, 698.46, 659.25, 698.46, 783.99, 659.25, 698.46];
    notes.forEach((f, i) => celesta(f, i * 0.17, 0.55, 0.07));
    const end = notes.length * 0.17;
    [523.25, 1046.5].forEach((f) => celesta(f, end + 0.1, 1.2, 0.05));
    [440, 523.25, 698.46, 880].forEach((f, i) => tone(f, end + 0.45 + i * 0.04, 2.2, "sine", 0.035, 0.25));
  },
  /**
   * Una quest se fractura (features/failure): crujido seco, golpe grave y un acorde menor
   * que cae. `stage` 0 es la primera grieta; 1, cuando se rompe en pedazos.
   */
  fracture(stage: 0 | 1 = 1) {
    if (muted) return;
    if (stage === 0) {
      hiss(0, 0.09, 0.22, "highpass", 3200, 1800, 0.002, 2);
      tone(140, 0, 0.18, "sine", 0.3);
      return;
    }
    noise(0.6, 0.4, 4200);
    tone(70, 0, 0.5, "sine", 0.5);
    hiss(0.02, 0.35, 0.16, "bandpass", 2600, 700, 0.003, 3);
    // La menor que baja: el «game over» de la quest.
    stab([220, 261.63, 329.63], 0.18, 1.1, 0.07);
    sweep(330, 110, 0.25, 1.1, "triangle", 0.06);
  },
  /** Un cartel prende y arde (features/failure): soplo del fuego, chasquidos y un acorde grave. */
  burn(dur = 2.4) {
    if (muted) return;
    hiss(0, 0.5, 0.18, "lowpass", 300, 1600, 0.25);
    hiss(0.2, dur, 0.1, "bandpass", 900, 500, 0.6, 0.7);
    for (let i = 0; i < 18; i++) hiss(0.25 + Math.random() * dur, 0.03, 0.12 + Math.random() * 0.1, "highpass", 2500 + Math.random() * 3000, 1500, 0.001, 4);
    stab([110, 130.81, 164.81], 0.3, dur, 0.04);
  },

  // ───── Menú de opciones (src/features/menu) ─────

  /** El menú barre la pantalla: silbido rápido que sube y un destello metálico al llegar. */
  menuOpen() {
    if (muted) return;
    hiss(0, 0.3, 0.2, "bandpass", 420, 4200, 0.2, 0.8);
    hiss(0.02, 0.28, 0.06, "highpass", 3000, 8000, 0.2);
    sweep(80, 170, 0, 0.26, "sine", 0.08);
    [1567.98, 2093, 2637].forEach((f, i) => tone(f, 0.24 + i * 0.035, 0.45, "sine", 0.022));
  },
  /** El menú se retira: el silbido al revés, que baja. */
  menuClose() {
    if (muted) return;
    hiss(0, 0.24, 0.15, "bandpass", 3600, 420, 0.05, 0.8);
    sweep(160, 80, 0, 0.2, "sine", 0.06);
  },
};
