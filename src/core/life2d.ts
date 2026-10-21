import { CONWAY, type Rule } from './rule';

// The whole 2D Game of Life. Order: board shape → create → index → count neighbors → step → count alive.
// core/life3d.ts uses the same order. Compare the two files side by side to see what changes in 3D.

/** Cell states. They are numbers because they go into a Uint8Array */
export const DEAD = 0;
export const ALIVE = 1;

/**
 * The board. Cells are in a 1D array, row by row (y * width + x).
 * This is faster to create and copy than a 2D array, and the draw loop can use it as is.
 */
export type Grid = {
  width: number;
  height: number;
  cells: Uint8Array;
};

/**
 * Creates a board with all cells dead.
 *
 * @param width  Number of cells across
 * Creates a board with all cells dead.
 */
export function createGrid(width: number, height: number): Grid {
  return { width, height, cells: new Uint8Array(width * height) };
}

/**
 * Creates a board with random live cells.
 *
 * @param width   Number of cells across
 * @param height  Number of cells down
 * @param density Chance (0–1) that a cell is alive. About 12% keeps moving for a long time and looks good
 * @param random  Returns a random number in [0, 1). Tests pass their own to get the same result every time
 */
export function randomGrid(
  width: number,
  height: number,
  density = 0.12,
  random: () => number = Math.random,
): Grid {
  const grid = createGrid(width, height);
  for (let i = 0; i < grid.cells.length; i++) {
    grid.cells[i] = random() < density ? ALIVE : DEAD;
  }
  return grid;
}

/**
 * Gets the array index for (x, y).
 * The edges connect to the other side (a torus), so x and y wrap around.
 *
 * @param grid Target board
 * @param x    X position (cells). Can be negative or >= width
 * @param y    Y position (cells). 0 is the top
 */
export function indexOf(grid: Grid, x: number, y: number): number {
  const wx = (x + grid.width) % grid.width;
  const wy = (y + grid.height) % grid.height;
  return wy * grid.width + wx;
}

/**
 * Counts the live cells in the 8 cells around (x, y).
 *
 * @param grid Target board
 * @param x    X position (cells)
 * @param y    Y position (cells)
 */
export function countNeighbors(grid: Grid, x: number, y: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      count += grid.cells[indexOf(grid, x + dx, y + dy)];
    }
  }
  return count;
}

/**
 * Returns a new board, one generation later.
 * All cells change at the same time, so we write to a new board and leave the old one as is.
 *
 * @param grid Current board
 * @param rule Rule for birth and survival
 */
export function step(grid: Grid, rule: Rule = CONWAY): Grid {
  const next = createGrid(grid.width, grid.height);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const i = y * grid.width + x;
      const count = countNeighbors(grid, x, y);
      const alive = grid.cells[i] === ALIVE;
      const lives = alive ? rule.survive.includes(count) : rule.birth.includes(count);
      next.cells[i] = lives ? ALIVE : DEAD;
    }
  }
  return next;
}

/**
 * Whether the cell at (x, y) is alive.
 *
 * @param grid Target board
 * @param x    X position (cells)
 * @param y    Y position (cells)
 */
export function isAlive(grid: Grid, x: number, y: number): boolean {
  return grid.cells[indexOf(grid, x, y)] === ALIVE;
}

/**
 * Counts the live cells. Shown on screen as "Alive".
 *
 * @param grid Target board
 */
export function countAlive(grid: Grid): number {
  let count = 0;
  for (const cell of grid.cells) {
    count += cell;
  }
  return count;
}
