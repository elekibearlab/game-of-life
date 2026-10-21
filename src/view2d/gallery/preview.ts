import { ALIVE, createGrid, type Grid } from '@/core/life2d';
import { placeCentered, type Pattern, type PatternCategory } from '@/data/patterns';

/** Shape (width : height) of the small boards. 16:9, like the main board */
const ASPECT = 16 / 9;
/**
 * Empty cells to leave around a pattern. Each group gets enough space for how it moves.
 * Still lifes and oscillators get little space, so they look big. Spaceships and methuselahs get more, so you can see them move
 */
const MARGIN: Record<PatternCategory, number> = {
  still: 3,
  oscillator: 5,
  spaceship: 12,
  gun: 12,
  methuselah: 24,
  growth: 24,
};
/** Colors for the background, empty cells and live cells. Same as the main board with no effects */
const BACKGROUND = '#05070f';
const EMPTY = '#0c1328';
const ALIVE_COLOR = '#3ef2ff';
/** If a cell is this big (px) or bigger, empty cells are drawn too, to show the grid */
const GRID_MIN_CELL = 4;

/**
 * Makes a small board to run a pattern in the list. Its size depends on the pattern's size and group. The pattern goes in the center.
 *
 * @param pattern Pattern to put
 */
export function createPreviewGrid(pattern: Pattern): Grid {
  const margin = MARGIN[pattern.category];
  const width = Math.max(...pattern.rows.map((row) => row.length)) + margin * 2;
  const height = pattern.rows.length + margin * 2;
  // Make the short side longer to get 16:9
  const fitWidth = Math.max(width, Math.ceil(height * ASPECT));
  const fitHeight = Math.max(height, Math.ceil(fitWidth / ASPECT));
  return placeCentered(createGrid(fitWidth, fitHeight), pattern);
}

/**
 * Draws the board with Canvas 2D. The list has dozens of patterns, so we use Canvas 2D, not WebGL (Three.js).
 * A browser can only have about a dozen WebGL canvases at once, so one for each pattern would be too many.
 *
 * @param context Where to draw
 * @param grid    Board to draw
 */
export function drawPreview(context: CanvasRenderingContext2D, grid: Grid) {
  const { width, height } = context.canvas;
  const cell = Math.min(width / grid.width, height / grid.height);
  const gap = cell >= GRID_MIN_CELL ? Math.max(1, cell * 0.14) : 0;
  // Put the board in the center, so a small difference in shape doesn't put all the space on one side
  const left = (width - grid.width * cell) / 2;
  const top = (height - grid.height * cell) / 2;
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, width, height);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const alive = grid.cells[y * grid.width + x] === ALIVE;
      if (!alive && gap === 0) {
        continue;
      }
      context.fillStyle = alive ? ALIVE_COLOR : EMPTY;
      context.fillRect(left + x * cell + gap / 2, top + y * cell + gap / 2, cell - gap, cell - gap);
    }
  }
}
