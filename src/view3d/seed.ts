import { layeredGrid, randomGrid, type Grid } from '@/core/life3d';
import type { Preset } from '@/data/presets';

/**
 * How to make the board. We keep this instead of the board itself, so a new board size can make the same content again.
 * 'preset' uses the preset's seed. 'random' fills at random with the given density and size.
 */
export type Seed =
  | { kind: 'preset' }
  | {
      kind: 'random';
      /** Chance (0–1) that a cell is alive */
      density: number;
      /** How much to fill: the center cube's side, as a part (0–1) of the board's side */
      extent: number;
    };

/**
 * Makes a board from a seed.
 *
 * @param seed   How to make it
 * @param preset The selected preset. Its seed is used for 'preset'
 * @param size   Cells on each side of the board
 */
export function buildGrid(seed: Seed, preset: Preset, size: number): Grid {
  switch (seed.kind) {
    case 'preset':
      if (preset.layers) {
        return layeredGrid(size, preset.layers.rows, preset.layers.depth);
      }
      return randomGrid(size, preset.density, preset.fill);
    case 'random':
      return randomGrid(size, seed.density, Math.max(1, Math.round(size * seed.extent)));
  }
}
