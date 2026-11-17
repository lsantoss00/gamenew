import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENES, POWERS, powerCost, newMeta, validMeta, coinsForScore, chooseScene,
  today, dailyMissions, validMissions, missionText, progressMissions,
} from '../js/meta.js';

test('moedas: 1 a cada 50 pontos', () => {
  assert.equal(coinsForScore(49), 0);
  assert.equal(coinsForScore(6025), 120);
});

test('loja: só compra com moedas suficientes, e não cobra duas vezes', () => {
  const meta = newMeta();
  const praia = SCENES.find((s) => s.id === 'praia');
  meta.coins = praia.price - 1;
  assert.equal(chooseScene(meta, 'praia'), false);
  assert.equal(meta.scene, 'quintal');
  assert.equal(meta.coins, praia.price - 1);

  meta.coins = praia.price + 30;
  assert.equal(chooseScene(meta, 'praia'), true);
  assert.deepEqual([meta.coins, meta.scene], [30, 'praia']);

  assert.equal(chooseScene(meta, 'quintal'), true); // voltar ao que já tem é de graça
  assert.equal(chooseScene(meta, 'praia'), true);
  assert.equal(meta.coins, 30);
  assert.equal(chooseScene(meta, 'lua'), false);
  assert.ok(validMeta(meta));
});

test('data de hoje no fuso do aparelho', () => {
  assert.equal(today(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('missões do dia: 3, de tipos diferentes, iguais na mesma data', () => {
  const seen = new Set();
  for (let d = 1; d <= 28; d++) {
    const date = `2026-11-${String(d).padStart(2, '0')}`;
    const m = dailyMissions(date);
    assert.ok(validMissions(m));
    assert.equal(new Set(m.list.map((x) => x.type)).size, 3);
    assert.deepEqual(dailyMissions(date), m);
    for (const x of m.list) assert.ok(missionText(x).length > 5);
    seen.add(m.list.map((x) => x.type).sort().join());
  }
  assert.ok(seen.size > 10, `pouca variedade: ${seen.size} combinações em 28 dias`);
});

test('missões que somam, que guardam o melhor valor e a de espécie', () => {
  const missions = {
    date: 'x',
    list: [
      { type: 'scare', goal: 2, reward: 70, progress: 0, done: false },
      { type: 'combo', goal: 3, reward: 60, progress: 0, done: false },
      { type: 'kind', kind: 'dog', goal: 1, reward: 50, progress: 0, done: false },
    ],
  };
  assert.deepEqual(progressMissions(missions, 'scare'), []);
  assert.deepEqual(progressMissions(missions, 'combo', 2), []);
  assert.deepEqual(progressMissions(missions, 'combo', 1), []); // não regride
  assert.equal(missions.list[1].progress, 2);
  assert.deepEqual(progressMissions(missions, 'kind', 'cat'), []);

  assert.deepEqual(progressMissions(missions, 'scare').map((m) => m.reward), [70]);
  assert.deepEqual(progressMissions(missions, 'scare'), []); // concluída só uma vez
  assert.deepEqual(progressMissions(missions, 'combo', 5).map((m) => m.progress), [3]);
  assert.deepEqual(progressMissions(missions, 'kind', 'dog').length, 1);
  assert.ok(missions.list.every((m) => m.done));
});

test('poderes ficam mais caros a cada uso na mesma partida', () => {
  const { id, price } = POWERS[0];
  assert.deepEqual([0, 1, 2].map((used) => powerCost(id, used)), [price, price * 2, price * 3]);
});
