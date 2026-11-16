import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, move, canMove, SIZE, MAX_LEVEL, ADOPTION_BONUS, SCARE_GAP } from '../js/game.js';

function board(tiles) {
  return {
    size: SIZE,
    score: 0,
    over: false,
    nextId: tiles.length + 1,
    tiles: tiles.map(([kind, level, r, c], i) => ({ id: i + 1, kind, level, r, c })),
  };
}

const byId = (s, id) => s.tiles.find((t) => t.id === id);

test('jogo novo começa com um gato e um cachorro', () => {
  const s = createGame();
  assert.deepEqual(s.tiles.map((t) => t.kind).sort(), ['cat', 'dog']);
});

test('bichos iguais se juntam e sobem de nível', () => {
  const s = board([['cat', 1, 0, 1], ['cat', 1, 0, 3]]);
  const res = move(s, 'left');
  assert.equal(res.moved, true);
  assert.deepEqual(res.merged, [1]);
  assert.deepEqual(res.removed, [{ id: 2, r: 0, c: 0 }]);
  assert.equal(byId(s, 1).level, 2);
  assert.equal(byId(s, 1).c, 0);
  assert.equal(s.score, 4);
  assert.equal(s.tiles.length, 2); // o que juntou + o novo
});

test('gato não junta com cachorro', () => {
  const s = board([['cat', 1, 2, 0], ['dog', 1, 2, 1]]);
  const res = move(s, 'left');
  assert.equal(res.moved, false);
  assert.equal(res.spawned, null);
  assert.equal(s.tiles.length, 2);
});

test('bicho bem maior espanta o menor da outra espécie', () => {
  // o maior está parado e o menor desliza até ele
  let s = board([['cat', 1 + SCARE_GAP, 0, 0], ['dog', 1, 0, 2]]);
  let res = move(s, 'left');
  assert.equal(res.scared.length, 1);
  assert.equal(byId(s, 2), undefined);
  assert.equal(byId(s, 1).c, 0);
  assert.equal(s.score, 0);

  // o maior desliza e toma a casa do menor
  s = board([['dog', 1, 0, 0], ['cat', 1 + SCARE_GAP, 0, 3]]);
  res = move(s, 'left');
  assert.equal(byId(s, 1), undefined);
  assert.equal(byId(s, 2).c, 0);

  // diferença pequena: ninguém se espanta
  s = board([['dog', 1, 0, 0], ['cat', SCARE_GAP, 0, 1]]);
  assert.equal(move(s, 'left').moved, false);
});

test('um bicho só junta uma vez por jogada', () => {
  const s = board([['dog', 1, 0, 0], ['dog', 1, 0, 1], ['dog', 1, 0, 2], ['dog', 1, 0, 3]]);
  move(s, 'right');
  const row = s.tiles.filter((t) => t.id <= 4).sort((a, b) => a.c - b.c);
  assert.deepEqual(row.map((t) => [t.level, t.c]), [[2, 2], [2, 3]]);
});

test('funciona nas quatro direções', () => {
  for (const [dir, r, c] of [['up', 0, 2], ['down', 3, 2], ['left', 2, 0], ['right', 2, 3]]) {
    const s = board([['cat', 3, 2, 2]]);
    move(s, dir);
    assert.deepEqual([byId(s, 1).r, byId(s, 1).c], [r, c], dir);
  }
});

test('dois de nível máximo são adotados e liberam a casa', () => {
  const s = board([['cat', MAX_LEVEL, 0, 0], ['cat', MAX_LEVEL, 0, 1], ['dog', 1, 0, 2]]);
  const res = move(s, 'left');
  assert.equal(res.adopted.length, 1);
  assert.equal(s.score, ADOPTION_BONUS);
  assert.equal(byId(s, 1), undefined);
  assert.equal(byId(s, 2), undefined);
  assert.equal(byId(s, 3).c, 0);
});

test('fim de jogo quando a grade enche sem jogada possível', () => {
  const tiles = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) tiles.push([(r + c) % 2 ? 'cat' : 'dog', 1, r, c]);
  }
  const s = board(tiles);
  assert.equal(canMove(s), false);
  s.tiles[0].kind = 'cat';
  assert.equal(canMove(s), true);
  s.tiles[0].kind = 'dog';
  s.tiles[0].level = 1 + SCARE_GAP; // ainda dá para espantar um vizinho
  assert.equal(canMove(s), true);
});
