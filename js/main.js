import {
  createGame, drop, step, tick, canDrop, clampAim, dropTime, shake as shakeYard, bodyAt, removeBody, scareAll,
  W, H, LINE_Y, DROP_Y, DT, RADII, MAX_LEVEL, KINDS, NAMES,
} from './game.js';
import { animalSVG, tileColor, furColor, ART_BOX, HEAD_R } from './art.js';
import { paintScene, drawAmbient } from './scene.js';
import {
  SCENES, POWERS, powerCost, newMeta, validMeta, coinsForScore, chooseScene,
  today, dailyMissions, validMissions, missionText, progressMissions,
} from './meta.js';
import { burst, dust, poof, confetti, fling, updateFx, drawFx, clearFx } from './fx.js';
import { sfx, setAudioMode, unlockAudio, startMusic, stopMusic, setMusicTension } from './sound.js';

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
const savedMeta = store.get('miau.meta', null);
const meta = validMeta(savedMeta) ? savedMeta : newMeta(); // moedas e cenários
const savedMissions = store.get('miau.missions', null);
let missions = validMissions(savedMissions) ? savedMissions : dailyMissions();
let effects = []; // anéis e textos que aparecem onde algo acontece
let shake = 0; // segundos de tremor que restam
let active = false; // o relógio só corre depois do primeiro toque nesta visita
let screen = 'menu'; // 'menu' ou 'game'
let paused = false;
const AUDIO_MODES = ['all', 'sfx', 'off'];
const AUDIO_LABELS = { all: 'Som e música', sfx: 'Só efeitos', off: 'Sem som' };
let audioMode = store.get('miau.audio', store.get('miau.sound', true) ? 'all' : 'off');
if (!AUDIO_MODES.includes(audioMode)) audioMode = 'all';
setAudioMode(audioMode);
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

const save = () => store.set('miau.drop', state);

// --- Desenho ---

const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const sprites = {}; // 'cat3:happy' -> imagem pronta para o canvas
const SPRITE_SCALE = ART_BOX / HEAD_R; // o desenho é 3x o raio da cabeça
const rivalKind = () => (state.kind === 'cat' ? 'dog' : 'cat');

function sprite(kind, level, mood = 'normal') {
  const key = `${kind}${level}:${mood}`;
  if (!sprites[key]) {
    const svg = animalSVG(kind, level, mood).replace('<svg ', '<svg width="300" height="300" ');
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    sprites[key] = img;
  }
  return sprites[key];
}

// Desenha um bicho com a cabeça de raio `r` centrada em (x, y).
// sx/sy amassam o bicho na tela (não giram junto com ele).
function drawAnimal(kind, level, mood, x, y, r, angle = 0, sx = 1, sy = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + r * (1 - sy)); // amassa com a base apoiada no chão
  ctx.scale(sx, sy);
  ctx.rotate(angle);
  const img = sprite(kind, level, mood);
  const size = r * SPRITE_SCALE;
  if (img.complete && img.naturalWidth) {
    ctx.drawImage(img, -size / 2, -size * 0.52, size, size);
  } else { // enquanto o desenho carrega
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = furColor(kind, level);
    ctx.fill();
  }
  ctx.restore();
}

const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
function isDark() {
  const forced = document.documentElement.dataset.theme;
  return forced ? forced === 'dark' : darkMq.matches;
}

// O cenário é pintado uma vez por tamanho e reaproveitado até o tema ou o cenário mudarem.
const backdrops = new Map();
function scene(width = canvas.width, height = canvas.height) {
  if (!width || !height) return null;
  const key = `${width}x${height}:${isDark()}:${meta.scene}`;
  if (!backdrops.has(key)) {
    if (backdrops.size > 6) backdrops.clear();
    const backdrop = document.createElement('canvas');
    backdrop.width = width;
    backdrop.height = height;
    const c = backdrop.getContext('2d');
    c.setTransform(width / W, 0, 0, height / H, 0, 0);
    paintScene(c, W, H, isDark(), meta.scene);
    backdrops.set(key, backdrop);
  }
  return backdrops.get(key);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
}
new ResizeObserver(resize).observe(canvas);

// Estado só de aparência de cada bicho (não é salvo): velocidade anterior e último impacto.
const looks = new Map();

function trackImpacts(elapsed) {
  if (looks.size > state.bodies.length + 60) {
    const alive = new Set(state.bodies.map((b) => b.id));
    for (const id of looks.keys()) if (!alive.has(id)) looks.delete(id);
  }
  for (const b of state.bodies) {
    const vy = (b.y - b.py) / DT;
    let look = looks.get(b.id);
    if (!look) looks.set(b.id, look = { vy: 0, hit: 9, amp: 0 });
    if (look.vy > 380 && vy < look.vy * 0.45) { // vinha caindo e parou: impacto
      look.hit = 0;
      look.amp = Math.min(1, (look.vy - vy) / 1300);
      if (!calm.matches) dust(b.x, b.y + b.r, b.r * 0.8, look.amp);
      if (look.amp > 0.3) sfx.thud(look.amp, b.level);
    }
    look.vy = vy;
    look.hit += elapsed;
  }
}

function moodOf(b, seconds) {
  if (b.rival) return 'angry';
  if (state.over) return 'scared';
  if (b.r0 < RADII[b.level - 1] && b.age < 0.8) return 'happy'; // acabou de nascer de uma junção
  if (state.danger > 0 && b.y - b.r < LINE_Y + 30) return 'scared';
  if ((seconds + b.id * 1.37) % 4.1 < 0.13) return 'blink';
  return 'normal';
}

function drawBody(b, seconds) {
  let sx = 1;
  let sy = 1;
  if (!calm.matches) {
    const look = looks.get(b.id);
    if (look && look.hit < 0.6) { // amassa e volta, como gelatina
      const s = look.amp * 0.26 * Math.exp(-9 * look.hit) * Math.cos(26 * look.hit);
      sx += s;
      sy -= s;
    }
    if (b.r0 < RADII[b.level - 1] && b.age < 0.6) { // estufa ao nascer de uma junção
      const pop = 0.2 * Math.exp(-8 * b.age) * Math.cos(22 * b.age);
      sx += pop;
      sy += pop;
    }
  }
  if (b.rival) { // aura vermelha pulsando em volta do intruso
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 3 + Math.sin(seconds * 8) * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(229 72 77 / 0.35)';
    ctx.fill();
  }
  drawAnimal(b.rival ? rivalKind() : state.kind, b.level, moodOf(b, seconds), b.x, b.y, b.r, b.angle, sx, sy);
}

function draw(seconds) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const back = scene();
  if (back) ctx.drawImage(back, 0, 0);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  drawAmbient(ctx, W, H, calm.matches ? 0 : seconds, isDark(), meta.scene);
  if (shake > 0 && !calm.matches) {
    const amp = 28 * shake;
    ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
  }

  const danger = state.danger > 0 || state.over;
  if (danger) { // clarão vermelho no alto quando a pilha passa da linha
    const pulse = 0.25 + 0.15 * Math.sin(seconds * 10);
    const red = ctx.createLinearGradient(0, 0, 0, LINE_Y + 50);
    red.addColorStop(0, `rgb(230 40 40 / ${pulse})`);
    red.addColorStop(1, 'rgb(230 40 40 / 0)');
    ctx.fillStyle = red;
    ctx.fillRect(0, 0, W, LINE_Y + 50);
  }
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgb(0 0 0 / 0.18)';
  ctx.beginPath();
  ctx.moveTo(0, LINE_Y + 1.5);
  ctx.lineTo(W, LINE_Y + 1.5);
  ctx.stroke();
  ctx.strokeStyle = danger ? 'rgb(240 50 50 / 0.95)' : 'rgb(255 255 255 / 0.85)';
  ctx.beginPath();
  ctx.moveTo(0, LINE_Y);
  ctx.lineTo(W, LINE_Y);
  ctx.stroke();

  const ready = canDrop(state);
  if (ready) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(255 255 255 / 0.5)';
    ctx.lineDashOffset = calm.matches ? 0 : -seconds * 30;
    ctx.beginPath();
    ctx.moveTo(state.aim, DROP_Y);
    ctx.lineTo(state.aim, H);
    ctx.stroke();
    ctx.lineDashOffset = 0;
  }
  ctx.setLineDash([]);

  for (const b of state.bodies) drawBody(b, seconds);

  if (state.warning) { // o intruso espia por cima e uma seta mostra onde ele vai cair
    const { x, t, level } = state.warning;
    const r = RADII[level - 1];
    const peek = Math.min(1, (1.2 - t) / 0.3);
    drawAnimal(rivalKind(), level, 'angry', x, -r * 0.9 + r * 0.75 * peek, r, Math.sin(seconds * 14) * 0.08);
    const bob = Math.sin(seconds * 12) * 3;
    ctx.fillStyle = '#e5484d';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 12, r + 14 + bob);
    ctx.lineTo(x + 12, r + 14 + bob);
    ctx.lineTo(x, r + 34 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (!state.over) { // o bicho da vez balança de leve enquanto espera
    const r = RADII[state.current - 1];
    const urgent = ready && clockOn() && state.timer < 1;
    const sway = calm.matches ? 0 : Math.sin(seconds * 3) * 0.08 + (urgent ? Math.sin(seconds * 40) * 0.06 : 0);
    const y = DROP_Y + (calm.matches ? 0 : Math.sin(seconds * 2.2) * 2.5);
    const mood = urgent ? 'scared' : (seconds % 3.3 < 0.13 ? 'blink' : 'normal');
    drawAnimal(state.kind, state.current, mood, state.aim, y, r, sway, 1, 1, ready ? 1 : 0.35);
    if (ready && clockOn()) { // relógio: o anel vai sumindo até o bicho cair sozinho
      ctx.beginPath();
      ctx.arc(state.aim, y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (state.timer / dropTime(state)));
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = urgent ? '#e5484d' : 'rgb(255 255 255 / 0.95)';
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  drawFx(ctx);

  for (const e of effects) {
    const k = e.t / e.life;
    if (e.text) {
      const bounce = calm.matches ? 1 : 1 + 0.7 * Math.exp(-14 * e.t); // entra grande e assenta
      ctx.font = `800 ${e.size * bounce}px "Baloo 2", "Trebuchet MS", sans-serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 1 - k * k;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgb(0 0 0 / 0.6)';
      ctx.fillStyle = e.color;
      const x = Math.min(W - 50, Math.max(50, e.x));
      const y = Math.max(24, e.y - 34 * k);
      ctx.strokeText(e.text, x, y);
      ctx.fillText(e.text, x, y);
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1 + k * 0.6), 0, Math.PI * 2);
      ctx.lineWidth = 6 * (1 - k);
      ctx.strokeStyle = `rgb(255 255 255 / ${0.9 * (1 - k)})`;
      ctx.stroke();
    }
  }
}

// --- Placar, avisos e álbum ---

function face(kind, level) {
  return `<div class="face" style="background:${tileColor(kind, level)}">${animalSVG(kind, level)}</div>`;
}

function bump(el) { // reinicia a animação de "pulo" do elemento
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

let shownNext = '';
let shownScore = -1;
let shownBest = -1;
function renderHud() {
  if (state.score > best) {
    best = state.score;
    store.set('miau.drop.best', best);
  }
  if (shownScore !== state.score) { // o placar sobe contando, em vez de pular direto
    const jump = shownScore < 0 || state.score < shownScore || calm.matches;
    const before = shownScore;
    shownScore = jump ? state.score : shownScore + Math.ceil((state.score - shownScore) * 0.18);
    $('score').textContent = fmt(shownScore);
    if (before >= 0 && shownScore === state.score) bump($('score').parentElement);
  }
  if (shownBest !== best) {
    shownBest = best;
    $('best').textContent = fmt(best);
  }
  const key = state.kind + state.next;
  if (key !== shownNext) {
    shownNext = key;
    $('next').innerHTML = face(state.kind, state.next);
    bump($('next'));
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

// --- Telas: menu e jogo ---

const menuCanvas = $('menu-canvas');
const menuCtx = menuCanvas.getContext('2d');

// Há partida para continuar? (começada e ainda não terminada)
const hasGame = () => !state.over && state.drops > 0;

function renderMenu() {
  const going = hasGame();
  $('continue').hidden = !going;
  $('continue-info').textContent = going
    ? `${state.kind === 'cat' ? 'Gatos' : 'Cachorros'} · ${fmt(state.score)} pontos` : '';
  $('play').textContent = going ? 'Nova partida' : 'Jogar';
  $('play').classList.toggle('primary', !going);
  $('play').classList.toggle('big', !going);
  $('menu-best').textContent = fmt(best);
  renderCoins(false);
  renderMissionCount();
}

function show(name) {
  screen = name;
  $('menu').hidden = name !== 'menu';
  $('game').hidden = name !== 'game';
  if (name === 'menu') {
    save();
    refreshMissions();
    renderMenu();
  } else {
    resize();
    canvas.focus({ preventScroll: true });
  }
}

function drawMenu(seconds) {
  const back = scene(menuCanvas.width, menuCanvas.height);
  menuCtx.setTransform(1, 0, 0, 1, 0, 0);
  menuCtx.drawImage(back, 0, 0);
  menuCtx.setTransform(menuCanvas.width / W, 0, 0, menuCanvas.height / H, 0, 0);
  drawAmbient(menuCtx, W, H, calm.matches ? 0 : seconds, isDark(), meta.scene);
}

// Bichos pulando na frente do cenário do menu.
$('parade').innerHTML = [['dog', 2, 62, 0.5], ['cat', 5, 84, 0.1], ['dog', 6, 104, 0.8], ['cat', 2, 70, 0.3], ['dog', 4, 86, 1.1], ['cat', 10, 100, 0.6]]
  .map(([kind, level, size, delay]) => `<div style="--size:${size}px;--delay:${delay}s">${animalSVG(kind, level, 'happy')}</div>`).join('');

function pause() {
  if (screen !== 'game' || state.over || document.querySelector('dialog[open]')) return;
  paused = true;
  $('pause-dialog').showModal();
}

// --- Moedas, missões e loja ---

const COIN = '<svg class="coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#f5b301" stroke="#b97d00" stroke-width="1.6"/><ellipse cx="12" cy="14.6" rx="4.2" ry="3.4" fill="#b97d00"/><circle cx="6.9" cy="10.6" r="1.7" fill="#b97d00"/><circle cx="10.2" cy="7.6" r="1.7" fill="#b97d00"/><circle cx="13.8" cy="7.6" r="1.7" fill="#b97d00"/><circle cx="17.1" cy="10.6" r="1.7" fill="#b97d00"/></svg>';

function renderCoins(animate = true) {
  $('coins').textContent = fmt(meta.coins);
  $('game-coins').textContent = fmt(meta.coins);
  if (animate) bump(screen === 'menu' ? $('coins-chip') : $('game-coins').parentElement);
}

function spend(amount) {
  if (meta.coins < amount) return false;
  meta.coins -= amount;
  store.set('miau.meta', meta);
  renderCoins();
  return true;
}

// --- Poderes ---

let picking = false; // "Tirar" armado: o próximo toque escolhe um bicho
const used = (id) => state.used?.[id] ?? 0;
const costOf = (id) => powerCost(id, used(id));

function powerAvailable(id) {
  if (state.over || meta.coins < costOf(id)) return false;
  if (id === 'shoo') return state.bodies.some((b) => b.rival);
  return state.bodies.length > 0;
}

function charge(id) {
  if (!spend(costOf(id))) return false;
  state.used = { ...state.used, [id]: used(id) + 1 };
  save();
  return true;
}

function flingBody(b) {
  const kind = b.rival ? rivalKind() : state.kind;
  poof(b.x, b.y, b.r);
  fling(sprite(kind, b.level, b.rival ? 'scared' : 'happy'), b.x, b.y, b.r, b.r * SPRITE_SCALE);
}

function usePower(id) {
  wake();
  if (id === 'pick') { // só arma; a cobrança é quando o bicho for escolhido
    picking = !picking && powerAvailable('pick');
    if (picking) toast('Toque no bicho que você quer tirar');
    return;
  }
  picking = false;
  if (!powerAvailable(id) || !charge(id)) return;
  if (id === 'shake') {
    shakeYard(state);
    shake = 0.35;
    sfx.shake();
  } else {
    for (const b of scareAll(state)) flingBody(b);
    sfx.scare();
  }
  save();
}

// Com "Tirar" armado, o toque no quintal escolhe o bicho em vez de soltar um.
function pickAt(x, y) {
  picking = false;
  const body = bodyAt(state, x, y);
  if (!body || !charge('pick')) return;
  removeBody(state, body.id);
  flingBody(body);
  sfx.scare();
  save();
}

let shownPowers = '';
function renderPowers() {
  const key = POWERS.map((p) => `${costOf(p.id)}${powerAvailable(p.id)}`).join() + picking;
  if (key === shownPowers) return;
  shownPowers = key;
  for (const p of POWERS) {
    const btn = document.querySelector(`[data-power="${p.id}"]`);
    btn.disabled = !powerAvailable(p.id);
    btn.classList.toggle('armed', p.id === 'pick' && picking);
    btn.querySelector('b').textContent = fmt(costOf(p.id));
    btn.setAttribute('aria-label', `${p.name}: ${costOf(p.id)} moedas`);
  }
}

function earn(amount) {
  if (amount <= 0) return;
  meta.coins += amount;
  store.set('miau.meta', meta);
  renderCoins();
}

function renderMissionCount() {
  $('missions-count').textContent = `${missions.list.filter((m) => m.done).length}/${missions.list.length}`;
}

// Vira o dia: missões novas.
function refreshMissions() {
  if (missions.date === today()) return;
  missions = dailyMissions();
  store.set('miau.missions', missions);
  renderMissionCount();
}

// Registra um acontecimento nas missões; as que forem concluídas pagam na hora.
function track(type, value) {
  const before = missions.list.map((m) => m.progress).join();
  for (const m of progressMissions(missions, type, value)) {
    earn(m.reward);
    toast(`Missão concluída! +${m.reward} moedas`);
    sfx.coin();
    renderMissionCount();
  }
  if (before !== missions.list.map((m) => m.progress).join()) store.set('miau.missions', missions);
}

// Paga as moedas da partida, uma vez só. Devolve quanto a partida rendeu.
function payout() {
  if (!state.paid) {
    state.paid = true;
    state.earned = coinsForScore(state.score);
    earn(state.earned);
    save();
  }
  return state.earned;
}

function renderMissions() {
  $('missions-list').innerHTML = missions.list.map((m) => {
    const pct = Math.round((m.progress / m.goal) * 100);
    const status = m.done ? 'Concluída' : (m.type === 'kind' ? 'Ainda não' : `${fmt(m.progress)} de ${fmt(m.goal)}`);
    return `<li class="${m.done ? 'done' : ''}"><span class="text">${missionText(m)}</span>` +
      `<span class="reward">${COIN}${m.reward}</span><div class="bar"><i style="width:${pct}%"></i></div><small>${status}</small></li>`;
  }).join('');
}

function renderShop() {
  $('shop-coins').textContent = fmt(meta.coins);
  const list = $('shop-list');
  list.replaceChildren();
  for (const scene of SCENES) {
    const owned = meta.owned.includes(scene.id);
    const using = meta.scene === scene.id;
    const li = document.createElement('li');
    if (using) li.className = 'using';
    const preview = document.createElement('canvas');
    preview.width = 180;
    preview.height = 260;
    const c = preview.getContext('2d');
    c.scale(0.5, 0.5);
    paintScene(c, W, H, isDark(), scene.id);
    const name = document.createElement('span');
    name.textContent = scene.name;
    const btn = document.createElement('button');
    btn.type = 'button';
    if (using) {
      btn.textContent = 'Em uso';
      btn.disabled = true;
    } else if (owned) {
      btn.textContent = 'Usar';
    } else {
      btn.innerHTML = `${COIN}${fmt(scene.price)}`;
      btn.setAttribute('aria-label', `Comprar ${scene.name} por ${scene.price} moedas`);
      btn.disabled = meta.coins < scene.price;
      if (!btn.disabled) btn.className = 'primary';
    }
    btn.addEventListener('click', () => {
      if (!chooseScene(meta, scene.id)) return;
      store.set('miau.meta', meta);
      if (!owned) {
        sfx.coin();
        toast(`Cenário novo: ${scene.name}`);
      }
      renderCoins(!owned);
      renderShop();
    });
    li.append(preview, name, btn);
    list.append(li);
  }
}

// --- Tutorial da primeira partida ---
// Dicas curtas que aparecem no quintal conforme as coisas acontecem, sem travar o jogo.

const TIPS = {
  aim: 'Arraste o dedo para mirar e solte para o bicho cair.',
  merge: 'Agora solte outro igual encostado nele: os dois viram um bicho maior.',
  clock: 'O anel em volta do bicho é o relógio. Se o tempo acabar, ele cai sozinho.',
  rival: 'Vem aí um intruso! Ele não junta com nada. Para espantá-lo, junte dois bichos encostados nele.',
  combo: 'Boa! Juntar várias vezes seguidas dá combo e multiplica os pontos.',
};
// Quanto tempo cada dica fica na tela; as sem tempo esperam o jogador agir.
const TIP_SECONDS = { clock: 6, rival: 12, combo: 5 };
const newTutorial = () => ({ step: '', t: 0, seen: new Set() });
let tutorial = store.get('miau.tutorialDone', false) ? null : newTutorial();

function tip(step) {
  if (!tutorial || tutorial.seen.has(step)) return; // cada dica aparece uma vez só
  tutorial.seen.add(step);
  tutorial.step = step;
  tutorial.t = 0;
  $('coach').textContent = TIPS[step];
  $('coach').hidden = false;
}

function endTutorial() {
  if (!tutorial) return;
  tutorial = null;
  $('coach').hidden = true;
  store.set('miau.tutorialDone', true);
}

// Começo (ou recomeço) das duas primeiras dicas, enquanto a primeira junção não aconteceu.
function introTip() {
  if (!tutorial || tutorial.seen.has('clock') || state.over) return;
  tutorial.seen.delete('aim');
  tutorial.seen.delete('merge');
  if (state.drops === 0) state.current = 1;
  state.next = 1;
  state.aim = clampAim(state.current, state.aim);
  tip('aim');
}

// Nas duas primeiras dicas o relógio fica parado e só caem filhotes,
// para a primeira junção ser garantida.
const learningBasics = () => tutorial && (tutorial.step === 'aim' || tutorial.step === 'merge');

function tutorialTick(elapsed) {
  if (!tutorial) return;
  tutorial.t += elapsed;
  if (state.over) {
    $('coach').hidden = true; // as dicas que faltam ficam para a próxima partida
  } else if (tutorial.t > TIP_SECONDS[tutorial.step]) {
    if (tutorial.step === 'combo') endTutorial();
    else $('coach').hidden = true; // segue esperando o próximo acontecimento
  }
}

// --- Laço do jogo ---

const clockOn = () => active && !learningBasics();
const ring = (x, y, r) => effects.push({ x, y, r, t: 0, life: 0.3 });
const floatText = (x, y, text, size = 18, color = '#fff') => effects.push({ x, y, text, size, color, t: 0, life: 0.9 });

function handle(events) {
  if (!events.length) return;
  let changed = false;
  for (const e of events) {
    if (e.type === 'merge') {
      ring(e.x, e.y, RADII[e.level - 1]);
      burst(e.x, e.y, {
        n: 8 + e.level * 2, speed: 150 + e.level * 28, size: 5 + e.level * 0.6,
        colors: [furColor(state.kind, e.level), '#fff', '#ffd43b'],
      });
      floatText(e.x, e.y, `+${fmt(e.gained)}`);
      if (e.combo > 1) floatText(e.x, e.y - 22, `Combo x${e.combo}`, 22, '#ffd43b');
      if (e.level >= 6) shake = 0.25;
      sfx.merge(e.level, e.combo);
      unlock(e.level, true);
      track('merge');
      track('combo', e.combo);
      track('reach', e.level);
      track('score', state.score);
      if (tutorial?.step === 'merge') tip('clock');
    } else if (e.type === 'adopt') {
      ring(e.x, e.y, RADII[MAX_LEVEL - 1]);
      floatText(e.x, e.y, `+${fmt(e.gained)}`, 26, '#ffd43b');
      toast(`${NAMES[state.kind][MAX_LEVEL - 1]} adotado!`);
      burst(e.x, e.y, { n: 16, speed: 260, size: 9, shape: 'heart', colors: ['#ff6b81', '#ff8fa3', '#fff'], life: 1.1, g: 200 });
      if (!calm.matches) confetti(W);
      shake = 0.4;
      sfx.adopt();
    } else if (e.type === 'scare') {
      floatText(e.x, e.y, `Xô! +${e.gained}`, 18, '#ffb3b3');
      poof(e.x, e.y, RADII[e.level - 1]);
      fling(sprite(rivalKind(), e.level, 'scared'), e.x, e.y, RADII[e.level - 1], RADII[e.level - 1] * SPRITE_SCALE);
      sfx.scare();
      track('scare');
      tip('combo');
    } else if (e.type === 'rival') {
      sfx.rival();
    } else if (e.type === 'autodrop') {
      sfx.drop();
      unlock(state.current, false);
      track('drop');
    }
    changed = true;
  }
  if (events.some((e) => e.type === 'merge' || e.type === 'adopt' || e.type === 'scare')) navigator.vibrate?.(12);
  if (changed) save();
}

let last = performance.now();
let acc = 0;
let announced = null; // último aviso de intruso já anunciado
function frame(now) {
  const elapsed = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (screen === 'menu') {
    drawMenu(now / 1000);
  } else if (!paused) {
    acc += elapsed;
    const wasOver = state.over;
    while (acc >= DT) {
      handle(clockOn() ? tick(state, DT) : step(state, DT));
      acc -= DT;
    }
    if (state.warning && state.warning !== announced) { // aviso novo, venha de onde vier
      sfx.warning();
      tip('rival');
    }
    announced = state.warning;
    if (state.over && !wasOver) {
      sfx.over();
      track('game');
      track('kind', state.kind);
      $('earned').textContent = `+${fmt(payout())}`;
      save();
    }
    setMusicTension(state.danger > 0 && !state.over);
    tutorialTick(elapsed);
    shake = Math.max(0, shake - elapsed);
    for (const e of effects) e.t += elapsed;
    effects = effects.filter((e) => e.t < e.life);
    trackImpacts(elapsed);
    updateFx(elapsed);
    renderHud();
    renderPowers();
    draw(now / 1000);
  }
  requestAnimationFrame(frame);
}

function release() {
  if (!drop(state, state.aim)) return;
  sfx.drop();
  if (tutorial?.step === 'aim') tip('merge');
  if (learningBasics()) state.next = 1;
  unlock(state.current, false);
  track('drop');
  save();
}

function newGame(kind) {
  if (!state.over && state.score > 0) { // partida abandonada também rende moedas
    const paid = state.paid;
    const coins = payout();
    if (coins && !paid) toast(`+${fmt(coins)} moedas pela partida`);
  }
  refreshMissions();
  state = createGame(kind);
  picking = false;
  effects = [];
  clearFx();
  looks.clear();
  active = false;
  $('over').hidden = true;
  introTip();
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
  if (picking) {
    const rect = canvas.getBoundingClientRect();
    pickAt(((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H);
    return;
  }
  toAim(e);
  release();
});
for (const p of POWERS) {
  document.querySelector(`[data-power="${p.id}"]`).addEventListener('click', () => usePower(p.id));
}
canvas.addEventListener('pointercancel', () => { aiming = false; });

window.addEventListener('keydown', (e) => {
  if (screen !== 'game' || document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape' || e.key === 'p') {
    e.preventDefault(); // senão o mesmo Esc já fecha a pausa que acabou de abrir
    pause();
    return;
  }
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
      show('game');
    });
  }
}
$('play').addEventListener('click', () => {
  $('chooser-note').hidden = !hasGame();
  $('chooser').showModal();
});
$('continue').addEventListener('click', () => show('game'));
$('again').addEventListener('click', () => newGame(state.kind));
$('to-menu').addEventListener('click', () => show('menu'));
$('pause').addEventListener('click', pause);
$('pause-dialog').addEventListener('close', () => { // fecha por botão ou pela tecla Esc
  paused = false;
  acc = 0;
});
$('resume').addEventListener('click', () => $('pause-dialog').close());
$('restart').addEventListener('click', () => {
  $('pause-dialog').close();
  newGame(state.kind);
});
$('quit').addEventListener('click', () => {
  $('pause-dialog').close();
  show('menu');
});
$('chooser-close').addEventListener('click', () => $('chooser').close());
$('replay').addEventListener('click', () => {
  $('chooser').close();
  tutorial = newTutorial();
  store.set('miau.tutorialDone', false);
  newGame(state.kind);
  show('game');
});
$('album-btn').addEventListener('click', () => {
  renderAlbum();
  $('album').showModal();
});
$('album-close').addEventListener('click', () => $('album').close());
$('missions-btn').addEventListener('click', () => {
  refreshMissions();
  renderMissions();
  $('missions').showModal();
});
$('missions-close').addEventListener('click', () => $('missions').close());
$('shop-btn').addEventListener('click', () => {
  renderShop();
  $('shop').showModal();
});
$('shop-close').addEventListener('click', () => $('shop').close());
const soundBtns = document.querySelectorAll('.sound-toggle'); // um no menu, outro na pausa
function renderSound() {
  for (const btn of soundBtns) btn.textContent = AUDIO_LABELS[audioMode];
}
for (const btn of soundBtns) {
  btn.addEventListener('click', () => { // alterna: som e música -> só efeitos -> sem som
    audioMode = AUDIO_MODES[(AUDIO_MODES.indexOf(audioMode) + 1) % AUDIO_MODES.length];
    store.set('miau.audio', audioMode);
    unlockAudio();
    setAudioMode(audioMode);
    renderSound();
  });
}
renderSound();
document.addEventListener('pointerdown', unlockAudio, { once: true }); // a música já começa no menu
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save();
    stopMusic();
    pause(); // saiu do app no meio da partida: volta em pausa
  } else {
    startMusic();
  }
});

refreshMissions();
if (state.over) $('earned').textContent = `+${fmt(payout())}`; // partida terminada antes de existirem moedas
unlock(Math.max(state.current, state.next, ...state.bodies.map((b) => b.level)), false);
introTip();
state.aim = clampAim(state.current, state.aim);
show('menu');
requestAnimationFrame(frame);
