// Efectos de sonido sintetizados con WebAudio: sin archivos de audio que empaquetar.

let ctx: AudioContext | undefined;
let muted = localStorage.getItem("quests.muted") === "1";

export const isMuted = () => muted;
export function setMuted(v: boolean) {
  muted = v;
  localStorage.setItem("quests.muted", v ? "1" : "0");
}

function ac() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
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
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
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
  src.connect(f).connect(g).connect(a.destination);
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
};
