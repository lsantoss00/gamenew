import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENES, POWERS, powerCost, recordStat, statValue, TROPHIES, claimTrophies, STAT_NAMES, claimDaily, DAILY_BONUS, STREAK_CAP, dateSeed, challengeKind, finishChallenge, CHALLENGE_REWARD, newMeta, validMeta, coinsForScore, chooseScene,
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

test('bônus diário: uma vez por dia, cresce em dias seguidos e zera se pular um dia', () => {
  const meta = newMeta();
  assert.equal(claimDaily(meta, '2026-02-27'), DAILY_BONUS);
  assert.equal(claimDaily(meta, '2026-02-27'), 0);
  assert.equal(claimDaily(meta, '2026-02-28'), DAILY_BONUS * 2);
  assert.equal(claimDaily(meta, '2026-03-01'), DAILY_BONUS * 3); // vira o mês
  assert.equal(meta.coins, DAILY_BONUS * 6);
  assert.equal(claimDaily(meta, '2026-03-03'), DAILY_BONUS); // pulou o dia 2
  assert.equal(meta.streak.days, 1);
  for (let d = 4; d <= 20; d++) claimDaily(meta, `2026-03-${String(d).padStart(2, '0')}`);
  assert.equal(claimDaily(meta, '2026-03-21'), DAILY_BONUS * STREAK_CAP); // tem teto
});

test('desafio do dia: mesma semente na mesma data, recompensa só na primeira partida', () => {
  assert.equal(dateSeed('2026-11-17'), dateSeed('2026-11-17'));
  assert.notEqual(dateSeed('2026-11-17'), dateSeed('2026-11-18'));
  assert.ok(['cat', 'dog'].includes(challengeKind('2026-11-17')));
  const meta = newMeta();
  assert.equal(finishChallenge(meta, '2026-11-17', 3000), CHALLENGE_REWARD);
  assert.equal(finishChallenge(meta, '2026-11-17', 5000), 0);
  assert.equal(finishChallenge(meta, '2026-11-17', 1000), 0);
  assert.equal(meta.challenge.best, 5000);
  assert.equal(finishChallenge(meta, '2026-11-18', 10), CHALLENGE_REWARD); // dia novo
  assert.deepEqual([meta.challenge.best, meta.coins], [10, CHALLENGE_REWARD * 2]);
});

test('estatísticas somam ou guardam o melhor; troféus pagam uma vez só', () => {
  const meta = newMeta();
  assert.deepEqual(claimTrophies(meta), []);
  recordStat(meta, 'merges');
  recordStat(meta, 'merges', 4);
  recordStat(meta, 'combo', 5);
  recordStat(meta, 'combo', 2);
  assert.deepEqual([statValue(meta, 'merges'), statValue(meta, 'combo'), statValue(meta, 'games')], [5, 5, 0]);

  const combo = TROPHIES.find((t) => t.id === 'combo5');
  assert.deepEqual(claimTrophies(meta).map((t) => t.id), ['combo5']);
  assert.equal(meta.coins, combo.reward);
  assert.deepEqual(claimTrophies(meta), []);

  meta.owned.push('praia', 'neve'); // troféus que olham outras partes da conta
  meta.streak = { last: '2026-01-07', days: 7 };
  assert.deepEqual(claimTrophies(meta).map((t) => t.id).sort(), ['scenes3', 'streak7']);
  assert.equal(new Set(TROPHIES.map((t) => t.id)).size, TROPHIES.length);
  for (const t of TROPHIES) assert.ok(['streak', 'scenes', 'levels', 'stars', 'accs'].includes(t.stat) || STAT_NAMES[t.stat], t.id);
});

test('acessórios: compra uma vez, troca e tira', async () => {
  const { ACCESSORIES, chooseAccessory } = await import('../js/meta.js');
  const meta = newMeta();
  const [first, second] = ACCESSORIES;
  assert.equal(chooseAccessory(meta, first.id), false);
  meta.coins = first.price + second.price;
  assert.equal(chooseAccessory(meta, first.id), true);
  assert.equal(chooseAccessory(meta, second.id), true);
  assert.equal(meta.coins, 0);
  assert.equal(chooseAccessory(meta, first.id), true); // já tem: não cobra
  assert.deepEqual([meta.acc, meta.coins], [first.id, 0]);
  assert.equal(chooseAccessory(meta, null), true);
  assert.equal(meta.acc, null);
});

test('álbum: uma curiosidade por bicho e contagem de aparições', async () => {
  const { FACTS, see, timesSeen } = await import('../js/album.js');
  const { NAMES } = await import('../js/game.js');
  for (const kind of ['cat', 'dog']) {
    assert.equal(FACTS[kind].length, NAMES[kind].length);
    for (const fact of FACTS[kind]) assert.ok(fact.length > 30 && fact.endsWith('.'));
  }
  const meta = newMeta();
  assert.equal(timesSeen(meta, 'dog', 4), 0);
  see(meta, 'dog', 4);
  see(meta, 'dog', 4);
  see(meta, 'cat', 10);
  assert.deepEqual([timesSeen(meta, 'dog', 4), timesSeen(meta, 'cat', 10), timesSeen(meta, 'cat', 4)], [2, 1, 0]);
});
