import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, drop, step, canDrop, W, H, LINE_Y, RADII, MAX_LEVEL, ADOPTION_BONUS, DT,
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
  const b = { id: state.nextId++, level, x, y, px: x, py: y, r, r0: r, age: 5, angle: 0 };
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
  const s = createGame();
  let seed = 7;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 40 && !s.over; i++) {
    drop(s, rng() * W, rng);
    run(s, 0.6);
  }
  run(s, 2);
  for (const b of s.bodies) {
    assert.ok(b.x >= b.r - 0.01 && b.x <= W - b.r + 0.01 && b.y <= H - b.r + 0.01);
    assert.ok(Math.hypot(b.x - b.px, b.y - b.py) < 0.5, 'pilha ainda se mexendo');
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
