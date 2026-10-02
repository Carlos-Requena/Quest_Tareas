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

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.01);
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
};
