// Regras e física do jogo, sem nada de tela: dá para testar direto no Node.
// O cercado mede W x H unidades; a tela só escala isso para o tamanho do aparelho.

export const W = 360;
export const H = 520;
export const LINE_Y = 100; // bicho parado acima desta linha = quintal lotado
export const DROP_Y = 52; // altura de onde o bicho é solto
export const MAX_LEVEL = 10;
export const KINDS = ['cat', 'dog'];
export const RADII = [17, 24, 31, 38, 47, 57, 68, 80, 93, 108];
export const ADOPTION_BONUS = 5000;
export const SCARE_BONUS = 50; // pontos por intruso espantado
export const DROP_COOLDOWN = 0.45; // segundos entre um bicho solto e o próximo
export const COMBO_WINDOW = 1.2; // segundos para a próxima junção contar como combo
export const WARNING_TIME = 1.2; // segundos de aviso antes de um intruso cair
export const FIRST_RIVAL = 6; // quantos bichos soltos até o primeiro intruso
export const DT = 1 / 240; // passo fixo da física

// Bichos especiais que caem de vez em quando:
//  - wild: curinga, junta com qualquer bicho e vira o próximo dele
//  - gold: dourado, rende moedas quando é juntado
//  - bark: barulhento, empurra os vizinhos para longe quando encosta em algo
//  - sleepy: dorminhoco, só junta depois de acordar
export const SPECIALS = ['wild', 'gold', 'bark', 'sleepy'];
export const SPECIAL_NAMES = { wild: 'Curinga', gold: 'Dourado', bark: 'Barulhento', sleepy: 'Dorminhoco' };
export const SLEEP_TIME = 6; // segundos que o dorminhoco leva para acordar
export const FIRST_SPECIAL = 8; // quantos bichos soltos até poder cair um especial
const SPECIAL_CHANCE = 0.1;
const SPECIAL_WEIGHTS = { wild: 0.3, gold: 0.3, bark: 0.2, sleepy: 0.2 };
const BARK_RADIUS = 120;

// Eventos no quintal, com aviso antes:
//  - wind: ventania que empurra todo mundo para um lado
//  - rain: chuva; o pelo molhado encolhe os bichos e eles voltam ao tamanho quando seca
//  - quake: tremor que sacode a pilha algumas vezes
export const WEATHERS = ['wind', 'rain', 'quake'];
export const WEATHER_WARN = 2; // segundos de aviso
export const FIRST_WEATHER = 18; // quantos bichos soltos até o primeiro evento
const WEATHER_TIME = { wind: 5, rain: 7, quake: 2.4 };
const WIND = 650; // empurrão lateral, em unidades/s² (a gravidade é 1800)
const WET_SHRINK = 0.14; // quanto a chuva encolhe os bichos
const QUAKE_EVERY = 0.6;
const BARK_PUSH = 5;

export const NAMES = {
  cat: ['Filhotinho', 'Gatinho', 'Malhado', 'Siamês', 'Persa', 'Lince', 'Jaguatirica', 'Pantera', 'Tigre', 'Leão'],
  dog: ['Filhotinho', 'Caramelo', 'Salsicha', 'Beagle', 'Border Collie', 'Husky', 'Pastor', 'Dobermann', 'São Bernardo', 'Lobo'],
};

const GRAVITY = 1800;
const DAMP = 0.998;
const FLOOR_GRIP = 0.9; // quanto da velocidade lateral sobra ao arrastar no chão
const MAX_STEP = 12; // deslocamento máximo por passo, para a pilha não explodir
const ITERATIONS = 4;
const PUSH_SPEED = 1.5; // deslocamento por passo que um empurrão pode dar a um bicho parado
const POP = 2.2; // empurrão que uma junção dá nos vizinhos
const UPRIGHT = 2.5; // força com que o bicho se endireita
const GROW = 0.12; // segundos que um bicho recém-juntado leva para crescer
const SETTLE = 1.2; // idade a partir da qual o bicho conta para a linha
const DANGER_LIMIT = 1.6; // segundos acima da linha até o fim de jogo
const DROP_WEIGHTS = [0.35, 0.3, 0.2, 0.15]; // só os 4 menores são soltos
const MAX_COMBO = 5; // o multiplicador de pontos do combo para aqui

function pickSpecial(state, rng) {
  if (!state.rules.specials || state.drops < FIRST_SPECIAL || rng() >= SPECIAL_CHANCE) return null;
  let x = rng();
  for (const id of SPECIALS) {
    x -= SPECIAL_WEIGHTS[id];
    if (x < 0) return id;
  }
  return SPECIALS[0];
}

// Sorteia o próximo bicho da fila: nível e, às vezes, um especial.
function pickNext(state, rng) {
  state.nextSpecial = pickSpecial(state, rng);
  state.next = state.nextSpecial === 'wild' ? 2 : pickLevel(rng);
}

function pickLevel(rng) {
  let x = rng();
  for (let i = 0; i < DROP_WEIGHTS.length; i++) {
    x -= DROP_WEIGHTS[i];
    if (x < 0) return i + 1;
  }
  return 1;
}

// Tempo para soltar cada bicho: começa folgado e aperta ao longo da partida.
export function dropTime(state) {
  return Math.max(1.5, 4 - state.drops * 0.025);
}

// De quantos em quantos bichos soltos cai um intruso.
export function rivalInterval(state) {
  return Math.max(3, 7 - Math.floor(state.drops / 20));
}

// Sorteio que guarda a semente dentro da partida: com a mesma semente, a
// sequência de bichos e intrusos é a mesma (usado no desafio do dia).
export function stateRng(state) {
  return () => (state.seed = (state.seed * 16807) % 2147483647) / 2147483647;
}

// Partida com sorteio fixo a partir de uma semente.
export function createSeededGame(kind, seed, rules = {}) {
  const holder = { seed: (seed % 2147483646) + 1 };
  const state = createGame(kind, stateRng(holder), rules);
  state.seed = holder.seed;
  return state;
}

// O que vale numa partida. O modo clássico liga tudo; os outros modos desligam partes.
export const DEFAULT_RULES = { clock: true, rivals: true, specials: true, events: true, timeLimit: 0 };

// Modos de jogo e as regras de cada um.
export const MODES = {
  classic: {},
  zen: { clock: false, rivals: false, events: false },
  time: { clock: false, events: false, timeLimit: 90 },
};

export function createGame(kind = 'cat', rng = Math.random, rules = {}) {
  const state = {
    kind,
    rules: { ...DEFAULT_RULES, ...rules },
    currentSpecial: null,
    nextSpecial: null,
    bodies: [],
    score: 0,
    nextId: 1,
    current: pickLevel(rng),
    next: pickLevel(rng),
    aim: W / 2,
    drops: 0,
    timer: 0,
    cooldown: 0,
    combo: 0,
    comboT: 0,
    rivalAt: FIRST_RIVAL,
    weather: null, // { type, warn, t, dir, kick }
    weatherAt: FIRST_WEATHER,
    wet: 0, // 0 = seco, 1 = encharcado
    warning: null, // { x, level, t }: intruso prestes a cair
    danger: 0,
    over: false,
    overReason: '', // 'full' (lotou) ou 'time' (acabou o tempo)
  };
  state.timeLeft = state.rules.timeLimit;
  state.timer = dropTime(state);
  return state;
}

// Partidas salvas antes dos especiais não têm esses campos.
export function upgradeState(state) {
  state.rules ??= { ...DEFAULT_RULES };
  state.currentSpecial ??= null;
  state.nextSpecial ??= null;
  state.weather ??= null;
  state.weatherAt ??= state.drops + FIRST_WEATHER;
  state.wet ??= 0;
  state.timeLeft ??= state.rules.timeLimit;
  state.mode ??= state.daily ? 'daily' : 'classic';
  for (const b of state.bodies) {
    b.special ??= null;
    b.sleep ??= 0;
  }
  return state;
}

function makeBody(state, level, x, y, r0) {
  return { id: state.nextId++, level, x, y, px: x, py: y, r: r0, r0, age: 0, angle: 0, rival: false, special: null, sleep: 0 };
}

// Dois bichos podem se juntar? Intruso e dorminhoco não juntam; o curinga junta com qualquer um.
function canMerge(a, b) {
  if (a.rival || b.rival || a.sleep > 0 || b.sleep > 0) return false;
  return a.special === 'wild' || b.special === 'wild' || a.level === b.level;
}

// Nível que nasce da junção (acima do máximo, os dois são adotados).
function mergedLevel(a, b) {
  if (a.special === 'wild' && b.special === 'wild') return 3;
  if (a.special === 'wild') return b.level + 1;
  if (b.special === 'wild') return a.level + 1;
  return a.level + 1;
}

export function clampAim(level, x) {
  const r = RADII[level - 1];
  return Math.min(W - r, Math.max(r, x));
}

export function canDrop(state) {
  return !state.over && state.cooldown <= 0;
}

export function drop(state, x = state.aim, rng = Math.random) {
  if (!canDrop(state)) return null;
  const level = state.current;
  // Um desvio mínimo evita torres perfeitamente equilibradas quando se solta sempre no mesmo ponto.
  const body = makeBody(state, level, clampAim(level, x + (rng() - 0.5) * 2), DROP_Y, RADII[level - 1]);
  body.special = state.currentSpecial;
  if (body.special === 'sleepy') body.sleep = SLEEP_TIME;
  state.bodies.push(body);
  state.current = state.next;
  state.currentSpecial = state.nextSpecial;
  pickNext(state, rng);
  state.aim = clampAim(state.current, x);
  state.cooldown = DROP_COOLDOWN;
  state.drops++;
  state.timer = dropTime(state);
  if (state.rules.rivals && state.drops >= state.rivalAt && !state.warning) {
    const rivalLevel = 1 + Math.floor(rng() * 3);
    const r = RADII[rivalLevel - 1];
    state.warning = { x: r + rng() * (W - 2 * r), level: rivalLevel, t: WARNING_TIME };
    state.rivalAt = state.drops + rivalInterval(state);
  }
  return body;
}

/**
 * Avança só a física em `dt` segundos. Devolve o que aconteceu, para a tela animar:
 *  - { type: 'merge', x, y, level, gained, combo }
 *  - { type: 'adopt', x, y, level, gained }
 *  - { type: 'scare', x, y, level, gained }: intruso espantado por uma junção ao lado
 */
export function step(state, dt = DT) {
  const events = [];
  if (state.over) return events;
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.comboT = Math.max(0, state.comboT - dt);
  const weather = state.weather && state.weather.warn <= 0 ? state.weather.type : null;
  state.wet = Math.min(1, Math.max(0, state.wet + (weather === 'rain' ? dt : -dt / 2)));
  const size = 1 - WET_SHRINK * state.wet;
  const wind = weather === 'wind' ? state.weather.dir * WIND * dt * dt : 0;

  const bodies = state.bodies;
  const limits = new Map(); // velocidade máxima de cada bicho ao fim do passo
  for (const b of bodies) {
    b.age += dt;
    if (b.sleep > 0) b.sleep = Math.max(0, b.sleep - dt);
    const target = RADII[b.level - 1];
    b.r = (b.age < GROW ? b.r0 + (target - b.r0) * (b.age / GROW) : target) * size;
    let vx = (b.x - b.px) * DAMP;
    let vy = (b.y - b.py) * DAMP;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_STEP) {
      vx *= MAX_STEP / speed;
      vy *= MAX_STEP / speed;
    }
    b.px = b.x;
    b.py = b.y;
    b.x += vx + wind;
    b.y += vy + GRAVITY * dt * dt;
    // rola com o movimento e, como um joão-bobo, volta a ficar de pé quando para
    b.angle += vx / b.r;
    b.angle -= b.angle * Math.min(1, UPRIGHT * dt);
    limits.set(b, Math.max(PUSH_SPEED, Math.hypot(b.x - b.px, b.y - b.py)));
  }

  const dead = new Set();
  const touched = new Set(); // quem encostou em outro bicho neste passo (para o latido)
  const born = [];
  const pops = []; // junções deste passo: { x, y, r, level }
  for (let it = 0; it < ITERATIONS; it++) {
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (dead.has(a)) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (dead.has(b)) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.r + b.r;

        if (d < min + 0.5 && canMerge(a, b)) {
          dead.add(a);
          dead.add(b);
          const x = (a.x + b.x) / 2;
          const y = (a.y + b.y) / 2;
          const gold = a.special === 'gold' || b.special === 'gold';
          const wild = a.special === 'wild' || b.special === 'wild';
          const level = mergedLevel(a, b);
          if (level > MAX_LEVEL) {
            state.score += ADOPTION_BONUS;
            pops.push({ x, y, r: RADII[MAX_LEVEL - 1] * 1.3, level: 0 });
            events.push({ type: 'adopt', x, y, level: MAX_LEVEL, gained: ADOPTION_BONUS, gold });
          } else {
            const r = RADII[level - 1];
            born.push(makeBody(state, level, Math.min(W - r, Math.max(r, x)), Math.min(H - r, y), Math.min(a.r, b.r)));
            state.combo = state.comboT > 0 ? state.combo + 1 : 1;
            state.comboT = COMBO_WINDOW;
            const gained = 2 ** level * Math.min(state.combo, MAX_COMBO);
            state.score += gained;
            pops.push({ x, y, r, level });
            events.push({ type: 'merge', x, y, level, gained, combo: state.combo, gold, wild });
          }
          break;
        }

        if (d < min) {
          const nx = d > 1e-6 ? dx / d : 0;
          const ny = d > 1e-6 ? dy / d : -1;
          const ma = a.r * a.r;
          const mb = b.r * b.r;
          const push = min - d;
          const ka = mb / (ma + mb);
          a.x -= nx * push * ka;
          a.y -= ny * push * ka;
          b.x += nx * push * (1 - ka);
          b.y += ny * push * (1 - ka);
          touched.add(a);
          touched.add(b);
        }
      }
    }
    for (const b of bodies) {
      if (b.x < b.r) b.x = b.r;
      else if (b.x > W - b.r) b.x = W - b.r;
      if (b.y > H - b.r) {
        b.y = H - b.r;
        if (it === 0) b.px = b.x - (b.x - b.px) * FLOOR_GRIP;
      }
    }
  }

  // Um empurrão não pode lançar o bicho mais rápido do que ele já vinha:
  // sem isso, um pequeno espremido contra a cerca sai voando.
  for (const b of bodies) {
    const v = Math.hypot(b.x - b.px, b.y - b.py);
    const limit = limits.get(b);
    if (v > limit) {
      b.px = b.x - (b.x - b.px) * (limit / v);
      b.py = b.y - (b.y - b.py) * (limit / v);
    }
  }

  // O latido dispara quando o bicho encosta no chão ou em outro: empurra todo mundo em volta.
  for (const b of bodies) {
    if (b.special !== 'bark' || dead.has(b) || b.age < 0.05) continue;
    if (!touched.has(b) && b.y < H - b.r - 0.5) continue;
    b.special = null;
    for (const o of bodies) {
      if (o === b || dead.has(o)) continue;
      const dx = o.x - b.x;
      const dy = o.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d > BARK_RADIUS + o.r || d < 1) continue;
      const k = BARK_PUSH * (1 - d / (BARK_RADIUS + o.r)) * Math.min(1, (b.r * b.r * 2) / (o.r * o.r));
      o.px -= (dx / d) * k;
      o.py -= (dy / d) * k + k * 0.4; // um pouco para cima
      o.age = Math.min(o.age, SETTLE * 0.5); // não conta para a linha enquanto voa
    }
    events.push({ type: 'bark', x: b.x, y: b.y, r: b.r });
  }

  // Cada junção espanta os intrusos encostados e dá um tranco nos vizinhos.
  for (const pop of pops) {
    for (const b of bodies) {
      if (dead.has(b)) continue;
      const dx = b.x - pop.x;
      const dy = b.y - pop.y;
      const d = Math.hypot(dx, dy);
      if (d > pop.r + b.r + 10) continue;
      if (b.rival) {
        dead.add(b);
        state.score += SCARE_BONUS;
        events.push({ type: 'scare', x: b.x, y: b.y, level: b.level, gained: SCARE_BONUS });
      } else if (d > 1 && b.level !== pop.level) { // quem vai juntar em seguida não é afastado
        const k = POP * Math.min(1, (pop.r * pop.r) / (b.r * b.r));
        b.px -= (dx / d) * k;
        b.py -= (dy / d) * k;
      }
    }
  }

  if (dead.size || born.length) {
    state.bodies = bodies.filter((b) => !dead.has(b)).concat(born);
  }

  const above = state.bodies.some((b) => b.age > SETTLE && b.y - b.r < LINE_Y);
  state.danger = above ? state.danger + dt : 0;
  if (state.danger > DANGER_LIMIT) {
    state.over = true;
    state.overReason = 'full';
  }
  return events;
}

// --- Poderes (comprados com moedas, usados durante a partida) ---

// Sacode o quintal: todo mundo pula e se reacomoda, o que costuma render junções.
export function shake(state, rng = Math.random) {
  if (state.over || state.bodies.length === 0) return false;
  for (const b of state.bodies) {
    b.r0 = RADII[b.level - 1];
    b.age = 0; // tempo para assentar de novo antes de contar para a linha
    b.px = b.x + (rng() - 0.5) * 5;
    b.py = b.y + 2.2 + rng() * 1.4;
  }
  state.danger = 0;
  return true;
}

// O bicho (ou intruso) que está sob o ponto tocado.
export function bodyAt(state, x, y) {
  let found = null;
  let nearest = Infinity;
  for (const b of state.bodies) {
    const d = Math.hypot(b.x - x, b.y - y);
    if (d <= b.r + 6 && d < nearest) {
      found = b;
      nearest = d;
    }
  }
  return found;
}

// Tira um bicho do quintal. Devolve o bicho tirado, ou null.
export function removeBody(state, id) {
  if (state.over) return null;
  const body = state.bodies.find((b) => b.id === id);
  if (!body) return null;
  state.bodies = state.bodies.filter((b) => b !== body);
  return body;
}

// Espanta todos os intrusos de uma vez. Devolve os que saíram.
export function scareAll(state) {
  if (state.over) return [];
  const rivals = state.bodies.filter((b) => b.rival);
  state.bodies = state.bodies.filter((b) => !b.rival);
  return rivals;
}

/**
 * Física + ritmo da partida: o relógio que solta o bicho sozinho e a queda dos
 * intrusos e os eventos no quintal. Além dos eventos de `step`, devolve
 * { type: 'autodrop' }, { type: 'rival', x }, { type: 'weather-warn' | 'weather-start' |
 * 'weather-end', weather, dir } e { type: 'quake-kick' }.
 */
export function tick(state, dt = DT, rng = Math.random) {
  const events = step(state, dt);
  if (state.over) return events;

  if (state.rules.events && !state.weather && state.drops >= state.weatherAt) {
    const type = WEATHERS[Math.floor(rng() * WEATHERS.length)];
    state.weather = { type, warn: WEATHER_WARN, t: WEATHER_TIME[type], dir: rng() < 0.5 ? -1 : 1, kick: 0 };
    events.push({ type: 'weather-warn', weather: type, dir: state.weather.dir });
  } else if (state.weather) {
    const w = state.weather;
    if (w.warn > 0) {
      w.warn -= dt;
      if (w.warn <= 0) events.push({ type: 'weather-start', weather: w.type, dir: w.dir });
    } else {
      w.t -= dt;
      if (w.type === 'quake') {
        w.kick -= dt;
        if (w.kick <= 0) {
          w.kick = QUAKE_EVERY;
          for (const b of state.bodies) {
            b.px = b.x + (rng() - 0.5) * 3;
            b.py = b.y + 1.2 + rng() * 0.8;
            b.age = Math.min(b.age, SETTLE - QUAKE_EVERY); // não conta para a linha enquanto treme
          }
          events.push({ type: 'quake-kick' });
        }
      }
      if (w.t <= 0) {
        state.weather = null;
        state.weatherAt = state.drops + 16 + Math.floor(rng() * 10);
        events.push({ type: 'weather-end', weather: w.type });
      }
    }
  }

  if (state.warning) {
    state.warning.t -= dt;
    if (state.warning.t <= 0) {
      const { x, level } = state.warning;
      const r = RADII[level - 1];
      const body = makeBody(state, level, x, -r, r);
      body.rival = true;
      state.bodies.push(body);
      state.warning = null;
      events.push({ type: 'rival', x });
    }
  }

  if (state.rules.timeLimit) { // contra o tempo
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    if (state.timeLeft <= 0) {
      state.over = true;
      state.overReason = 'time';
      events.push({ type: 'timeup' });
      return events;
    }
  }

  if (state.rules.clock && canDrop(state)) {
    state.timer -= dt;
    if (state.timer <= 0) {
      drop(state, state.aim, rng);
      events.push({ type: 'autodrop' });
    }
  }
  return events;
}
