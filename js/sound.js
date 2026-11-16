// Efeitos sonoros e música sintetizados na hora (sem arquivos de áudio).

let ctx = null;
let enabled = true;
let lastThud = 0;

// 'all' = efeitos e música, 'sfx' = só efeitos, 'off' = silêncio.
export function setAudioMode(mode) {
  enabled = mode !== 'off';
  musicWanted = mode === 'all';
  if (musicWanted) startMusic();
  else stopMusic();
}

// O navegador só libera áudio depois de um toque: chamar no primeiro toque.
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().then(startMusic, () => {});
    else startMusic();
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

// --- Música de fundo ---
// Tema próprio do jogo: 8 compassos em dó maior que se repetem, tocados por um
// agendador que marca as notas um pouco antes da hora para o ritmo não falhar.

const STEP = 60 / 116 / 2; // duração de uma colcheia, em segundos
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Uma linha por compasso, 8 colcheias cada; 0 é pausa.
const MELODY = [
  76, 79, 0, 76, 72, 0, 74, 76,
  72, 76, 0, 69, 72, 0, 71, 69,
  69, 72, 77, 0, 76, 74, 72, 0,
  74, 0, 71, 74, 79, 0, 77, 74,
  76, 79, 0, 84, 83, 0, 79, 76,
  81, 0, 76, 72, 76, 0, 69, 72,
  77, 76, 74, 72, 69, 0, 72, 74,
  71, 74, 79, 0, 74, 71, 67, 0,
];
// Acorde de cada compasso: [baixo, notas do acorde]
const CHORDS = [
  [48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [59, 62, 67]],
  [48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [59, 62, 67]],
];

let musicWanted = true;
let musicTimer = 0;
let musicGain = null;
let noise = null;
let nextTime = 0;
let stepIndex = 0;
let tempo = 1;

function note(midi, time, duration, type, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = hz(midi);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain).connect(musicGain);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

function hat(time) {
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6000;
  src.buffer = noise;
  gain.gain.setValueAtTime(0.05, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  src.connect(filter).connect(gain).connect(musicGain);
  src.start(time);
  src.stop(time + 0.06);
}

function playStep(i, time) {
  const beat = i % 8;
  const [bass, chord] = CHORDS[Math.floor(i / 8)];
  const len = STEP / tempo;
  if (MELODY[i]) note(MELODY[i], time, len * 1.6, 'triangle', 0.16);
  if (beat === 0) note(bass, time, len * 2.4, 'sine', 0.22);
  if (beat === 4) note(bass + 7, time, len * 2.4, 'sine', 0.18);
  if (beat === 2 || beat === 6) for (const n of chord) note(n, time, len * 1.2, 'triangle', 0.05);
  if (beat % 2 === 1) hat(time);
}

function schedule() {
  if (!ctx || ctx.state !== 'running') return;
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // aba voltou depois de um tempo parada
  while (nextTime < ctx.currentTime + 0.3) {
    playStep(stepIndex, nextTime);
    nextTime += STEP / tempo;
    stepIndex = (stepIndex + 1) % MELODY.length;
  }
}

export function startMusic() {
  if (!musicWanted || musicTimer || !ctx || ctx.state !== 'running') return;
  if (!musicGain) {
    musicGain = ctx.createGain();
    musicGain.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  musicGain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.4);
  nextTime = ctx.currentTime + 0.06;
  musicTimer = setInterval(schedule, 80);
  schedule();
}

export function stopMusic() {
  if (!musicTimer) return;
  clearInterval(musicTimer);
  musicTimer = 0;
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
}

// A música acelera quando a pilha passa da linha.
export function setMusicTension(tense) {
  tempo = tense ? 1.3 : 1;
}

export const musicPlaying = () => !!musicTimer;
