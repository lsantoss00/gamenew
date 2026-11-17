// As fases: um objetivo, um limite de bichos e as regras que valem em cada uma.
// Cada fase tem um sorteio fixo, para ser sempre a mesma a cada tentativa.

import { NAMES } from './game.js';

export const LEVEL_COUNT = 30;
const TYPES = ['merges', 'reach', 'score', 'scare'];

export function levelSpec(n) {
  let type = TYPES[(n - 1) % TYPES.length];
  if (type === 'scare' && n < 4) type = 'reach';
  const rules = {
    clock: n >= 6,
    rivals: n >= 4 || type === 'scare',
    specials: n >= 8,
    events: n >= 12,
  };
  const t = (n - 1) / (LEVEL_COUNT - 1); // 0 na primeira fase, 1 na última
  let value;
  let drops;
  if (type === 'merges') {
    value = Math.round(8 + 22 * t);
    drops = Math.round(value * (2.1 - 0.4 * t));
  } else if (type === 'reach') {
    value = n === LEVEL_COUNT ? 9 : Math.min(8, 4 + Math.floor(n / 6));
    drops = Math.ceil((2 ** (value - 1) / 2.2) * (1.9 - 0.5 * t) + 4);
  } else if (type === 'score') {
    value = Math.round((300 + 3200 * t) / 50) * 50;
    drops = Math.round((28 + 30 * t) * 1.3);
  } else {
    value = 2 + Math.floor(n / 8);
    drops = Math.round((24 + value * (9 - 2 * t)) * 0.85);
  }
  return { n, goal: { type, value }, drops, rules, seed: n * 7919 + 13 };
}

const FEMININE = new Set(['Jaguatirica', 'Pantera']);
const article = (name) => (FEMININE.has(name) ? 'uma' : 'um');

export function goalText(goal, kind, drops) {
  const v = goal.value.toLocaleString('pt-BR');
  const what = {
    merges: `Junte bichos ${v} vezes`,
    reach: `Consiga ${article(NAMES[kind][goal.value - 1])} ${NAMES[kind][goal.value - 1]}`,
    score: `Faça ${v} pontos`,
    scare: `Espante ${v} intrusos`,
  }[goal.type];
  return drops ? `${what} com ${drops} bichos` : what;
}

// Texto curto do progresso, para o placar.
export function goalProgress(goal, kind) {
  if (goal.type === 'reach') return NAMES[kind][goal.value - 1];
  return `${goal.progress.toLocaleString('pt-BR')}/${goal.value.toLocaleString('pt-BR')}`;
}

// --- Progresso nas fases ---

export const levelStars = (meta, n) => meta.levels?.[n] ?? 0;
export const levelUnlocked = (meta, n) => n === 1 || levelStars(meta, n - 1) > 0;
export const totalStars = (meta) => Object.values(meta.levels ?? {}).reduce((a, b) => a + b, 0);

// Registra uma vitória. Paga na primeira vez que passa a fase e a cada estrela nova.
export function finishLevel(meta, n, stars) {
  const before = levelStars(meta, n);
  const reward = (before ? 0 : 20 + 5 * n) + 15 * Math.max(0, stars - before);
  meta.levels = { ...meta.levels, [n]: Math.max(before, stars) };
  meta.coins += reward;
  return reward;
}
