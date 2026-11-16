import {
  createGame, drop, step, canDrop, clampAim,
  W, H, LINE_Y, DROP_Y, DT, RADII, MAX_LEVEL, KINDS, NAMES, ADOPTION_BONUS,
} from './game.js';
import { animalSVG, tileColor } from './art.js';

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
    Number.isFinite(s.score) &&
    s.bodies.every((b) => level(b.level) && [b.x, b.y, b.px, b.py, b.r, b.r0, b.age, b.angle].every(Number.isFinite));
}

const saved = store.get('miau.drop', null);
let state = validState(saved) ? saved : createGame('cat');
let best = store.get('miau.drop.best', 0);
const album = store.get('miau.album', { cat: 0, dog: 0 });
let aim = W / 2;
let effects = []; // anéis que aparecem onde dois bichos se juntam

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

function drawAnimal(level, x, y, r, angle, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = tileColor(state.kind, level);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgb(0 0 0 / 0.18)';
  ctx.stroke();
  const img = sprite(state.kind, level);
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
    ctx.moveTo(aim, DROP_Y);
    ctx.lineTo(aim, H);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const b of state.bodies) drawAnimal(b.level, b.x, b.y, b.r, b.angle);
  if (!state.over) drawAnimal(state.current, aim, DROP_Y, RADII[state.current - 1], 0, ready ? 1 : 0.35);

  for (const e of effects) {
    const k = e.t / 0.3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (1 + k * 0.5), 0, Math.PI * 2);
    ctx.lineWidth = 5 * (1 - k);
    ctx.strokeStyle = `rgb(255 255 255 / ${0.9 * (1 - k)})`;
    ctx.stroke();
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

function handle(events) {
  if (!events.length) return;
  for (const e of events) {
    effects.push({ x: e.x, y: e.y, r: RADII[e.level - 1], t: 0 });
    if (e.type === 'adopt') toast(`${NAMES[state.kind][MAX_LEVEL - 1]} adotado! +${fmt(ADOPTION_BONUS)}`);
    else unlock(e.level, true);
  }
  navigator.vibrate?.(12);
  save();
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const elapsed = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += elapsed;
  const wasOver = state.over;
  while (acc >= DT) {
    handle(step(state, DT));
    acc -= DT;
  }
  if (state.over && !wasOver) save();
  for (const e of effects) e.t += elapsed;
  effects = effects.filter((e) => e.t < 0.3);
  renderHud();
  draw();
  requestAnimationFrame(frame);
}

function release() {
  if (!drop(state, aim)) return;
  unlock(state.current, false);
  aim = clampAim(state.current, aim);
  save();
}

function newGame(kind) {
  state = createGame(kind);
  aim = W / 2;
  effects = [];
  $('over').hidden = true;
  unlock(Math.max(state.current, state.next), false);
  save();
}

// --- Controles ---

const toAim = (e) => {
  const rect = canvas.getBoundingClientRect();
  aim = clampAim(state.current, ((e.clientX - rect.left) / rect.width) * W);
};
let aiming = false;
canvas.addEventListener('pointerdown', (e) => {
  aiming = true;
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
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    aim = clampAim(state.current, aim + (e.key === 'ArrowLeft' ? -14 : 14));
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
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});

unlock(Math.max(state.current, state.next, ...state.bodies.map((b) => b.level)), false);
aim = clampAim(state.current, aim);
resize();
requestAnimationFrame(frame);
