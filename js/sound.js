// Efeitos sonoros sintetizados na hora (sem arquivos de áudio).

let ctx = null;
let enabled = true;
let lastThud = 0;

export function setSound(on) {
  enabled = on;
}

// O navegador só libera áudio depois de um toque: chamar no primeiro toque.
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* sem áudio */ }
}

function tone(from, to, duration, type = 'sine', volume = 0.12, delay = 0) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

export const sfx = {
  drop: () => tone(260, 150, 0.09, 'triangle', 0.1),
  // baque ao cair: mais grave para bicho grande, no máximo um a cada 60 ms
  thud: (strength, level) => {
    const now = performance.now();
    if (now - lastThud < 60) return;
    lastThud = now;
    tone(150 - level * 7, 50, 0.1, 'sine', 0.05 + 0.09 * strength);
  },
  // quanto maior o bicho e o combo, mais agudo
  merge: (level, combo) => {
    const f = 300 * 2 ** ((level + combo - 2) / 7);
    tone(f, f * 1.5, 0.16, 'sine', 0.15);
    tone(f * 1.5, f * 2, 0.14, 'sine', 0.08, 0.07);
  },
  scare: () => tone(900, 250, 0.28, 'sawtooth', 0.05),
  warning: () => {
    tone(520, 520, 0.08, 'square', 0.04);
    tone(520, 520, 0.08, 'square', 0.04, 0.16);
  },
  rival: () => tone(180, 90, 0.25, 'square', 0.05),
  adopt: () => [0, 1, 2, 3].forEach((i) => tone(520 * 1.26 ** i, 520 * 1.26 ** i, 0.18, 'sine', 0.12, i * 0.1)),
  over: () => [0, 1, 2].forEach((i) => tone(330 / 1.2 ** i, 300 / 1.2 ** i, 0.3, 'triangle', 0.12, i * 0.22)),
};
