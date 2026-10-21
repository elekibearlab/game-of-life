import { describe, expect, it } from 'vitest';
import { countAlive, createGrid, isAlive, type Grid, step } from '@/core/life2d';
import { PATTERN_CATEGORIES, PATTERNS, placeCentered, type Pattern } from '@/data/patterns';
import { createPreviewGrid } from '@/view2d/gallery/preview';

/** Use a big board, so a pattern never reaches the edge and hits itself from the other side */
const BOARD = 96;

/** Returns the smallest box around the live cells, as row strings. This compares spaceship shapes without their position */
function shapeOf(grid: Grid): string[] {
  let left = grid.width;
  let right = -1;
  let top = grid.height;
  let bottom = -1;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!isAlive(grid, x, y)) {
        continue;
      }
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return Array.from({ length: bottom - top + 1 }, (_, dy) =>
    Array.from({ length: right - left + 1 }, (_, dx) =>
      isAlive(grid, left + dx, top + dy) ? 'O' : '.',
    ).join(''),
  );
}

/** The board after n generations */
function run(grid: Grid, generations: number): Grid {
  for (let i = 0; i < generations; i++) {
    grid = step(grid);
  }
  return grid;
}

const withPeriod = PATTERNS.filter(
  (pattern): pattern is Pattern & { period: number } => pattern.period !== undefined,
);

describe('patterns', () => {
  it('id が重複していない', () => {
    const ids = PATTERNS.map((pattern) => pattern.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('どの分類にも図形がある', () => {
    for (const category of PATTERN_CATEGORIES) {
      expect(PATTERNS.some((pattern) => pattern.category === category.id)).toBe(true);
    }
  });

  it.each(withPeriod.map((pattern) => [pattern.id, pattern] as const))(
    '%s はちょうど周期の世代で同じ形に戻る',
    (_, pattern) => {
      const grid = placeCentered(createGrid(BOARD, BOARD), pattern);
      const shape = shapeOf(grid);
      // If it gets back to the same shape before the period, the period in the data is wrong
      for (let i = 1; i < pattern.period; i++) {
        expect(shapeOf(run(grid, i))).not.toEqual(shape);
      }
      expect(shapeOf(run(grid, pattern.period))).toEqual(shape);
    },
  );

  it('ダイハードは130世代目にちょうど全滅する', () => {
    const diehard = PATTERNS.find((pattern) => pattern.id === 'diehard')!;
    const before = run(placeCentered(createGrid(BOARD, BOARD), diehard), 129);
    expect(countAlive(before)).toBeGreaterThan(0);
    expect(countAlive(step(before))).toBe(0);
  });

  it('グライダー銃は撃ち出したグライダーの分だけ増え続ける', () => {
    for (const id of ['gosper-gun', 'simkin-gun']) {
      const gun = PATTERNS.find((pattern) => pattern.id === id)!;
      const first = run(placeCentered(createGrid(128, 128), gun), 120);
      const second = run(first, 120);
      expect(countAlive(second)).toBeGreaterThan(countAlive(first));
    }
  }, 30_000);
});

describe('一覧の小さな盤面', () => {
  it.each(PATTERNS.map((pattern) => [pattern.id, pattern] as const))(
    '%s がはみ出さずに収まる',
    (_, pattern) => {
      const grid = createPreviewGrid(pattern);
      const cells = pattern.rows.join('').split('O').length - 1;
      expect(countAlive(grid)).toBe(cells);
    },
  );
});
