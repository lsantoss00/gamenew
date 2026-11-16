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

export const NAMES = {
  cat: ['Filhotinho', 'Gatinho', 'Malhado', 'Siamês', 'Persa', 'Lince', 'Jaguatirica', 'Onça', 'Tigre', 'Leão'],
  dog: ['Filhotinho', 'Caramelo', 'Salsicha', 'Beagle', 'Border Collie', 'Husky', 'Pastor', 'Dobermann', 'São Bernardo', 'Lobo'],
};

const GRAVITY = 1800;
const DAMP = 0.998;
const FLOOR_GRIP = 0.9; // quanto da velocidade lateral sobra ao arrastar no chão
const MAX_STEP = 12; // deslocamento máximo por passo, para a pilha não explodir
const ITERATIONS = 4;
const PUSH_SPEED = 1.5; // deslocamento por passo que um empurrão pode dar a um bicho parado
const POP = 2.2; // empurrão que uma junção dá nos vizinhos
const GROW = 0.12; // segundos que um bicho recém-juntado leva para crescer
const SETTLE = 1.2; // idade a partir da qual o bicho conta para a linha
const DANGER_LIMIT = 1.6; // segundos acima da linha até o fim de jogo
const DROP_WEIGHTS = [0.35, 0.3, 0.2, 0.15]; // só os 4 menores são soltos

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

export function createGame(kind = 'cat', rng = Math.random) {
  const state = {
    kind,
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
    warning: null, // { x, level, t }: intruso prestes a cair
    danger: 0,
    over: false,
  };
  state.timer = dropTime(state);
  return state;
}

function makeBody(state, level, x, y, r0) {
  return { id: state.nextId++, level, x, y, px: x, py: y, r: r0, r0, age: 0, angle: 0, rival: false };
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
  state.bodies.push(body);
  state.current = state.next;
  state.next = pickLevel(rng);
  state.aim = clampAim(state.current, x);
  state.cooldown = DROP_COOLDOWN;
  state.drops++;
  state.timer = dropTime(state);
  if (state.drops >= state.rivalAt && !state.warning) {
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
 *  - { type: 'scare', x, y, gained }: intruso espantado por uma junção ao lado
 */
export function step(state, dt = DT) {
  const events = [];
  if (state.over) return events;
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.comboT = Math.max(0, state.comboT - dt);

  const bodies = state.bodies;
  const limits = new Map(); // velocidade máxima de cada bicho ao fim do passo
  for (const b of bodies) {
    b.age += dt;
    const target = RADII[b.level - 1];
    b.r = b.age < GROW ? b.r0 + (target - b.r0) * (b.age / GROW) : target;
    let vx = (b.x - b.px) * DAMP;
    let vy = (b.y - b.py) * DAMP;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_STEP) {
      vx *= MAX_STEP / speed;
      vy *= MAX_STEP / speed;
    }
    b.px = b.x;
    b.py = b.y;
    b.x += vx;
    b.y += vy + GRAVITY * dt * dt;
    b.angle += vx / b.r;
    limits.set(b, Math.max(PUSH_SPEED, Math.hypot(b.x - b.px, b.y - b.py)));
  }

  const dead = new Set();
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

        if (a.level === b.level && !a.rival && !b.rival && d < min + 0.5) {
          dead.add(a);
          dead.add(b);
          const x = (a.x + b.x) / 2;
          const y = (a.y + b.y) / 2;
          if (a.level >= MAX_LEVEL) {
            state.score += ADOPTION_BONUS;
            pops.push({ x, y, r: RADII[MAX_LEVEL - 1] * 1.3, level: 0 });
            events.push({ type: 'adopt', x, y, level: a.level, gained: ADOPTION_BONUS });
          } else {
            const level = a.level + 1;
            const r = RADII[level - 1];
            born.push(makeBody(state, level, Math.min(W - r, Math.max(r, x)), Math.min(H - r, y), a.r));
            state.combo = state.comboT > 0 ? state.combo + 1 : 1;
            state.comboT = COMBO_WINDOW;
            const gained = 2 ** level * state.combo;
            state.score += gained;
            pops.push({ x, y, r, level });
            events.push({ type: 'merge', x, y, level, gained, combo: state.combo });
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
        events.push({ type: 'scare', x: b.x, y: b.y, gained: SCARE_BONUS });
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
  if (state.danger > DANGER_LIMIT) state.over = true;
  return events;
}

/**
 * Física + ritmo da partida: o relógio que solta o bicho sozinho e a queda dos
 * intrusos. Além dos eventos de `step`, devolve { type: 'autodrop' } e
 * { type: 'rival', x }.
 */
export function tick(state, dt = DT, rng = Math.random) {
  const events = step(state, dt);
  if (state.over) return events;

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

  if (canDrop(state)) {
    state.timer -= dt;
    if (state.timer <= 0) {
      drop(state, state.aim, rng);
      events.push({ type: 'autodrop' });
    }
  }
  return events;
}
