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

export const ACCESSORIES = [
  { id: 'laco', name: 'Laço', price: 600 },
  { id: 'cachecol', name: 'Cachecol', price: 900 },
  { id: 'oculos', name: 'Óculos escuros', price: 1200 },
  { id: 'chapeu', name: 'Chapéu de festa', price: 1500 },
  { id: 'coroa', name: 'Coroa', price: 3000 },
];

// Compra (se ainda não tem) e passa a usar o acessório; null tira o acessório.
export function chooseAccessory(meta, id) {
  if (id === null) {
    meta.acc = null;
    return true;
  }
  const item = ACCESSORIES.find((a) => a.id === id);
  if (!item) return false;
  meta.accOwned ??= [];
  if (!meta.accOwned.includes(id)) {
    if (meta.coins < item.price) return false;
    meta.coins -= item.price;
    meta.accOwned.push(id);
  }
  meta.acc = id;
  return true;
}

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

// --- Bônus diário: moedas por abrir o jogo, mais a cada dia seguido (até o 7º) ---
export const DAILY_BONUS = 50;
export const STREAK_CAP = 7;

function dayBefore(date) {
  const [y, m, d] = date.split('-').map(Number);
  return today(new Date(y, m - 1, d - 1));
}

// Devolve as moedas do bônus de hoje (já somadas), ou 0 se hoje já foi recebido.
export function claimDaily(meta, date = today()) {
  const streak = meta.streak ?? { last: '', days: 0 };
  if (streak.last === date) return 0;
  const days = streak.last === dayBefore(date) ? streak.days + 1 : 1;
  meta.streak = { last: date, days };
  const reward = DAILY_BONUS * Math.min(days, STREAK_CAP);
  meta.coins += reward;
  return reward;
}

// --- Desafio do dia: mesma sequência de bichos para todo mundo na mesma data ---
export const CHALLENGE_REWARD = 150;

export function dateSeed(date) {
  let s = 7;
  for (const ch of date) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
  return s;
}

export const challengeKind = (date) => (dateSeed(date) % 2 ? 'cat' : 'dog');

// Registra o fim de uma partida do desafio. Devolve as moedas ganhas (só na primeira do dia).
export function finishChallenge(meta, date, score) {
  const c = meta.challenge?.date === date ? meta.challenge : { date, best: 0, rewarded: false };
  c.best = Math.max(c.best, score);
  const reward = c.rewarded ? 0 : CHALLENGE_REWARD;
  c.rewarded = true;
  meta.challenge = c;
  meta.coins += reward;
  return reward;
}

// --- Estatísticas e troféus ---
// Números da conta toda. Alguns somam, outros guardam o melhor valor.
const STAT_MAX = new Set(['combo', 'level', 'score']);
export const STAT_NAMES = {
  games: 'Partidas jogadas', total: 'Pontos somados', score: 'Melhor partida', merges: 'Junções',
  combo: 'Maior combo', level: 'Maior bicho (nível)', scares: 'Intrusos espantados', adopts: 'Adoções',
  drops: 'Bichos soltos', powers: 'Poderes usados',
};

export function recordStat(meta, stat, value = 1) {
  meta.stats ??= {};
  const now = meta.stats[stat] ?? 0;
  meta.stats[stat] = STAT_MAX.has(stat) ? Math.max(now, value) : now + value;
}

// Valor de uma estatística; duas delas vêm de outras partes da conta.
export function statValue(meta, stat) {
  if (stat === 'streak') return meta.streak?.days ?? 0;
  if (stat === 'scenes') return meta.owned.length;
  if (stat === 'accs') return meta.accOwned?.length ?? 0;
  if (stat === 'levels') return Object.keys(meta.levels ?? {}).length;
  if (stat === 'stars') return Object.values(meta.levels ?? {}).reduce((a, b) => a + b, 0);
  return meta.stats?.[stat] ?? 0;
}

export const TROPHIES = [
  { id: 'first', name: 'Primeiros passos', text: 'Termine uma partida', stat: 'games', goal: 1, reward: 50 },
  { id: 'games10', name: 'Freguês', text: 'Termine 10 partidas', stat: 'games', goal: 10, reward: 150 },
  { id: 'games50', name: 'Da casa', text: 'Termine 50 partidas', stat: 'games', goal: 50, reward: 400 },
  { id: 'merge100', name: 'Juntador', text: 'Junte bichos 100 vezes', stat: 'merges', goal: 100, reward: 100 },
  { id: 'merge1000', name: 'Mestre das junções', text: 'Junte bichos 1.000 vezes', stat: 'merges', goal: 1000, reward: 400 },
  { id: 'scare25', name: 'Guarda do quintal', text: 'Espante 25 intrusos', stat: 'scares', goal: 25, reward: 150 },
  { id: 'scare100', name: 'Xô, intruso!', text: 'Espante 100 intrusos', stat: 'scares', goal: 100, reward: 400 },
  { id: 'combo5', name: 'Em cadeia', text: 'Faça um combo x5', stat: 'combo', goal: 5, reward: 150 },
  { id: 'level8', name: 'Fera', text: 'Consiga o 8º bicho', stat: 'level', goal: 8, reward: 150 },
  { id: 'level10', name: 'Rei do quintal', text: 'Consiga o 10º bicho', stat: 'level', goal: 10, reward: 300 },
  { id: 'adopt', name: 'Final feliz', text: 'Junte dois do 10º bicho para a adoção', stat: 'adopts', goal: 1, reward: 500 },
  { id: 'score10k', name: 'Dez mil', text: 'Faça 10.000 pontos numa partida', stat: 'score', goal: 10000, reward: 150 },
  { id: 'score25k', name: 'Pontuação de respeito', text: 'Faça 25.000 pontos numa partida', stat: 'score', goal: 25000, reward: 400 },
  { id: 'streak7', name: 'Semana cheia', text: 'Abra o jogo 7 dias seguidos', stat: 'streak', goal: 7, reward: 300 },
  { id: 'scenes3', name: 'Viajante', text: 'Tenha 3 cenários', stat: 'scenes', goal: 3, reward: 200 },
  { id: 'acc1', name: 'Na moda', text: 'Compre um acessório', stat: 'accs', goal: 1, reward: 100 },
  { id: 'levels10', name: 'Desbravador', text: 'Passe 10 fases', stat: 'levels', goal: 10, reward: 300 },
  { id: 'levels30', name: 'Fim da trilha', text: 'Passe as 30 fases', stat: 'levels', goal: 30, reward: 1000 },
  { id: 'stars60', name: 'Chuva de estrelas', text: 'Junte 60 estrelas nas fases', stat: 'stars', goal: 60, reward: 500 },
];

// Confere os troféus; os recém-conquistados pagam na hora e são devolvidos.
export function claimTrophies(meta) {
  meta.trophies ??= [];
  const won = TROPHIES.filter((t) => !meta.trophies.includes(t.id) && statValue(meta, t.stat) >= t.goal);
  for (const t of won) {
    meta.trophies.push(t.id);
    meta.coins += t.reward;
  }
  return won;
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
