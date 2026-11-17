// O que existe fora de uma partida: moedas, missões diárias e loja de cenários.
// Sem nada de tela, para dar para testar direto no Node.

import { NAMES } from './game.js';

export const SCENES = [
  { id: 'quintal', name: 'Quintal', price: 0 },
  { id: 'praia', name: 'Praia', price: 800 },
  { id: 'neve', name: 'Neve', price: 2000 },
  { id: 'cidade', name: 'Cidade', price: 3500 },
  { id: 'espaco', name: 'Espaço', price: 5000 },
];

export const newMeta = () => ({ coins: 0, owned: ['quintal'], scene: 'quintal' });

export function validMeta(m) {
  return m && Number.isFinite(m.coins) && m.coins >= 0 && Array.isArray(m.owned) &&
    m.owned.includes('quintal') && m.owned.includes(m.scene) && SCENES.some((s) => s.id === m.scene);
}

export const coinsForScore = (score) => Math.floor(score / 50);

// Compra (se ainda não tem) e passa a usar o cenário. Devolve false se faltam moedas.
export function chooseScene(meta, id) {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) return false;
  if (!meta.owned.includes(id)) {
    if (meta.coins < scene.price) return false;
    meta.coins -= scene.price;
    meta.owned.push(id);
  }
  meta.scene = id;
  return true;
}

// --- Poderes ---
export const POWERS = [
  { id: 'shake', name: 'Sacudir', price: 60 },
  { id: 'pick', name: 'Tirar', price: 100 },
  { id: 'shoo', name: 'Xô', price: 80 },
];

// O preço sobe a cada uso na mesma partida: 1x, 2x, 3x...
export function powerCost(id, used = 0) {
  return POWERS.find((p) => p.id === id).price * (1 + used);
}

// --- Missões diárias ---
// Tipos que somam a cada acontecimento, e tipos que guardam o melhor valor atingido.
const MAX_TYPES = new Set(['combo', 'reach', 'score']);

// Para cada tipo, as variações possíveis: [meta, recompensa em moedas].
const POOL = {
  merge: [[30, 60], [50, 90]],
  scare: [[4, 70], [7, 110]],
  drop: [[80, 50], [120, 70]],
  game: [[3, 60]],
  combo: [[3, 60], [4, 100]],
  reach: [[6, 60], [7, 90], [8, 140]],
  score: [[3000, 70], [6000, 120]],
  kind: [['cat', 50], ['dog', 50]],
};

export function today(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function seededRng(text) {
  let s = 7;
  for (const ch of text) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
  s = s || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// As 3 missões do dia: iguais para todo mundo na mesma data, de tipos diferentes.
export function dailyMissions(date = today()) {
  const rng = seededRng(date);
  for (let i = 0; i < 5; i++) rng(); // os primeiros sorteios de datas vizinhas são parecidos
  const types = Object.keys(POOL);
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  const list = types.slice(0, 3).map((type) => {
    const [goal, reward] = POOL[type][Math.floor(rng() * POOL[type].length)];
    return type === 'kind'
      ? { type, kind: goal, goal: 1, reward, progress: 0, done: false }
      : { type, goal, reward, progress: 0, done: false };
  });
  return { date, list };
}

export function validMissions(m) {
  return m && typeof m.date === 'string' && Array.isArray(m.list) && m.list.length === 3 &&
    m.list.every((x) => POOL[x.type] && Number.isFinite(x.goal) && Number.isFinite(x.progress) && Number.isFinite(x.reward));
}

export function missionText(m) {
  const n = m.goal.toLocaleString('pt-BR');
  switch (m.type) {
    case 'merge': return `Junte bichos ${n} vezes`;
    case 'scare': return `Espante ${n} intrusos`;
    case 'drop': return `Solte ${n} bichos`;
    case 'game': return `Jogue ${n} partidas até o fim`;
    case 'combo': return `Faça um combo x${n}`;
    case 'reach': return `Consiga um ${NAMES.cat[m.goal - 1]} ou um ${NAMES.dog[m.goal - 1]}`;
    case 'score': return `Faça ${n} pontos numa partida`;
    case 'kind': return `Termine uma partida com ${m.kind === 'cat' ? 'gatos' : 'cachorros'}`;
    default: return '';
  }
}

/**
 * Registra um acontecimento nas missões do dia. `value` é a quantidade (tipos
 * que somam), o valor atingido (combo, reach, score) ou a espécie (kind).
 * Devolve as missões que acabaram de ser concluídas.
 */
export function progressMissions(missions, type, value = 1) {
  const completed = [];
  for (const m of missions.list) {
    if (m.type !== type || m.done) continue;
    if (type === 'kind') m.progress = value === m.kind ? 1 : m.progress;
    else if (MAX_TYPES.has(type)) m.progress = Math.max(m.progress, value);
    else m.progress += value;
    if (m.progress >= m.goal) {
      m.progress = m.goal;
      m.done = true;
      completed.push(m);
    }
  }
  return completed;
}
