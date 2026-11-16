// Regras do jogo, sem nada de tela: dá para testar direto no Node.

export const SIZE = 4;
export const MAX_LEVEL = 10;
export const KINDS = ['cat', 'dog'];
export const ADOPTION_BONUS = 5000;
// Diferença de nível a partir da qual um bicho espanta o da outra espécie.
export const SCARE_GAP = 2;

export const NAMES = {
  cat: ['Filhotinho', 'Gatinho', 'Malhado', 'Siamês', 'Persa', 'Lince', 'Jaguatirica', 'Onça', 'Tigre', 'Leão'],
  dog: ['Filhotinho', 'Caramelo', 'Salsicha', 'Beagle', 'Border Collie', 'Husky', 'Pastor', 'Dobermann', 'São Bernardo', 'Lobo'],
};

export function createGame(rng = Math.random) {
  const state = { size: SIZE, tiles: [], score: 0, nextId: 1, over: false };
  spawn(state, rng, 'cat');
  spawn(state, rng, 'dog');
  return state;
}

function emptyCells(state) {
  const taken = new Set(state.tiles.map((t) => t.r * state.size + t.c));
  const cells = [];
  for (let i = 0; i < state.size * state.size; i++) {
    if (!taken.has(i)) cells.push(i);
  }
  return cells;
}

export function spawn(state, rng = Math.random, kind) {
  const cells = emptyCells(state);
  if (cells.length === 0) return null;
  const cell = cells[Math.floor(rng() * cells.length)];
  const tile = {
    id: state.nextId++,
    kind: kind ?? KINDS[Math.floor(rng() * KINDS.length)],
    level: rng() < 0.9 ? 1 : 2,
    r: Math.floor(cell / state.size),
    c: cell % state.size,
  };
  state.tiles.push(tile);
  return tile;
}

// Posição p (0 = borda para onde os bichos deslizam) da linha i, em cada direção.
function cellAt(dir, i, p, n) {
  switch (dir) {
    case 'left': return [i, p];
    case 'right': return [i, n - 1 - p];
    case 'up': return [p, i];
    case 'down': return [n - 1 - p, i];
    default: throw new Error(`direção inválida: ${dir}`);
  }
}

function slotOf(dir, tile, n) {
  switch (dir) {
    case 'left': return [tile.r, tile.c];
    case 'right': return [tile.r, n - 1 - tile.c];
    case 'up': return [tile.c, tile.r];
    case 'down': return [tile.c, n - 1 - tile.r];
    default: throw new Error(`direção inválida: ${dir}`);
  }
}

export function canMove(state) {
  const n = state.size;
  if (state.tiles.length < n * n) return true;
  const grid = new Map(state.tiles.map((t) => [t.r * n + t.c, t]));
  for (const t of state.tiles) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r = t.r + dr;
      const c = t.c + dc;
      if (r >= n || c >= n) continue;
      const o = grid.get(r * n + c);
      if (!o) continue;
      if (o.kind === t.kind ? o.level === t.level : Math.abs(o.level - t.level) >= SCARE_GAP) return true;
    }
  }
  return false;
}

/**
 * Desliza todos os bichos na direção dada. Altera `state` e devolve o que
 * aconteceu, para a tela animar:
 *  - removed: bichos que sumiram, com a casa para onde deslizaram antes de sumir
 *  - merged: ids dos bichos que subiram de nível
 *  - scared: ids (também em removed) dos bichos espantados por um bem maior da outra espécie
 *  - adopted: casas onde dois bichos de nível máximo se juntaram e foram adotados
 *  - spawned: o bicho novo que apareceu (ou null)
 */
export function move(state, dir, rng = Math.random) {
  const n = state.size;
  const result = { moved: false, gained: 0, removed: [], merged: [], adopted: [], scared: [], spawned: null };
  if (state.over) return result;

  const lines = Array.from({ length: n }, () => []);
  for (const t of state.tiles) {
    const [i, p] = slotOf(dir, t, n);
    lines[i].push({ t, p });
  }

  const gone = new Set();
  for (let i = 0; i < n; i++) {
    const line = lines[i].sort((a, b) => a.p - b.p);
    let slot = 0;
    let last = null; // último bicho parado nesta linha que ainda pode juntar
    for (const { t, p } of line) {
      if (last && last.kind === t.kind && last.level === t.level) {
        gone.add(t.id);
        result.removed.push({ id: t.id, r: last.r, c: last.c });
        if (last.level >= MAX_LEVEL) {
          gone.add(last.id);
          result.removed.push({ id: last.id, r: last.r, c: last.c });
          result.adopted.push({ r: last.r, c: last.c, kind: last.kind });
          result.gained += ADOPTION_BONUS;
          slot--; // a casa ficou livre
        } else {
          last.level++;
          result.merged.push(last.id);
          result.gained += 2 ** last.level;
        }
        last = null;
        result.moved = true;
        continue;
      }
      // Espécies diferentes: o bicho bem maior espanta o menor do quintal.
      if (last && last.kind !== t.kind && Math.abs(last.level - t.level) >= SCARE_GAP) {
        const [big, small] = last.level > t.level ? [last, t] : [t, last];
        gone.add(small.id);
        result.removed.push({ id: small.id, r: last.r, c: last.c });
        result.scared.push(small.id);
        big.r = last.r;
        big.c = last.c;
        last = big;
        result.moved = true;
        continue;
      }
      const [r, c] = cellAt(dir, i, slot, n);
      if (p !== slot) result.moved = true;
      t.r = r;
      t.c = c;
      slot++;
      last = t;
    }
  }

  if (!result.moved) return result;

  state.tiles = state.tiles.filter((t) => !gone.has(t.id));
  state.score += result.gained;
  result.spawned = spawn(state, rng);
  state.over = !canMove(state);
  return result;
}
