import { describe, expect, it } from 'vitest';
import {
  countAlive,
  createGrid,
  isAlive,
  randomGrid,
  type Grid,
  countNeighbors,
  step,
} from '@/core/life2d';
import { GLIDER, placePattern } from '@/data/patterns';

/** Makes a board from row strings, so tests can write the expected shape as it looks */
function gridOf(rows: string[]): Grid {
  return placePattern(
    createGrid(rows[0].length, rows.length),
    {
      id: 'test',
      name: { ja: 'test', en: 'test' },
      category: 'still',
      description: { ja: '', en: '' },
      rows,
    },
    0,
    0,
  );
}

/** Turns a board back into row strings */
function rowsOf(grid: Grid): string[] {
  return Array.from({ length: grid.height }, (_, y) =>
    Array.from({ length: grid.width }, (_, x) => (isAlive(grid, x, y) ? 'O' : '.')).join(''),
  );
}

describe('life 2D', () => {
  it('ブロックは変化しない', () => {
    const block = ['....', '.OO.', '.OO.', '....'];
    expect(rowsOf(step(gridOf(block)))).toEqual(block);
  });

  it('ブリンカーは2世代で元に戻る', () => {
    const vertical = ['.....', '..O..', '..O..', '..O..', '.....'];
    const horizontal = ['.....', '.....', '.OOO.', '.....', '.....'];
    const once = step(gridOf(vertical));
    expect(rowsOf(once)).toEqual(horizontal);
    expect(rowsOf(step(once))).toEqual(vertical);
  });

  it('グライダーは4世代で右下に1マス進む', () => {
    let grid = placePattern(createGrid(8, 8), GLIDER, 1, 1);
    for (let i = 0; i < 4; i++) {
      grid = step(grid);
    }
    expect(rowsOf(grid)).toEqual(rowsOf(placePattern(createGrid(8, 8), GLIDER, 2, 2)));
  });

  it('盤面の端は反対側とつながっている', () => {
    const grid = gridOf(['O...', '....', '....', 'O..O']);
    // (0,3) and (3,3) are on the opposite edges, but they count as neighbors of (0,0) at the top left
    expect(countNeighbors(grid, 0, 0)).toBe(2);
  });

  it('生存数は生きているセルの数と一致する', () => {
    const grid = randomGrid(10, 10, 0.5, () => 0.3);
    expect(countAlive(grid)).toBe(100);
  });
});
