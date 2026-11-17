import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, createSeededGame, stateRng, drop, step, tick, canDrop, dropTime, shake, bodyAt, removeBody, scareAll, W, H, LINE_Y, RADII, MAX_LEVEL, ADOPTION_BONUS, SCARE_BONUS,
  FIRST_RIVAL, WARNING_TIME, DT,
} from '../js/game.js';

function run(state, seconds) {
  const events = [];
  for (let i = 0; i < seconds / DT; i++) events.push(...step(state));
  return events;
}

function dropLevel(state, level, x) {
  state.current = level;
  state.cooldown = 0;
  return drop(state, x);
}

function body(state, level, x, y) {
  const r = RADII[level - 1];
  const b = { id: state.nextId++, level, x, y, px: x, py: y, r, r0: r, age: 5, angle: 0, rival: false };
  state.bodies.push(b);
  return b;
}

test('jogo novo sorteia só os bichos pequenos', () => {
  for (let i = 0; i < 50; i++) {
    const s = createGame('dog');
    assert.ok(s.current >= 1 && s.current <= 4);
    assert.ok(s.next >= 1 && s.next <= 4);
  }
});

test('bicho solto cai e para no chão, dentro do cercado', () => {
  const s = createGame();
  const b = dropLevel(s, 3, -50); // mira fora: é trazida para dentro
  run(s, 2);
  assert.ok(Math.abs(b.y - (H - b.r)) < 0.5, `y=${b.y}`);
  assert.ok(b.x >= b.r && b.x <= W - b.r);
});

test('há uma pausa entre um bicho e o próximo', () => {
  const s = createGame();
  drop(s, 100);
  assert.equal(canDrop(s), false);
  assert.equal(drop(s, 100), null);
  run(s, 0.5);
  assert.equal(canDrop(s), true);
});

test('dois iguais que se encostam viram o próximo', () => {
  const s = createGame();
  dropLevel(s, 2, 180);
  run(s, 1);
  dropLevel(s, 2, 180);
  const events = run(s, 1.5);
  assert.deepEqual(s.bodies.map((b) => b.level), [3]);
  assert.equal(s.score, 8);
  assert.equal(events.filter((e) => e.type === 'merge').length, 1);
});

test('bichos diferentes não se juntam nem ficam um dentro do outro', () => {
  const s = createGame();
  dropLevel(s, 4, 170);
  run(s, 1);
  dropLevel(s, 2, 190);
  run(s, 3);
  const [a, b] = s.bodies;
  assert.equal(s.bodies.length, 2);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 1);
});

test('dois de nível máximo são adotados', () => {
  const s = createGame();
  const r = RADII[MAX_LEVEL - 1];
  body(s, MAX_LEVEL, r, H - r);
  body(s, MAX_LEVEL, 3 * r - 1, H - r);
  const events = run(s, 0.1);
  assert.equal(s.bodies.length, 0);
  assert.equal(s.score, ADOPTION_BONUS);
  assert.equal(events[0].type, 'adopt');
});

test('uma pilha grande fica estável, sem bicho atravessando o cercado', () => {
  for (const seed0 of [7, 57, 186, 242]) { // sorteios fixos, para o teste dar sempre o mesmo resultado
    let seed = seed0 * 7919;
    const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const s = createGame('cat', rng);
    for (let i = 0; i < 40 && !s.over; i++) {
      drop(s, rng() * W, rng);
      run(s, 0.6);
    }
    run(s, 8); // tempo de sobra para as últimas junções e escorregadas
    for (const b of s.bodies) {
      assert.ok(b.x >= b.r - 0.01 && b.x <= W - b.r + 0.01 && b.y <= H - b.r + 0.01);
      assert.ok(Math.hypot(b.x - b.px, b.y - b.py) < 0.05, `sorteio ${seed0}: pilha ainda se mexendo`);
    }
  }
});

test('fim de jogo quando um bicho fica parado acima da linha', () => {
  const s = createGame();
  let y = H;
  for (const level of [10, 9, 8]) {
    const r = RADII[level - 1];
    body(s, level, W / 2, y - r);
    y -= 2 * r;
  }
  assert.ok(y < LINE_Y);
  run(s, 1);
  assert.equal(s.over, false); // ainda dá tempo de salvar
  run(s, 1);
  assert.equal(s.over, true);
  assert.equal(drop(s, 100), null);
});

test('juntar em sequência vale combo', () => {
  const s = createGame();
  // dois filhotes se juntam ao lado de um gatinho: o novo gatinho junta com ele em seguida
  body(s, 1, 100, H - RADII[0]);
  body(s, 1, 100 + 2 * RADII[0] - 1, H - RADII[0]);
  body(s, 2, 160, H - RADII[1]);
  const events = run(s, 1).filter((e) => e.type === 'merge');
  assert.deepEqual(events.map((e) => [e.level, e.combo]), [[2, 1], [3, 2]]);
  assert.equal(s.score, 4 + 8 * 2);
});

test('intruso não junta, e vai embora quando há uma junção encostada nele', () => {
  const s = createGame();
  const r = RADII[1];
  const rival = body(s, 2, 60, H - r);
  rival.rival = true;
  body(s, 2, 60 + 2 * r - 1, H - r); // mesmo nível, encostado: não junta com intruso
  run(s, 0.5);
  assert.equal(s.bodies.length, 2);
  assert.equal(s.score, 0);

  dropLevel(s, 2, 60 + 2 * r);
  const events = run(s, 1.5);
  assert.equal(events.filter((e) => e.type === 'scare').length, 1);
  assert.deepEqual(s.bodies.map((b) => [b.level, b.rival]), [[3, false]]);
  assert.equal(s.score, 8 + SCARE_BONUS);
});

test('o relógio solta o bicho sozinho, na mira atual', () => {
  const s = createGame();
  s.aim = 80;
  const t = dropTime(s);
  for (let i = 0; i < (t - 0.1) / DT; i++) tick(s);
  assert.equal(s.bodies.length, 0);
  for (let i = 0; i < 0.2 / DT; i++) tick(s);
  assert.equal(s.bodies.length, 1);
  assert.ok(Math.abs(s.bodies[0].x - 80) <= 1);
  assert.ok(dropTime(s) < t);
});

test('depois de alguns bichos cai um intruso, com aviso antes', () => {
  const s = createGame();
  for (let i = 0; i < FIRST_RIVAL; i++) {
    assert.equal(s.warning, null);
    s.cooldown = 0;
    drop(s, 40 + i * 50);
  }
  assert.ok(s.warning);
  const events = [];
  for (let i = 0; i < (WARNING_TIME + 0.05) / DT; i++) events.push(...tick(s));
  assert.equal(events.filter((e) => e.type === 'rival').length, 1);
  assert.equal(s.bodies.filter((b) => b.rival).length, 1);
  assert.equal(s.warning, null);
});

test('poder de sacudir: a pilha pula, não conta para a linha no ar e volta a assentar', () => {
  const s = createGame();
  const a = body(s, 5, 100, H - RADII[4]);
  const b = body(s, 3, 250, H - RADII[2]);
  assert.equal(shake(s), true);
  run(s, 0.15);
  assert.ok(a.y < H - RADII[4] - 5 && b.y < H - RADII[2] - 5, 'os bichos deveriam ter pulado');
  run(s, 3);
  assert.equal(s.over, false);
  assert.ok(Math.abs(a.y - (H - a.r)) < 0.5 && Math.abs(b.y - (H - b.r)) < 0.5);
  assert.equal(shake(createGame()), false); // nada para sacudir
});

test('poderes de tirar um bicho e de espantar todos os intrusos', () => {
  const s = createGame();
  const a = body(s, 4, 100, 400);
  const r1 = body(s, 2, 200, 400);
  const r2 = body(s, 1, 300, 400);
  r1.rival = r2.rival = true;
  assert.equal(bodyAt(s, 105, 395), a);
  assert.equal(bodyAt(s, 100, 100), null);
  assert.equal(removeBody(s, a.id), a);
  assert.equal(removeBody(s, a.id), null);
  assert.deepEqual(scareAll(s).map((b) => b.id), [r1.id, r2.id]);
  assert.equal(s.bodies.length, 0);
});

test('partidas com a mesma semente sorteiam os mesmos bichos e intrusos', () => {
  const play = (seed) => {
    const s = createSeededGame('cat', seed);
    const rng = stateRng(s);
    const seen = [];
    for (let i = 0; i < 30; i++) {
      seen.push(s.current);
      s.cooldown = 0;
      drop(s, 180, rng);
      if (s.warning) {
        seen.push(`intruso ${s.warning.level} em ${Math.round(s.warning.x)}`);
        s.warning = null;
      }
    }
    return seen.join();
  };
  assert.equal(play(1234), play(1234));
  assert.notEqual(play(1234), play(4321));
  const saved = JSON.parse(JSON.stringify(createSeededGame('dog', 99))); // a semente sobrevive ao salvar
  assert.ok(Number.isInteger(saved.seed) && saved.seed > 0);
});

function special(state, kind, level, x, y) {
  const b = body(state, level, x, y);
  b.special = kind;
  if (kind === 'sleepy') b.sleep = 6;
  return b;
}

test('curinga junta com qualquer bicho e vira o próximo dele', () => {
  const s = createGame();
  const r = RADII[4];
  body(s, 5, 100, H - r);
  special(s, 'wild', 2, 100, H - 2 * r - RADII[1] - 2); // cai em cima do bicho grande
  const events = run(s, 0.5).filter((e) => e.type === 'merge');
  assert.equal(events.length, 1);
  assert.ok(events[0].wild);
  assert.deepEqual(s.bodies.map((b) => b.level), [6]);
});

test('dourado avisa que rendeu moedas ao ser juntado', () => {
  const s = createGame();
  special(s, 'gold', 3, 100, H - RADII[2]);
  body(s, 3, 100 + 2 * RADII[2] - 1, H - RADII[2]);
  const [merge] = run(s, 0.5).filter((e) => e.type === 'merge');
  assert.equal(merge.gold, true);
});

test('dorminhoco só junta depois de acordar', () => {
  const s = createGame();
  special(s, 'sleepy', 2, 100, H - RADII[1]);
  body(s, 2, 100, H - 3 * RADII[1] - 2); // cai e fica em cima do dorminhoco
  run(s, 3);
  assert.equal(s.bodies.length, 2);
  run(s, 4);
  assert.deepEqual(s.bodies.map((b) => b.level), [3]);
});

test('latido empurra os vizinhos uma vez e vira um bicho comum', () => {
  const s = createGame();
  const near = body(s, 1, 150, H - RADII[0]);
  const far = body(s, 1, 340, H - RADII[0]);
  const dog = special(s, 'bark', 3, 190, H - RADII[2] - 40);
  const events = run(s, 0.6).filter((e) => e.type === 'bark');
  assert.equal(events.length, 1);
  assert.equal(dog.special, null);
  assert.ok(near.x < 140, `o vizinho deveria ter sido empurrado (x=${near.x})`);
  assert.ok(Math.abs(far.x - 340) < 1, 'quem está longe não se mexe');
});

test('especiais só aparecem depois de alguns bichos e só se a regra estiver ligada', () => {
  const count = (rules) => {
    let n = 0;
    for (let g = 0; g < 20; g++) {
      const s = createSeededGame('cat', g + 1, rules);
      const rng = stateRng(s);
      for (let i = 0; i < 60; i++) {
        if (i < 8) assert.equal(s.currentSpecial, null);
        if (s.currentSpecial) n++;
        s.cooldown = 0;
        drop(s, 180, rng);
      }
    }
    return n;
  };
  assert.ok(count({}) > 20);
  assert.equal(count({ specials: false }), 0);
});

function startWeather(s, type, dir = 1) {
  s.drops = s.weatherAt;
  let rngValue = { wind: 0, rain: 0.4, quake: 0.8 }[type];
  const events = tick(s, DT, () => rngValue);
  s.weather.dir = dir;
  rngValue = 0.5;
  for (let i = 0; i < 2.1 / DT; i++) events.push(...tick(s, DT, () => 0.5));
  return events;
}

test('eventos no quintal: aviso antes, e só com a regra ligada', () => {
  const s = createGame('cat', Math.random, { clock: false });
  const events = startWeather(s, 'wind');
  assert.deepEqual(events.filter((e) => e.type.startsWith('weather')).map((e) => e.type), ['weather-warn', 'weather-start']);
  const off = createGame('cat', Math.random, { clock: false, events: false });
  off.drops = off.weatherAt;
  tick(off, DT);
  assert.equal(off.weather, null);
});

test('ventania empurra a pilha para o lado do vento e depois passa', () => {
  const s = createGame('cat', Math.random, { clock: false, rivals: false });
  const a = body(s, 4, 150, H - RADII[3]);
  startWeather(s, 'wind', 1);
  for (let i = 0; i < 2 / DT; i++) tick(s, DT, () => 0.5);
  assert.ok(a.x > 200, `deveria ter ido para a direita (x=${a.x})`);
  const events = [];
  for (let i = 0; i < 4 / DT; i++) events.push(...tick(s, DT, () => 0.5));
  assert.ok(events.some((e) => e.type === 'weather-end'));
  assert.equal(s.weather, null);
});

test('chuva encolhe os bichos e eles voltam ao tamanho quando seca', () => {
  const s = createGame('cat', Math.random, { clock: false, rivals: false });
  const a = body(s, 5, 150, H - RADII[4]);
  startWeather(s, 'rain');
  for (let i = 0; i < 3 / DT; i++) tick(s, DT, () => 0.5);
  assert.ok(a.r < RADII[4] * 0.9, `encolheu pouco (r=${a.r})`);
  for (let i = 0; i < 10 / DT; i++) tick(s, DT, () => 0.5);
  assert.equal(s.weather, null);
  assert.ok(Math.abs(a.r - RADII[4]) < 0.01);
});

test('tremor sacode a pilha sem contar para a linha', () => {
  const s = createGame('cat', Math.random, { clock: false, rivals: false });
  let y = H;
  for (const level of [10, 9, 8]) { // pilha que passa da linha
    body(s, level, W / 2, y - RADII[level - 1]);
    y -= 2 * RADII[level - 1];
  }
  s.weather = { type: 'quake', warn: 0, t: 2.4, dir: 1, kick: 0 };
  const events = [];
  for (let i = 0; i < 2.3 / DT; i++) events.push(...tick(s, DT, () => 0.5));
  assert.ok(events.filter((e) => e.type === 'quake-kick').length >= 3);
  assert.equal(s.over, false, 'durante o tremor a pilha não deveria contar');
  for (let i = 0; i < 4 / DT; i++) tick(s, DT, () => 0.5);
  assert.equal(s.over, true, 'depois do tremor a pilha alta volta a contar');
});
