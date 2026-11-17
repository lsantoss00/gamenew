import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeededGame, stateRng, setGoal, tick, drop, canDrop, starsFor, H, RADII, DT } from '../js/game.js';
import { LEVEL_COUNT, levelSpec, goalText, goalProgress, levelUnlocked, finishLevel, totalStars } from '../js/levels.js';
import { newMeta } from '../js/meta.js';

test('as 30 fases têm objetivo, limite de bichos e sorteio próprios', () => {
  const seeds = new Set();
  for (let n = 1; n <= LEVEL_COUNT; n++) {
    const s = levelSpec(n);
    assert.ok(s.drops >= 10 && s.goal.value > 0, `fase ${n}`);
    seeds.add(s.seed);
    assert.ok(goalText(s.goal, 'cat', s.drops).length > 10);
  }
  assert.equal(seeds.size, LEVEL_COUNT);
  assert.deepEqual([1, 2, 3].map((n) => levelSpec(n).rules.clock), [false, false, false]); // começo sem pressão
  assert.equal(levelSpec(LEVEL_COUNT).rules.events, true);
});

test('textos dos objetivos', () => {
  assert.equal(goalText({ type: 'reach', value: 8 }, 'cat', 90), 'Consiga uma Pantera com 90 bichos');
  assert.equal(goalText({ type: 'reach', value: 4 }, 'dog'), 'Consiga um Beagle');
  assert.equal(goalProgress({ type: 'score', value: 2000, progress: 150 }), '150/2.000');
});

test('estrelas pela quantidade de bichos usados', () => {
  assert.deepEqual([12, 16, 20].map((used) => starsFor(used, 20)), [3, 2, 1]);
});

test('fase vencida: para na hora e dá estrelas', () => {
  const s = setGoal(createSeededGame('cat', 5, { clock: false, rivals: false, specials: false, events: false }), { type: 'merges', value: 1 }, 10);
  s.current = 1;
  drop(s, 100);
  for (let i = 0; i < 1 / DT; i++) tick(s);
  s.cooldown = 0;
  s.current = 1;
  drop(s, 100);
  const events = [];
  for (let i = 0; i < 2 / DT; i++) events.push(...tick(s));
  assert.deepEqual([s.won, s.overReason, s.stars], [true, 'won', 3]);
  assert.equal(events.filter((e) => e.type === 'won').length, 1);
});

test('fase perdida quando acabam os bichos e a pilha assenta', () => {
  const s = setGoal(createSeededGame('cat', 5, { clock: false, rivals: false, specials: false, events: false }), { type: 'score', value: 99999 }, 3);
  const rng = stateRng(s);
  for (let k = 0; k < 3; k++) {
    s.cooldown = 0;
    drop(s, 40 + k * 140, rng);
  }
  assert.equal(canDrop(s), false, 'sem bichos sobrando');
  for (let i = 0; i < 3 / DT; i++) tick(s);
  assert.equal(s.over, false, 'ainda esperando a pilha assentar');
  for (let i = 0; i < 2 / DT; i++) tick(s);
  assert.deepEqual([s.over, s.won, s.overReason], [true, false, 'drops']);
});

test('progresso: libera a próxima fase e paga só o que é novo', () => {
  const meta = newMeta();
  assert.equal(levelUnlocked(meta, 2), false);
  const first = finishLevel(meta, 1, 1);
  assert.equal(first, 25 + 15);
  assert.equal(levelUnlocked(meta, 2), true);
  assert.equal(finishLevel(meta, 1, 1), 0); // de novo, sem estrela nova
  assert.equal(finishLevel(meta, 1, 3), 30); // duas estrelas novas
  assert.equal(finishLevel(meta, 1, 2), 0); // pior resultado não tira estrela
  assert.deepEqual([meta.levels[1], totalStars(meta), meta.coins], [3, 3, 70]);
});
