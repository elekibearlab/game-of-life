import type { Rule } from './rule';

// The whole 3D Game of Life. Same order as core/life2d.ts.
// Four changes: one more axis, 26 neighbors, a fast way to count neighbors on big boards, and dying stages (Generations).

/**
 * Cell states. They are numbers because they go into a Uint8Array.
 * In Generations rules (Rule.states >= 3), 2 and up mean a "dying" stage
 */
export const DEAD = 0;
export const ALIVE = 1;

/**
 * A cube-shaped board. Cells are in a 1D array in x → y → z order (x + y*size + z*size*size).
 * It is the 2D Grid plus one more axis for depth.
 */
export type Grid = {
  /** Number of cells on each side */
  size: number;
  cells: Uint8Array;
};

/**
 * Creates a board with all cells dead.
 *
 * @param size Number of cells on each side
 */
export function createGrid(size: number): Grid {
  return { size, cells: new Uint8Array(size ** 3) };
}

/**
 * Creates a board with random live cells, only inside a small cube at the center.
 * In 3D, filling the whole board often dies out or fills up at once (depends on the rule). A small seed can grow instead.
 *
 * @param size    Number of cells on each side
 * @param density Chance (0–1) that a cell is alive
 * @param fill    Side of the seed cube (cells). If omitted or >= size, it fills the whole board
 * @param random  Returns a random number in [0, 1). Tests pass their own to get the same result every time
 */
export function randomGrid(
  size: number,
  density: number,
  fill = size,
  random: () => number = Math.random,
): Grid {
  const grid = createGrid(size);
  const side = Math.min(fill, size);
  const offset = Math.floor((size - side) / 2);
  for (let z = 0; z < side; z++) {
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        if (random() < density) {
          grid.cells[indexOf(grid, x + offset, y + offset, z + offset)] = ALIVE;
        }
      }
    }
  }
  return grid;
}

/**
 * Creates a board with a flat 2D shape stacked a few layers thick at the center.
 * Under Bays 5766, a 2D shape two layers thick behaves just like it does in 2D:
 * inside the slab each cell counts "2D neighbors × 2 + 1", so survive 5–7 and birth 6 match 2D's 2–3 and 3.
 *
 * @param size  Number of cells on each side
 * @param rows  The shape, one string per row ('O' is alive). Rows go along z, characters along x
 * @param depth How many layers to stack (along y)
 */
export function layeredGrid(size: number, rows: string[], depth: number): Grid {
  const grid = createGrid(size);
  const width = Math.max(...rows.map((row) => row.length));
  const left = Math.floor((size - width) / 2);
  const front = Math.floor((size - rows.length) / 2);
  const bottom = Math.floor((size - depth) / 2);
  for (let y = 0; y < depth; y++) {
    rows.forEach((row, z) => {
      [...row].forEach((cell, x) => {
        if (cell === 'O') {
          grid.cells[indexOf(grid, x + left, y + bottom, z + front)] = ALIVE;
        }
      });
    });
  }
  return grid;
}

/**
 * Gets the array index for (x, y, z).
 * Each face connects to the opposite face (a 3D torus), so x, y and z wrap around.
 *
 * @param grid Target board
 * @param x    X position (cells)
 * @param y    Height (cells)
 * @param z    Depth (cells)
 */
export function indexOf(grid: Grid, x: number, y: number, z: number): number {
  const { size } = grid;
  const wx = (x + size) % size;
  const wy = (y + size) % size;
  const wz = (z + size) % size;
  return wx + wy * size + wz * size * size;
}

/** Number of neighbors in 3D: all directions, including diagonals. 3×3×3 − 1 */
export const NEIGHBOR_COUNT = 26;

/**
 * Counts the live cells in the 26 cells around (x, y, z).
 * It is the 2D loop with one more loop for depth (dz).
 * This simple version is here to show the idea. To count the whole board, use countAllNeighbors.
 *
 * @param x    X position (cells)
 * @param x    Horizontal position (cells)
 * @param y    Height (cells)
 * @param z    Depth (cells)
 */
export function countNeighbors(grid: Grid, x: number, y: number, z: number): number {
  let count = 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0 && dz === 0) {
          continue;
        }
        if (grid.cells[indexOf(grid, x + dx, y + dy, z + dz)] === ALIVE) {
          count++;
        }
      }
    }
  }
  return count;
}

/**
 * Counts the neighbors of all cells at once, in the same order as the cells. Same result as countNeighbors.
 *
 * The sum of a 3×3×3 box can be found in 3 steps: add 3 cells along x, add 3 of those along y, then 3 of those along z.
 * This needs 6 additions per cell instead of 26, so even 64³ takes only a few milliseconds.
 * The box also includes the cell itself, so we subtract it at the end.
 *
 * @param grid Target board
 */
export function countAllNeighbors(grid: Grid): Uint8Array {
  const { size, cells } = grid;
  const total = cells.length;
  const layer = size * size;
  /** Previous and next position. They wrap around to the other edge */
  const prev = (v: number) => (v + size - 1) % size;
  const next = (v: number) => (v + 1) % size;

  const alive = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    alive[i] = cells[i] === ALIVE ? 1 : 0;
  }

  // Add 3 cells along x
  const sumX = new Uint8Array(total);
  for (let row = 0; row < total; row += size) {
    for (let x = 0; x < size; x++) {
      sumX[row + x] = alive[row + prev(x)] + alive[row + x] + alive[row + next(x)];
    }
  }
  // Add 3 rows along y (sum of a 3×3 square)
  const sumXY = new Uint8Array(total);
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      const base = z * layer;
      for (let x = 0; x < size; x++) {
        sumXY[base + y * size + x] =
          sumX[base + prev(y) * size + x] +
          sumX[base + y * size + x] +
          sumX[base + next(y) * size + x];
      }
    }
  }
  // Add 3 layers along z (sum of a 3×3×3 box), then subtract the cell itself
  const counts = new Uint8Array(total);
  for (let z = 0; z < size; z++) {
    for (let j = 0; j < layer; j++) {
      const i = z * layer + j;
      counts[i] = sumXY[prev(z) * layer + j] + sumXY[i] + sumXY[next(z) * layer + j] - alive[i];
    }
  }
  return counts;
}

/**
 * Returns a new board, one generation later.
 * All cells change at the same time, so we write to a new board and leave the old one as is.
 * Birth and survival work just like 2D. Only Generations rules add the "dying" stages.
 *
 * @param grid Current board
 * @param rule Rule for birth and survival
 */
export function step(grid: Grid, rule: Rule): Grid {
  const states = rule.states ?? 2;
  const counts = countAllNeighbors(grid);
  const next = createGrid(grid.size);
  for (let i = 0; i < grid.cells.length; i++) {
    const state = grid.cells[i];
    if (state === DEAD) {
      next.cells[i] = rule.birth.includes(counts[i]) ? ALIVE : DEAD;
    } else if (state === ALIVE) {
      // If it can't survive: in a Generations rule, go to the first dying stage (2). Otherwise, die
      if (rule.survive.includes(counts[i])) {
        next.cells[i] = ALIVE;
      } else {
        next.cells[i] = states > 2 ? 2 : DEAD;
      }
    } else {
      // A dying cell moves one stage forward each generation, whatever its neighbors are. After the last stage, it disappears
      next.cells[i] = state + 1 < states ? state + 1 : DEAD;
    }
  }
  return next;
}

/**
 * Whether the cell at (x, y, z) is alive.
 *
 * @param grid Target board
 * @param x    X position (cells)
 * @param y    Height (cells)
 * @param z    Depth (cells)
 */
export function isAlive(grid: Grid, x: number, y: number, z: number): boolean {
  return grid.cells[indexOf(grid, x, y, z)] === ALIVE;
}

/**
 * Counts the live cells. Shown on screen as "Alive".
 *
 * @param grid Target board
 */
export function countAlive(grid: Grid): number {
  let count = 0;
  for (const cell of grid.cells) {
    if (cell === ALIVE) {
      count++;
    }
  }
  return count;
}
