import {
  createGame, drop, step, tick, canDrop, clampAim, dropTime,
  W, H, LINE_Y, DROP_Y, DT, RADII, MAX_LEVEL, KINDS, NAMES,
} from './game.js';
import { animalSVG, tileColor } from './art.js';
import { sfx, setSound, unlockAudio } from './sound.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('pt-BR');

// O armazenamento pode falhar (aba anônima, bloqueio): o jogo segue sem salvar.
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* sem salvar */ }
  },
};

function validState(s) {
  const level = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_LEVEL;
  return s && KINDS.includes(s.kind) && Array.isArray(s.bodies) && level(s.current) && level(s.next) &&
    [s.score, s.aim, s.drops, s.timer, s.rivalAt].every(Number.isFinite) &&
    s.bodies.every((b) => level(b.level) && [b.x, b.y, b.px, b.py, b.r, b.r0, b.age, b.angle].every(Number.isFinite));
}

const saved = store.get('miau.drop', null);
let state = validState(saved) ? saved : createGame('cat');
let best = store.get('miau.drop.best', 0);
const album = store.get('miau.album', { cat: 0, dog: 0 });
let effects = []; // anéis e textos que aparecem onde algo acontece
let shake = 0; // segundos de tremor que restam
let active = false; // o relógio só corre depois do primeiro toque nesta visita
let soundOn = store.get('miau.sound', true);
setSound(soundOn);
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

const save = () => store.set('miau.drop', state);

// --- Desenho ---

const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const sprites = {}; // 'cat3' -> imagem pronta para o canvas

function sprite(kind, level) {
  const key = kind + level;
  if (!sprites[key]) {
    const svg = animalSVG(kind, level).replace('<svg ', '<svg width="200" height="200" ');
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    sprites[key] = img;
  }
  return sprites[key];
}

function drawAnimal(level, x, y, r, angle, alpha = 1, rival = false) {
  const kind = rival ? (state.kind === 'cat' ? 'dog' : 'cat') : state.kind;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = rival ? '#3a3f4a' : tileColor(kind, level);
  ctx.fill();
  ctx.lineWidth = rival ? 3 : 1.5;
  ctx.strokeStyle = rival ? '#e5484d' : 'rgb(0 0 0 / 0.18)';
  ctx.stroke();
  const img = sprite(kind, level);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, -r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
  ctx.restore();
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
}
new ResizeObserver(resize).observe(canvas);

function draw() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (shake > 0 && !calm.matches) {
    const amp = 28 * shake;
    ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
  }

  const danger = state.danger > 0 || state.over;
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = danger ? 'rgb(230 40 40 / 0.9)' : 'rgb(255 255 255 / 0.55)';
  ctx.beginPath();
  ctx.moveTo(0, LINE_Y);
  ctx.lineTo(W, LINE_Y);
  ctx.stroke();

  const ready = canDrop(state);
  if (ready) {
    ctx.strokeStyle = 'rgb(255 255 255 / 0.4)';
    ctx.beginPath();
    ctx.moveTo(state.aim, DROP_Y);
    ctx.lineTo(state.aim, H);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const b of state.bodies) drawAnimal(b.level, b.x, b.y, b.r, b.angle, 1, b.rival);

  if (!state.over) {
    const r = RADII[state.current - 1];
    drawAnimal(state.current, state.aim, DROP_Y, r, 0, ready ? 1 : 0.35);
    if (ready && active) { // relógio: o anel vai sumindo até o bicho cair sozinho
      ctx.beginPath();
      ctx.arc(state.aim, DROP_Y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (state.timer / dropTime(state)));
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = state.timer < 1 ? '#e5484d' : 'rgb(255 255 255 / 0.9)';
      ctx.stroke();
    }
  }

  if (state.warning) { // seta piscando onde o intruso vai cair
    const { x, t } = state.warning;
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 22);
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.moveTo(x - 14, 6);
    ctx.lineTo(x + 14, 6);
    ctx.lineTo(x, 30);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const e of effects) {
    const k = e.t / e.life;
    if (e.text) {
      ctx.font = `800 ${e.size}px "Baloo 2", "Trebuchet MS", sans-serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 1 - k * k;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgb(0 0 0 / 0.55)';
      ctx.fillStyle = e.color;
      const x = Math.min(W - 50, Math.max(50, e.x));
      const y = Math.max(24, e.y - 34 * k);
      ctx.strokeText(e.text, x, y);
      ctx.fillText(e.text, x, y);
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1 + k * 0.5), 0, Math.PI * 2);
      ctx.lineWidth = 5 * (1 - k);
      ctx.strokeStyle = `rgb(255 255 255 / ${0.9 * (1 - k)})`;
      ctx.stroke();
    }
  }
}

// --- Placar, avisos e álbum ---

function face(kind, level) {
  return `<div class="face" style="background:${tileColor(kind, level)}">${animalSVG(kind, level)}</div>`;
}

let shownNext = '';
function renderHud() {
  if (state.score > best) {
    best = state.score;
    store.set('miau.drop.best', best);
  }
  $('score').textContent = fmt(state.score);
  $('best').textContent = fmt(best);
  const key = state.kind + state.next;
  if (key !== shownNext) {
    shownNext = key;
    $('next').innerHTML = face(state.kind, state.next);
  }
  if (state.over && $('over').hidden) {
    $('final').textContent = fmt(state.score);
    $('over').hidden = false;
  }
}

let toastTimer = 0;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

function unlock(level, announce) {
  if (level <= album[state.kind]) return;
  album[state.kind] = level;
  store.set('miau.album', album);
  if (announce) toast(`Novo no álbum: ${NAMES[state.kind][level - 1]}`);
}

function renderAlbum() {
  for (const kind of KINDS) {
    $(`album-${kind}`).innerHTML = NAMES[kind].map((name, i) => {
      const got = i + 1 <= album[kind];
      return `<li class="${got ? '' : 'locked'}">` +
        (got ? face(kind, i + 1) : '<div class="face"><span class="q">?</span></div>') +
        `<span>${got ? name : '???'}</span></li>`;
    }).join('');
  }
}

// --- Laço do jogo ---

const ring = (x, y, r) => effects.push({ x, y, r, t: 0, life: 0.3 });
const floatText = (x, y, text, size = 18, color = '#fff') => effects.push({ x, y, text, size, color, t: 0, life: 0.9 });

function handle(events) {
  if (!events.length) return;
  let changed = false;
  for (const e of events) {
    if (e.type === 'merge') {
      ring(e.x, e.y, RADII[e.level - 1]);
      floatText(e.x, e.y, `+${fmt(e.gained)}`);
      if (e.combo > 1) floatText(e.x, e.y - 22, `Combo x${e.combo}`, 22, '#ffd43b');
      if (e.level >= 6) shake = 0.25;
      sfx.merge(e.level, e.combo);
      unlock(e.level, true);
    } else if (e.type === 'adopt') {
      ring(e.x, e.y, RADII[MAX_LEVEL - 1]);
      floatText(e.x, e.y, `+${fmt(e.gained)}`, 26, '#ffd43b');
      toast(`${NAMES[state.kind][MAX_LEVEL - 1]} adotado!`);
      shake = 0.4;
      sfx.adopt();
    } else if (e.type === 'scare') {
      floatText(e.x, e.y, `Xô! +${e.gained}`, 18, '#ffb3b3');
      sfx.scare();
    } else if (e.type === 'rival') {
      sfx.rival();
    } else if (e.type === 'autodrop') {
      sfx.drop();
      unlock(state.current, false);
    }
    changed = true;
  }
  if (events.some((e) => e.type === 'merge' || e.type === 'adopt' || e.type === 'scare')) navigator.vibrate?.(12);
  if (changed) save();
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const elapsed = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += elapsed;
  const wasOver = state.over;
  const hadWarning = !!state.warning;
  while (acc >= DT) {
    handle(active ? tick(state, DT) : step(state, DT));
    acc -= DT;
  }
  if (state.warning && !hadWarning) sfx.warning();
  if (state.over && !wasOver) {
    sfx.over();
    save();
  }
  shake = Math.max(0, shake - elapsed);
  for (const e of effects) e.t += elapsed;
  effects = effects.filter((e) => e.t < e.life);
  renderHud();
  draw();
  requestAnimationFrame(frame);
}

function release() {
  if (!drop(state, state.aim)) return;
  sfx.drop();
  unlock(state.current, false);
  save();
}

function newGame(kind) {
  state = createGame(kind);
  effects = [];
  active = false;
  $('over').hidden = true;
  unlock(Math.max(state.current, state.next), false);
  save();
}

// --- Controles ---

const toAim = (e) => {
  const rect = canvas.getBoundingClientRect();
  state.aim = clampAim(state.current, ((e.clientX - rect.left) / rect.width) * W);
};
const wake = () => {
  active = true;
  unlockAudio();
};
let aiming = false;
canvas.addEventListener('pointerdown', (e) => {
  aiming = true;
  wake();
  canvas.setPointerCapture?.(e.pointerId);
  toAim(e);
});
canvas.addEventListener('pointermove', (e) => {
  if (aiming || e.pointerType === 'mouse') toAim(e);
});
canvas.addEventListener('pointerup', (e) => {
  if (!aiming) return;
  aiming = false;
  toAim(e);
  release();
});
canvas.addEventListener('pointercancel', () => { aiming = false; });

window.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]')) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', ' '].includes(e.key)) wake();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    state.aim = clampAim(state.current, state.aim + (e.key === 'ArrowLeft' ? -14 : 14));
  } else if (e.key === ' ' || e.key === 'ArrowDown') {
    release();
  } else {
    return;
  }
  e.preventDefault();
});

for (const kind of KINDS) {
  for (const btn of document.querySelectorAll(`[data-kind="${kind}"]`)) {
    btn.insertAdjacentHTML('afterbegin', face(kind, 1));
    btn.addEventListener('click', () => {
      $('chooser').close();
      newGame(kind);
    });
  }
}
$('new').addEventListener('click', () => $('chooser').showModal());
$('chooser-close').addEventListener('click', () => $('chooser').close());
$('album-btn').addEventListener('click', () => {
  renderAlbum();
  $('album').showModal();
});
$('album-close').addEventListener('click', () => $('album').close());
const soundBtn = $('sound');
function renderSound() {
  soundBtn.textContent = soundOn ? 'Com som' : 'Sem som';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
}
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  setSound(soundOn);
  store.set('miau.sound', soundOn);
  unlockAudio();
  renderSound();
});
renderSound();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});

unlock(Math.max(state.current, state.next, ...state.bodies.map((b) => b.level)), false);
state.aim = clampAim(state.current, state.aim);
resize();
requestAnimationFrame(frame);
