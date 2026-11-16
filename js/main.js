import { createGame, move, SIZE, MAX_LEVEL, KINDS, NAMES, ADOPTION_BONUS } from './game.js';
import { animalSVG, tileColor } from './art.js';

const SLIDE_MS = 110;
const $ = (id) => document.getElementById(id);

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
  return s && s.size === SIZE && Array.isArray(s.tiles) && s.tiles.length > 0 &&
    s.tiles.every((t) => KINDS.includes(t.kind) && t.level >= 1 && t.level <= MAX_LEVEL &&
      t.r >= 0 && t.r < SIZE && t.c >= 0 && t.c < SIZE);
}

const saved = store.get('miau.state', null);
let state = validState(saved) ? saved : createGame();
let best = store.get('miau.best', 0);
const album = store.get('miau.album', { cat: 0, dog: 0 });

const tilesEl = $('tiles');
const els = new Map(); // id do bicho -> elemento
let pending = null; // fim da animação da jogada em curso
let timer = 0;

function faceHTML(t) {
  return `${animalSVG(t.kind, t.level)}<span class="badge">${t.level}</span>`;
}

function place(el, r, c) {
  el.style.setProperty('--r', r);
  el.style.setProperty('--c', c);
}

function addTile(t, appear) {
  const el = document.createElement('div');
  el.className = 'tile';
  place(el, t.r, t.c);
  const face = document.createElement('div');
  face.className = `face${appear ? ' appear' : ''}`;
  face.style.background = tileColor(t.kind, t.level);
  face.innerHTML = faceHTML(t);
  face.title = NAMES[t.kind][t.level - 1];
  el.append(face);
  tilesEl.append(el);
  els.set(t.id, el);
}

function renderAll() {
  tilesEl.replaceChildren();
  els.clear();
  for (const t of state.tiles) addTile(t, false);
  renderScore();
  $('over').hidden = !state.over;
  $('final').textContent = state.score.toLocaleString('pt-BR');
}

function renderScore() {
  if (state.score > best) {
    best = state.score;
    store.set('miau.best', best);
  }
  $('score').textContent = state.score.toLocaleString('pt-BR');
  $('best').textContent = best.toLocaleString('pt-BR');
}

let toastTimer = 0;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

function updateAlbum() {
  for (const t of state.tiles) {
    if (t.level > album[t.kind]) {
      album[t.kind] = t.level;
      store.set('miau.album', album);
      if (t.level > 2) toast(`Novo no álbum: ${NAMES[t.kind][t.level - 1]}`);
    }
  }
}

function flush() {
  if (!pending) return;
  clearTimeout(timer);
  const done = pending;
  pending = null;
  done();
}

function play(dir) {
  flush();
  const res = move(state, dir);
  if (!res.moved) return;
  store.set('miau.state', state);
  armed = false;
  $('new').textContent = 'Novo jogo';

  for (const t of state.tiles) {
    const el = els.get(t.id);
    if (el) place(el, t.r, t.c);
  }
  for (const gone of res.removed) {
    const el = els.get(gone.id);
    if (!el) continue;
    el.classList.add('leaving');
    place(el, gone.r, gone.c);
  }
  for (const id of res.scared) els.get(id)?.classList.add('scared');
  renderScore();
  if (res.merged.length || res.adopted.length || res.scared.length) navigator.vibrate?.(12);

  pending = () => {
    for (const gone of res.removed) {
      els.get(gone.id)?.remove();
      els.delete(gone.id);
    }
    for (const id of res.merged) {
      const t = state.tiles.find((x) => x.id === id);
      const face = els.get(id)?.firstElementChild;
      if (!t || !face) continue;
      face.style.background = tileColor(t.kind, t.level);
      face.innerHTML = faceHTML(t);
      face.title = NAMES[t.kind][t.level - 1];
      face.classList.remove('appear', 'pop');
      void face.offsetWidth; // reinicia a animação
      face.classList.add('pop');
    }
    for (const a of res.adopted) {
      toast(`${NAMES[a.kind][MAX_LEVEL - 1]} adotado! +${ADOPTION_BONUS.toLocaleString('pt-BR')}`);
    }
    if (res.spawned) addTile(res.spawned, true);
    updateAlbum();
    if (state.over) {
      $('final').textContent = state.score.toLocaleString('pt-BR');
      $('over').hidden = false;
    }
  };
  timer = setTimeout(flush, SLIDE_MS);
}

function newGame() {
  flush();
  state = createGame();
  store.set('miau.state', state);
  renderAll();
}

// --- Controles ---

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
window.addEventListener('keydown', (e) => {
  const dir = KEYS[e.key];
  if (!dir || $('album').open) return;
  e.preventDefault();
  play(dir);
});

const board = $('board');
let start = null;
board.addEventListener('pointerdown', (e) => {
  start = { x: e.clientX, y: e.clientY };
  board.setPointerCapture?.(e.pointerId);
});
board.addEventListener('pointerup', (e) => {
  if (!start) return;
  const dx = e.clientX - start.x;
  const dy = e.clientY - start.y;
  start = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
  play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
});
board.addEventListener('pointercancel', () => { start = null; });

// "Novo jogo" pede um segundo toque quando há uma partida em andamento.
let armed = false;
$('new').addEventListener('click', () => {
  if (!armed && !state.over && state.score > 0) {
    armed = true;
    $('new').textContent = 'Toque de novo para recomeçar';
    return;
  }
  armed = false;
  $('new').textContent = 'Novo jogo';
  newGame();
});
$('again').addEventListener('click', newGame);

function renderAlbum() {
  for (const kind of KINDS) {
    $(`album-${kind}`).innerHTML = NAMES[kind].map((name, i) => {
      const level = i + 1;
      const got = level <= album[kind];
      return `<li class="${got ? '' : 'locked'}">` +
        `<div class="face" style="background:${got ? tileColor(kind, level) : 'var(--cell)'}">` +
        `${got ? animalSVG(kind, level) : '<span class="q">?</span>'}</div>` +
        `<span>${got ? name : '???'}</span></li>`;
    }).join('');
  }
}
$('album-btn').addEventListener('click', () => {
  renderAlbum();
  $('album').showModal();
});
$('album-close').addEventListener('click', () => $('album').close());

renderAll();
updateAlbum();
