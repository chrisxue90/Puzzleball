export type BallColor = 'red' | 'yellow' | 'cyan' | 'violet' | 'orange' | 'lime' | 'pink';
export type Board = Array<BallColor | null>;
export type RandomSource = () => number;

export interface SpawnResult {
  board: Board;
  placed: number[];
  cleared: number[];
  gameOver: boolean;
}

export interface SuccessfulMove extends SpawnResult {
  ok: true;
  reason: null;
  spawned: boolean;
}

export interface FailedMove {
  ok: false;
  reason: 'empty-source' | 'occupied-target' | 'blocked';
  board: Board;
}

export const GAME_RULES_VERSION: number;
export const BOARD_SIZE: number;
export const CELL_COUNT: number;
export const BALL_COLORS: readonly BallColor[];

export function createSeededRandom(seed: number): RandomSource;
export function randomColor(random?: RandomSource): BallColor;
export function createNextColors(count?: number, random?: RandomSource): BallColor[];
export function createEmptyBoard(): Board;
export function createInitialBoard(initialCount?: number, random?: RandomSource): Board;
export function findLineCells(board: Board, origin: number): number[];
export function hasPath(board: Board, from: number, to: number): boolean;
export function scoreForClear(count: number): number;
export function spawnBalls(
  board: Board,
  colors: BallColor[],
  requestedCount: number,
  random?: RandomSource,
): SpawnResult;
export function resolveMove(
  board: Board,
  from: number,
  to: number,
  nextColors: BallColor[],
  spawnCount?: number,
  random?: RandomSource,
): SuccessfulMove | FailedMove;
