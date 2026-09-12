import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CELL_COUNT,
  createEmptyBoard,
  createInitialBoard,
  createSeededRandom,
  findLineCells,
  hasPath,
  resolveMove,
  scoreForClear,
} from '../wechat-game/shared/game-core.js';

test('initial board contains five balls in deterministic positions', () => {
  const first = createInitialBoard(5, createSeededRandom(20260912));
  const second = createInitialBoard(5, createSeededRandom(20260912));
  assert.equal(first.length, CELL_COUNT);
  assert.equal(first.filter(Boolean).length, 5);
  assert.deepEqual(first, second);
});

test('pathfinding allows orthogonal empty routes and rejects sealed targets', () => {
  const board = createEmptyBoard();
  board[0] = 'red';
  assert.equal(hasPath(board, 0, 10), true);

  board[1] = 'yellow';
  board[9] = 'yellow';
  board[11] = 'yellow';
  board[19] = 'yellow';
  assert.equal(hasPath(board, 0, 10), false);
});

test('line detection joins horizontal, vertical and diagonal runs', () => {
  const horizontal = createEmptyBoard();
  [18, 19, 20, 21, 22].forEach((cell) => { horizontal[cell] = 'cyan'; });
  assert.deepEqual(findLineCells(horizontal, 20), [18, 19, 20, 21, 22]);

  const diagonal = createEmptyBoard();
  [0, 10, 20, 30, 40].forEach((cell) => { diagonal[cell] = 'pink'; });
  assert.deepEqual(findLineCells(diagonal, 20), [0, 10, 20, 30, 40]);
});

test('a direct five-ball move clears without spawning new balls', () => {
  const board = createEmptyBoard();
  [0, 1, 2, 3].forEach((cell) => { board[cell] = 'lime'; });
  board[13] = 'lime';

  const result = resolveMove(board, 13, 4, ['red', 'yellow', 'cyan'], 3, () => 0);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.spawned, false);
  assert.deepEqual(result.cleared, [0, 1, 2, 3, 4]);
  assert.equal(result.board.filter(Boolean).length, 0);
});

test('a non-clearing move spawns the requested next colors', () => {
  const board = createEmptyBoard();
  board[0] = 'red';
  const result = resolveMove(board, 0, 1, ['yellow', 'cyan', 'pink'], 3, () => 0);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.spawned, true);
  assert.deepEqual(result.placed, [0, 2, 3]);
  assert.equal(result.board[0], 'yellow');
  assert.equal(result.board[2], 'cyan');
  assert.equal(result.board[3], 'pink');
});

test('score progression matches the shared rules', () => {
  assert.equal(scoreForClear(4), 0);
  assert.equal(scoreForClear(5), 10);
  assert.equal(scoreForClear(6), 15);
  assert.equal(scoreForClear(8), 25);
});
