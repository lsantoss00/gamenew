import {
  MODES, SPECIAL_NAMES, SLEEP_TIME, upgradeState,
  createGame, createSeededGame, stateRng, setGoal, drop, step, tick, canDrop, clampAim, dropTime, shake as shakeYard, bodyAt, removeBody, scareAll,
  W, H, LINE_Y, DROP_Y, DT, RADII, MAX_LEVEL, KINDS, NAMES,
} from './game.js';
import { animalSVG, wildSVG, tileColor, furColor, ART_BOX, HEAD_R } from './art.js';
import { paintScene, drawAmbient } from './scene.js';
import { LEVEL_COUNT, levelSpec, goalText, goalProgress, levelStars, levelUnlocked, totalStars, finishLevel } from './levels.js';
import {
  SCENES, POWERS, powerCost, recordStat, statValue, STAT_NAMES, TROPHIES, claimTrophies, claimDaily, STREAK_CAP, dateSeed, challengeKind, finishChallenge, CHALLENGE_REWARD, newMeta, validMeta, coinsForScore, chooseScene,
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
let state = validState(saved) ? upgradeState(saved) : createGame('cat');
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

const MODE_NAMES = { classic: 'Clássico', zen: 'Zen', time: 'Contra o tempo', daily: 'Desafio do dia', level: 'Fase' };
// Recorde de cada modo (o do clássico é o recorde que já existia).
function bestOf(mode) {
  if (mode === 'classic') return best;
  if (mode === 'daily') return meta.challenge?.date === state.daily ? meta.challenge.best : 0;
  return meta.bests?.[mode] ?? 0;
}
function setBest(mode, score) {
  if (mode === 'classic') {
    best = score;
    store.set('miau.drop.best', best);
  } else if (mode !== 'daily') {
    meta.bests = { ...meta.bests, [mode]: score };
    store.set('miau.meta', meta);
  }
}
function clockText(seconds) {
  const t = Math.ceil(seconds);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
// No desafio do dia o sorteio vem da semente guardada na partida; fora dele, é livre.
const rngOf = () => (state.seed ? stateRng(state) : Math.random); // desafio do dia e fases têm sorteio fixo

// --- Desenho ---

const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const sprites = {}; // 'cat3:happy' -> imagem pronta para o canvas
const SPRITE_SCALE = ART_BOX / HEAD_R; // o desenho é 3x o raio da cabeça
const rivalKind = () => (state.kind === 'cat' ? 'dog' : 'cat');

function sprite(kind, level, mood = 'normal') {
  const key = `${kind}${level}:${mood}`;
  if (!sprites[key]) {
    const art = kind === 'wild' ? wildSVG() : animalSVG(kind, level, mood);
    const svg = art.replace('<svg ', '<svg width="300" height="300" ');
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

// O que aparece quando um especial entra na fila.
const SPECIAL_TIPS = {
  wild: 'Vem aí um curinga: ele junta com qualquer bicho!',
  gold: 'Vem aí um dourado: juntá-lo rende moedas.',
  bark: 'Vem aí um barulhento: ao cair, ele empurra os vizinhos.',
  sleepy: 'Vem aí um dorminhoco: ele só junta depois de acordar.',
};
const GOLD_COINS = 15;

// --- Eventos no quintal ---

const WEATHER_TEXT = {
  wind: (dir) => `Ventania vindo da ${dir > 0 ? 'esquerda' : 'direita'}!`,
  rain: () => 'Vai chover: o pelo molhado encolhe!',
  quake: () => 'Tremor chegando: segura a pilha!',
};
const WEATHER_ON = { wind: 'Ventania!', rain: 'Chuva!', quake: 'Tremor!' };

function weatherEvent(e) {
  if (e.type === 'weather-warn') {
    sfx.warning();
  } else if (e.type === 'weather-start') {
    sfx.weather(e.weather);
  } else if (e.type === 'quake-kick') {
    shake = Math.max(shake, 0.3);
    sfx.thud(1, 9);
  }
}

// A faixa de aviso segue o estado da partida (vale também ao continuar uma partida salva).
let shownWeather = '';
function renderWeather() {
  const w = state.over ? null : state.weather;
  const key = w ? `${w.type}${w.dir}${w.warn > 0}` : '';
  if (key === shownWeather) return;
  shownWeather = key;
  const el = $('weather');
  el.hidden = !w;
  if (!w) return;
  el.textContent = w.warn > 0 ? WEATHER_TEXT[w.type](w.dir) : WEATHER_ON[w.type];
  el.classList.toggle('on', w.warn <= 0);
}

// Efeitos de tela de cada evento, desenhados sobre o quintal.
function drawWeather(seconds) {
  const w = state.weather && state.weather.warn <= 0 ? state.weather : null;
  if (state.wet > 0) { // céu fechando e chuva caindo
    ctx.fillStyle = `rgb(30 50 90 / ${0.18 * state.wet})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (w?.type === 'rain' || (state.wet > 0 && !w)) {
    const k = w ? 1 : state.wet;
    ctx.strokeStyle = `rgb(200 225 255 / ${0.7 * k})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const x = (i * 53.7 + (calm.matches ? 0 : seconds * 40)) % W;
      const y = (i * 97.3 + (calm.matches ? 0 : seconds * 620)) % H;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 14);
    }
    ctx.stroke();
  }
  if (w?.type === 'wind') { // rajadas cruzando a tela
    ctx.strokeStyle = 'rgb(255 255 255 / 0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const len = 30 + (i % 4) * 14;
      const travel = ((i * 71.3 + (calm.matches ? 0 : seconds * 420)) % (W + 120)) - 60;
      const x = w.dir > 0 ? travel : W - travel;
      const y = 30 + ((i * 131.7) % (H - 60));
      ctx.moveTo(x, y);
      ctx.lineTo(x - w.dir * len, y);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
} // moedas por juntar um bicho dourado

// Enfeites dos especiais, desenhados por cima do bicho (sem girar junto).
function decorate(special, x, y, r, seconds, sleep = 0) {
  if (special === 'gold') {
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f5b301';
    ctx.stroke();
    for (let i = 0; i < 3; i++) { // brilhos girando em volta
      const a = seconds * 1.6 + (i * Math.PI * 2) / 3;
      const k = 0.5 + 0.5 * Math.sin(seconds * 5 + i);
      const sx = x + Math.cos(a) * (r + 6);
      const sy = y + Math.sin(a) * (r + 6);
      ctx.fillStyle = `rgb(255 236 153 / ${0.4 + 0.6 * k})`;
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const pa = (p / 8) * Math.PI * 2;
        const d = p % 2 ? 1.5 : 4 + k * 2;
        ctx.lineTo(sx + Math.cos(pa) * d, sy + Math.sin(pa) * d);
      }
      ctx.fill();
    }
  } else if (special === 'bark') { // ondas de som dos dois lados
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const k = (seconds * 1.5 + i * 0.5) % 1;
      ctx.strokeStyle = `rgb(255 255 255 / ${0.9 * (1 - k)})`;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x, y, r + 4 + k * 12, side < 0 ? Math.PI * 0.8 : -Math.PI * 0.2, side < 0 ? Math.PI * 1.2 : Math.PI * 0.2);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  } else if (special === 'sleepy' && sleep > 0) { // zzz subindo e o tempo até acordar
    ctx.font = '800 14px "Baloo 2 Local", "Baloo 2", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const k = (seconds * 0.6 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgb(0 0 0 / 0.4)';
      ctx.lineWidth = 3;
      const tx = x + r * 0.6 + k * 14;
      const ty = y - r * 0.6 - k * 26;
      ctx.strokeText('z', tx, ty);
      ctx.fillText('z', tx, ty);
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (sleep / SLEEP_TIME));
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgb(160 140 255 / 0.9)';
    ctx.stroke();
  }
}

function moodOf(b, seconds) {
  if (b.rival) return 'angry';
  if (b.sleep > 0) return 'blink';
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
  const kind = b.rival ? rivalKind() : (b.special === 'wild' ? 'wild' : state.kind);
  drawAnimal(kind, b.level, moodOf(b, seconds), b.x, b.y, b.r, b.angle, sx, sy);
  if (b.special) decorate(b.special, b.x, b.y, b.r, seconds, b.sleep);
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
  drawWeather(seconds);
  if (state.goal && !state.over) { // quantos bichos ainda dá para soltar nesta fase
    const left = Math.max(0, state.dropLimit - state.drops);
    const text = `${left} ${left === 1 ? 'bicho' : 'bichos'}`;
    ctx.font = '800 14px "Baloo 2 Local", "Baloo 2", sans-serif';
    const w = ctx.measureText(text).width + 20;
    ctx.fillStyle = left <= 3 ? 'rgb(229 72 77 / 0.92)' : 'rgb(23 38 28 / 0.62)';
    ctx.beginPath();
    ctx.roundRect(8, H - 34, w, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(text, 18, H - 16);
  }

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
    const urgent = ready && clockOn() && state.rules.clock && state.timer < 1;
    const sway = calm.matches ? 0 : Math.sin(seconds * 3) * 0.08 + (urgent ? Math.sin(seconds * 40) * 0.06 : 0);
    const y = DROP_Y + (calm.matches ? 0 : Math.sin(seconds * 2.2) * 2.5);
    const mood = urgent ? 'scared' : (seconds % 3.3 < 0.13 ? 'blink' : 'normal');
    const special = state.currentSpecial;
    drawAnimal(special === 'wild' ? 'wild' : state.kind, state.current, special === 'sleepy' ? 'blink' : mood, state.aim, y, r, sway, 1, 1, ready ? 1 : 0.35);
    if (special && ready) decorate(special, state.aim, y, r, seconds, special === 'sleepy' ? SLEEP_TIME : 0);
    if (ready && clockOn() && state.rules.clock) { // relógio: o anel vai sumindo até o bicho cair sozinho
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
      ctx.font = `800 ${e.size * bounce}px "Baloo 2 Local", "Baloo 2", "Trebuchet MS", sans-serif`;
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

function face(kind, level, special = null) {
  if (special === 'wild') return `<div class="face special wild">${wildSVG()}</div>`;
  const mood = special === 'sleepy' ? 'blink' : 'normal';
  return `<div class="face${special ? ` special ${special}` : ''}" style="background:${tileColor(kind, level)}">${animalSVG(kind, level, mood)}</div>`;
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
  if (state.score > bestOf(state.mode)) setBest(state.mode, state.score);
  if (shownScore !== state.score) { // o placar sobe contando, em vez de pular direto
    const jump = shownScore < 0 || state.score < shownScore || calm.matches;
    const before = shownScore;
    shownScore = jump ? state.score : shownScore + Math.ceil((state.score - shownScore) * 0.18);
    $('score').textContent = fmt(shownScore);
    if (before >= 0 && shownScore === state.score) bump($('score').parentElement);
  }
  // segunda caixa do placar: o tempo que falta, ou o recorde do modo
  const timed = state.rules.timeLimit > 0;
  const boxValue = state.goal ? goalProgress(state.goal, state.kind) : timed ? clockText(state.timeLeft) : fmt(bestOf(state.mode));
  if (shownBest !== boxValue) {
    shownBest = boxValue;
    $('best-label').textContent = state.goal ? 'Objetivo' : timed ? 'Tempo' : 'Recorde';
    $('best').textContent = boxValue;
    $('best').classList.toggle('long', boxValue.length > 8);
    $('best-box').classList.toggle('low', timed && state.timeLeft <= 10);
  }
  const key = state.kind + state.next + state.nextSpecial;
  if (key !== shownNext) {
    shownNext = key;
    $('next').innerHTML = face(state.kind, state.next, state.nextSpecial);
    $('next').title = state.nextSpecial ? SPECIAL_NAMES[state.nextSpecial] : '';
    if (state.nextSpecial) toast(SPECIAL_TIPS[state.nextSpecial]);
    bump($('next'));
  }
  if (state.over && $('over').hidden) {
    renderOver();
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

// Tela de fim de partida, conforme o modo.
function renderOver() {
  const level = state.mode === 'level';
  const won = level && state.won;
  $('over-title').textContent = won ? `Fase ${state.level} concluída!`
    : level ? 'Não foi dessa vez'
      : state.overReason === 'time' ? 'Tempo esgotado!' : 'Lotou!';
  $('over-stars').hidden = !won;
  $('over-stars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= state.stars ? '' : 'off'}">★</span>`).join('');
  $('over-text').innerHTML = level && !won
    ? (state.overReason === 'drops' ? 'Acabaram os bichos antes do objetivo.' : 'O quintal lotou antes do objetivo.')
    : `Você fez <b id="final">${fmt(state.score)}</b> pontos.`;
  $('again').textContent = won ? (state.level < LEVEL_COUNT ? 'Próxima fase' : 'Ver fases') : level ? 'Tentar de novo' : 'Jogar de novo';
}

function renderMenu() {
  const going = hasGame();
  $('continue').hidden = !going;
  $('continue-info').textContent = going
    ? `${MODE_NAMES[state.mode]}${state.level ? ` ${state.level}` : ''} · ${state.kind === 'cat' ? 'Gatos' : 'Cachorros'} · ${fmt(state.score)} pontos` : '';
  const days = meta.streak?.last === today() ? meta.streak.days : 0;
  $('menu-streak').textContent = days > 1 ? ` · ${days} dias seguidos` : '';
  $('play').textContent = going ? 'Nova partida' : 'Jogar';
  $('play').classList.toggle('primary', !going);
  $('play').classList.toggle('big', !going);
  $('menu-best').textContent = fmt(best);
  renderCoins(false);
  renderMissionCount();
  renderTrophyCount();
}

function show(name) {
  screen = name;
  document.body.classList.toggle('in-game', name === 'game');
  $('menu').hidden = name !== 'menu';
  $('game').hidden = name !== 'game';
  if (name === 'menu') {
    save();
    refreshMissions();
    offerDailyBonus();
    checkTrophies();
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
  track('power');
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

// Mapa de acontecimento do jogo -> estatística da conta.
const STAT_OF = { merge: 'merges', combo: 'combo', reach: 'level', score: 'score', scare: 'scares', drop: 'drops', game: 'games', adopt: 'adopts', power: 'powers' };

function renderTrophyCount() {
  $('trophies-count').textContent = `${meta.trophies?.length ?? 0}/${TROPHIES.length}`;
}

// Confere os troféus e avisa dos novos (já pagos em moedas).
function checkTrophies() {
  const won = claimTrophies(meta);
  if (!won.length) return;
  store.set('miau.meta', meta);
  renderCoins();
  renderTrophyCount();
  toast(`Troféu: ${won[0].name}! +${won.reduce((a, t) => a + t.reward, 0)} moedas`);
  sfx.coin();
}

function renderTrophies() {
  $('trophies-list').innerHTML = TROPHIES.map((t) => {
    const done = meta.trophies?.includes(t.id);
    const value = Math.min(statValue(meta, t.stat), t.goal);
    return `<li class="${done ? 'done' : ''}"><span class="text"><b>${t.name}</b>${t.text}</span>` +
      `<span class="reward">${COIN}${t.reward}</span><div class="bar"><i style="width:${Math.round((value / t.goal) * 100)}%"></i></div>` +
      `<small>${done ? 'Conquistado' : `${fmt(value)} de ${fmt(t.goal)}`}</small></li>`;
  }).join('');
  $('stats-list').innerHTML = Object.entries(STAT_NAMES)
    .map(([stat, name]) => `<dt>${name}</dt><dd>${fmt(statValue(meta, stat))}</dd>`).join('');
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
  if (STAT_OF[type]) { // o mesmo acontecimento alimenta as estatísticas e os troféus
    recordStat(meta, STAT_OF[type], value);
    if (type === 'game') recordStat(meta, 'total', state.score);
    store.set('miau.meta', meta);
    checkTrophies();
  }
  const before = missions.list.map((m) => m.progress).join();
  for (const m of progressMissions(missions, type, value)) {
    earn(m.reward);
    toast(`Missão concluída! +${m.reward} moedas`);
    sfx.coin();
    renderMissionCount();
  }
  if (before !== missions.list.map((m) => m.progress).join()) store.set('miau.missions', missions);
}

// Fim de uma partida do desafio do dia: guarda o melhor resultado e paga a recompensa da primeira.
function finishDaily() {
  const el = $('challenge-result');
  el.hidden = !state.daily;
  if (!state.daily) return;
  if (!state.dailyDone) {
    state.dailyDone = true;
    state.dailyReward = finishChallenge(meta, state.daily, state.score);
    store.set('miau.meta', meta);
    renderCoins(state.dailyReward > 0);
  }
  el.textContent = state.dailyReward
    ? `Desafio do dia concluído: +${state.dailyReward} moedas`
    : `Desafio do dia · seu melhor hoje: ${fmt(meta.challenge?.best ?? state.score)}`;
}

// Fim de uma fase: estrelas e recompensa (uma vez só por partida).
function finishLevelGame() {
  if (state.mode !== 'level' || state.levelDone) return;
  state.levelDone = true;
  state.levelReward = state.won ? finishLevel(meta, state.level, state.stars) : 0;
  if (state.won) {
    store.set('miau.meta', meta);
    renderCoins();
    if (!calm.matches) confetti(W, 40);
    sfx.adopt();
    checkTrophies();
  }
}

// --- Mapa de fases ---

function renderLevels() {
  $('levels-total').textContent = `Estrelas: ${totalStars(meta)} de ${LEVEL_COUNT * 3}. Passe uma fase para liberar a seguinte.`;
  const grid = $('level-grid');
  grid.replaceChildren();
  let nextUp = false;
  for (let n = 1; n <= LEVEL_COUNT; n++) {
    const stars = levelStars(meta, n);
    const open = levelUnlocked(meta, n);
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = !open;
    btn.innerHTML = `<b>${n}</b><small>${[1, 2, 3].map((i) => `<span class="${i <= stars ? '' : 'off'}">★</span>`).join('')}</small>`;
    const spec = levelSpec(n);
    btn.title = goalText(spec.goal, chosenKind(), spec.drops);
    btn.setAttribute('aria-label', `Fase ${n}: ${open ? btn.title : 'bloqueada'}${stars ? `, ${stars} estrelas` : ''}`);
    if (open && !stars && !nextUp) {
      btn.classList.add('next-up');
      nextUp = true;
    }
    btn.addEventListener('click', () => {
      $('levels').close();
      startLevel(n);
    });
    li.append(btn);
    grid.append(li);
  }
}

function startLevel(n) {
  newGame(chosenKind(), 'level', n);
  show('game');
  const spec = levelSpec(n);
  announce(`Fase ${n}: ${goalText(spec.goal, state.kind, spec.drops)}`);
}

// Mostra um aviso no meio do quintal por alguns segundos (sem atrapalhar o tutorial).
let announceTimer = 0;
function announce(text, seconds = 3.5) {
  const el = $('coach');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { if (el.textContent === text) el.hidden = true; }, seconds * 1000);
}

// Bônus por abrir o jogo: aparece uma vez por dia, no menu.
function offerDailyBonus() {
  const reward = claimDaily(meta);
  if (!reward) return;
  store.set('miau.meta', meta);
  renderCoins(false);
  const days = meta.streak.days;
  $('bonus-text').textContent = days > 1 ? `${days} dias seguidos! Volte amanhã para ganhar mais.` : 'Volte amanhã: o bônus cresce a cada dia seguido.';
  $('bonus-coins').textContent = `+${fmt(reward)}`;
  $('bonus-days').innerHTML = Array.from({ length: STREAK_CAP }, (_, i) =>
    `<li class="${i < days ? 'on' : ''}${i === Math.min(days, STREAK_CAP) - 1 ? ' now' : ''}">${i + 1}</li>`).join('');
  if (!document.querySelector('dialog[open]')) $('bonus').showModal();
}

// Paga as moedas da partida, uma vez só. Devolve quanto a partida rendeu.
function payout() {
  if (!state.paid) {
    state.paid = true;
    state.earned = Math.floor(coinsForScore(state.score) / (state.mode === 'zen' ? 2 : 1));
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
  if (state.mode !== 'classic') return; // as dicas falam do relógio e dos intrusos
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
  if (!tutorial || tutorial.seen.has('clock') || state.over || state.mode !== 'classic') return;
  tutorial.seen.delete('aim');
  tutorial.seen.delete('merge');
  if (state.drops === 0) state.current = 1;
  state.next = 1;
  state.aim = clampAim(state.current, state.aim);
  tip('aim');
}

// Nas duas primeiras dicas o relógio fica parado e só caem filhotes,
// para a primeira junção ser garantida.
const learningBasics = () => tutorial && state.mode === 'classic' && (tutorial.step === 'aim' || tutorial.step === 'merge');

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
    if (e.gold) {
      earn(GOLD_COINS);
      floatText(e.x, e.y + 26, `+${GOLD_COINS} moedas`, 18, '#ffd43b');
      burst(e.x, e.y, { n: 14, speed: 220, size: 6, colors: ['#ffd43b', '#f5b301', '#fff'] });
      sfx.coin();
    }
    if (e.type.startsWith('weather') || e.type === 'quake-kick') {
      weatherEvent(e);
      continue;
    }
    if (e.type === 'bark') {
      ring(e.x, e.y, e.r * 3);
      floatText(e.x, e.y - e.r, state.kind === 'cat' ? 'Miau!' : 'Au!', 24, '#fff');
      shake = Math.max(shake, 0.2);
      sfx.bark();
      continue;
    }
    if (e.type === 'merge') {
      if (e.wild) burst(e.x, e.y, { n: 16, speed: 240, size: 6, colors: ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'] });
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
      track('adopt');
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
      handle(clockOn() ? tick(state, DT, rngOf()) : step(state, DT));
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
      finishLevelGame();
      $('earned').textContent = `+${fmt(payout() + (state.levelReward ?? 0))}`;
      finishDaily();
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
    renderWeather();
    draw(now / 1000);
  }
  requestAnimationFrame(frame);
}

function release() {
  if (!drop(state, state.aim, rngOf())) return;
  sfx.drop();
  if (tutorial?.step === 'aim') tip('merge');
  if (learningBasics()) state.next = 1;
  unlock(state.current, false);
  track('drop');
  save();
}

function newGame(kind, mode = 'classic', level = 0) {
  if (!state.over && state.score > 0) { // partida abandonada também rende moedas
    const paid = state.paid;
    const coins = payout();
    if (coins && !paid) toast(`+${fmt(coins)} moedas pela partida`);
  }
  refreshMissions();
  if (mode === 'daily') { // desafio do dia: espécie e sorteio definidos pela data
    const date = today();
    state = createSeededGame(challengeKind(date), dateSeed(date));
    state.daily = date;
  } else if (mode === 'level') { // fase: objetivo, limite de bichos e sorteio fixo
    const spec = levelSpec(level);
    state = setGoal(createSeededGame(kind, spec.seed, spec.rules), spec.goal, spec.drops);
    state.level = level;
  } else {
    state = createGame(kind, Math.random, MODES[mode]);
  }
  state.mode = mode;
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

// Escolha de partida: espécie (lembrada) e modo.
const chosenKind = () => meta.kind ?? 'cat';
function renderChooser() {
  for (const btn of document.querySelectorAll('[data-species]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.species === chosenKind()));
  }
  for (const el of document.querySelectorAll('[data-best]')) {
    const value = bestOf(el.dataset.best);
    el.textContent = value ? `Recorde: ${fmt(value)} pontos` : '';
  }
}
for (const btn of document.querySelectorAll('[data-species]')) {
  btn.insertAdjacentHTML('afterbegin', face(btn.dataset.species, 1));
  btn.addEventListener('click', () => {
    meta.kind = btn.dataset.species;
    store.set('miau.meta', meta);
    renderChooser();
  });
}
for (const btn of document.querySelectorAll('[data-mode]')) {
  btn.addEventListener('click', () => {
    $('chooser').close();
    if (btn.dataset.mode === 'levels') {
      renderLevels();
      $('levels').showModal();
      return;
    }
    newGame(chosenKind(), btn.dataset.mode);
    show('game');
  });
}
$('levels-close').addEventListener('click', () => $('levels').close());
const sameAgain = () => (state.mode === 'daily' && state.daily !== today() ? 'classic' : state.mode);
// "Jogar de novo": nas fases, vai para a próxima (se venceu) ou repete a mesma.
function playAgain() {
  if (state.mode !== 'level') return newGame(state.kind, sameAgain());
  if (state.won && state.level >= LEVEL_COUNT) {
    show('menu');
    renderLevels();
    return $('levels').showModal();
  }
  startLevel(state.won ? state.level + 1 : state.level);
}
$('play').addEventListener('click', () => {
  $('chooser-note').hidden = !hasGame();
  renderChooser();
  $('levels-info').textContent = totalStars(meta) ? `${totalStars(meta)} estrelas de ${LEVEL_COUNT * 3}` : '';
  const c = meta.challenge?.date === today() ? meta.challenge : null;
  const who = challengeKind(today()) === 'cat' ? 'gatos' : 'cachorros';
  $('challenge-info').textContent = c
    ? `Hoje é com ${who}. Seu melhor: ${fmt(c.best)} pontos.`
    : `Hoje é com ${who}. Vale ${CHALLENGE_REWARD} moedas na primeira partida.`;
  $('chooser').showModal();
});
$('continue').addEventListener('click', () => show('game'));
$('again').addEventListener('click', playAgain);
$('to-menu').addEventListener('click', () => show('menu'));
$('pause').addEventListener('click', pause);
$('pause-dialog').addEventListener('close', () => { // fecha por botão ou pela tecla Esc
  paused = false;
  acc = 0;
});
$('resume').addEventListener('click', () => $('pause-dialog').close());
$('restart').addEventListener('click', () => {
  $('pause-dialog').close();
  if (state.mode === 'level') startLevel(state.level);
  else newGame(state.kind, sameAgain());
});
$('challenge').addEventListener('click', () => {
  $('chooser').close();
  newGame(null, 'daily');
  show('game');
  toast('Desafio do dia');
});
$('bonus-close').addEventListener('click', () => $('bonus').close());
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
$('shop-close').addEventListener('click', () => {
  $('shop').close();
  checkTrophies(); // comprar cenários também conta
});
$('trophies-btn').addEventListener('click', () => {
  renderTrophies();
  $('trophies').showModal();
});
$('trophies-close').addEventListener('click', () => $('trophies').close());
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
if (state.over) finishDaily();
if (state.over) $('earned').textContent = `+${fmt(payout())}`; // partida terminada antes de existirem moedas
unlock(Math.max(state.current, state.next, ...state.bodies.map((b) => b.level)), false);
introTip();
state.aim = clampAim(state.current, state.aim);
show('menu');
requestAnimationFrame(frame);

// Funcionamento sem internet. Só vale no site próprio do jogo: dentro de outra
// página (uma moldura) ou sem https o navegador não permite, e o jogo segue igual.
if ('serviceWorker' in navigator && window.top === window) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
