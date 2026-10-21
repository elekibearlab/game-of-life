import { createGrid, randomGrid, type Grid } from '@/core/life2d';
import { placeCentered, type Pattern } from '@/data/patterns';

/**
 * How to make the board. We keep this instead of the board itself, so a new board size can make the same content again.
 */
export type Seed =
  { kind: 'random'; density: number } | { kind: 'pattern'; pattern: Pattern } | { kind: 'empty' };

/** Board size in cells */
export type BoardSize = { width: number; height: number };

/**
 * Makes a board from a seed.
 *
 * @param seed How to make it
 * @param size Board size in cells
 */
export function buildGrid(seed: Seed, { width, height }: BoardSize): Grid {
  switch (seed.kind) {
    case 'random':
      return randomGrid(width, height, seed.density);
    case 'pattern':
      return placeCentered(createGrid(width, height), seed.pattern);
    case 'empty':
      return createGrid(width, height);
  }
}
