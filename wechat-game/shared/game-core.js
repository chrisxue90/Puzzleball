export const GAME_RULES_VERSION = 1;
export const BOARD_SIZE = 9;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const BALL_COLORS = Object.freeze([
  'red',
  'yellow',
  'cyan',
  'violet',
  'orange',
  'lime',
  'pink',
]);

const LINE_DIRECTIONS = Object.freeze([
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]);

const PATH_DIRECTIONS = Object.freeze([
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]);

function chooseIndex(length, random) {
  return Math.min(length - 1, Math.floor(random() * length));
}

export function createSeededRandom(seed) {
  let value = seed >>> 0;
  return function seededRandom() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomColor(random = Math.random) {
  return BALL_COLORS[chooseIndex(BALL_COLORS.length, random)];
}

export function createNextColors(count = 3, random = Math.random) {
  return Array.from({ length: count }, () => randomColor(random));
}

export function createEmptyBoard() {
  return Array(CELL_COUNT).fill(null);
}

export function createInitialBoard(initialCount = 5, random = Math.random) {
  const board = createEmptyBoard();
  const emptyIndexes = Array.from({ length: CELL_COUNT }, (_, index) => index);
  const count = Math.min(initialCount, CELL_COUNT);

  for (let index = 0; index < count; index += 1) {
    const choice = chooseIndex(emptyIndexes.length, random);
    const [cell] = emptyIndexes.splice(choice, 1);
    board[cell] = randomColor(random);
  }

  return board;
}

export function findLineCells(board, origin) {
  const color = board[origin];
  if (!color) return [];

  const originRow = Math.floor(origin / BOARD_SIZE);
  const originColumn = origin % BOARD_SIZE;
  const found = new Set();

  for (const [rowStep, columnStep] of LINE_DIRECTIONS) {
    const run = [origin];
    for (const sign of [-1, 1]) {
      let row = originRow + rowStep * sign;
      let column = originColumn + columnStep * sign;

      while (
        row >= 0
        && row < BOARD_SIZE
        && column >= 0
        && column < BOARD_SIZE
        && board[row * BOARD_SIZE + column] === color
      ) {
        run.push(row * BOARD_SIZE + column);
        row += rowStep * sign;
        column += columnStep * sign;
      }
    }

    if (run.length >= 5) run.forEach((cell) => found.add(cell));
  }

  return [...found].sort((left, right) => left - right);
}

export function hasPath(board, from, to) {
  if (from === to || !board[from] || board[to]) return false;

  const queue = [from];
  const seen = new Set([from]);
  let cursor = 0;

  while (cursor < queue.length) {
    const current = queue[cursor];
    cursor += 1;
    const row = Math.floor(current / BOARD_SIZE);
    const column = current % BOARD_SIZE;

    for (const [rowStep, columnStep] of PATH_DIRECTIONS) {
      const nextRow = row + rowStep;
      const nextColumn = column + columnStep;
      if (
        nextRow < 0
        || nextRow >= BOARD_SIZE
        || nextColumn < 0
        || nextColumn >= BOARD_SIZE
      ) continue;

      const next = nextRow * BOARD_SIZE + nextColumn;
      if (next === to) return true;
      if (!board[next] && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return false;
}

export function scoreForClear(count) {
  if (count < 5) return 0;
  return 10 + (count - 5) * 5;
}

export function spawnBalls(board, colors, requestedCount, random = Math.random) {
  const nextBoard = [...board];
  const palette = Array.isArray(colors) && colors.length ? colors : createNextColors(3, random);
  const emptyIndexes = nextBoard
    .map((cell, index) => (cell ? -1 : index))
    .filter((index) => index >= 0);
  const placed = [];
  const amount = Math.min(requestedCount, emptyIndexes.length);

  for (let index = 0; index < amount; index += 1) {
    const choice = chooseIndex(emptyIndexes.length, random);
    const [cell] = emptyIndexes.splice(choice, 1);
    nextBoard[cell] = palette[index % palette.length];
    placed.push(cell);
  }

  const cleared = new Set();
  placed.forEach((cell) => {
    findLineCells(nextBoard, cell).forEach((lineCell) => cleared.add(lineCell));
  });
  cleared.forEach((cell) => { nextBoard[cell] = null; });

  return {
    board: nextBoard,
    placed,
    cleared: [...cleared].sort((left, right) => left - right),
    gameOver: !nextBoard.includes(null),
  };
}

export function resolveMove(
  board,
  from,
  to,
  nextColors,
  spawnCount = 3,
  random = Math.random,
) {
  if (!board[from]) {
    return { ok: false, reason: 'empty-source', board };
  }
  if (board[to]) {
    return { ok: false, reason: 'occupied-target', board };
  }
  if (!hasPath(board, from, to)) {
    return { ok: false, reason: 'blocked', board };
  }

  const movedBoard = [...board];
  movedBoard[to] = movedBoard[from];
  movedBoard[from] = null;
  const directClear = findLineCells(movedBoard, to);

  if (directClear.length) {
    directClear.forEach((cell) => { movedBoard[cell] = null; });
    return {
      ok: true,
      reason: null,
      board: movedBoard,
      placed: [],
      cleared: directClear,
      spawned: false,
      gameOver: false,
    };
  }

  const spawned = spawnBalls(movedBoard, nextColors, spawnCount, random);
  return {
    ok: true,
    reason: null,
    board: spawned.board,
    placed: spawned.placed,
    cleared: spawned.cleared,
    spawned: true,
    gameOver: spawned.gameOver,
  };
}
