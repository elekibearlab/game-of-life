import { describe, expect, it } from 'vitest';
import {
  ALIVE,
  DEAD,
  countAlive,
  createGrid,
  indexOf,
  isAlive,
  layeredGrid,
  randomGrid,
  NEIGHBOR_COUNT,
  countAllNeighbors,
  countNeighbors,
  step,
} from '@/core/life3d';
import { parseRule } from '@/core/rule';
import { GLIDER } from '@/data/patterns';
import { PRESETS } from '@/data/presets';

describe('life 3D', () => {
  it('3×3×3 を埋めると、中心の近傍は26になる', () => {
    const grid = randomGrid(5, 1, 3);
    expect(countAlive(grid)).toBe(27);
    expect(countNeighbors(grid, 2, 2, 2)).toBe(NEIGHBOR_COUNT);
  });

  it('盤面の各面は反対側とつながっている', () => {
    const grid = createGrid(4);
    grid.cells[indexOf(grid, 3, 3, 3)] = ALIVE;
    // Seen from (0,0,0), (-1,-1,-1) = (3,3,3) is a diagonal neighbor
    expect(countNeighbors(grid, 0, 0, 0)).toBe(1);
  });

  it('B4/S4 では孤立したセルは消える', () => {
    const grid = createGrid(6);
    grid.cells[indexOf(grid, 3, 3, 3)] = ALIVE;
    expect(countAlive(step(grid, parseRule('B4/S4')))).toBe(0);
  });

  it('Crystal は1セルから周りの26マスに広がる', () => {
    const grid = randomGrid(9, 1, 1);
    const next = step(grid, parseRule('B1,3/S0-6'));
    expect(countAlive(next)).toBe(27);
    expect(isAlive(next, 3, 3, 3)).toBe(true);
    expect(isAlive(next, 5, 5, 5)).toBe(true);
  });

  it('プリセットのルールは 0〜26 の範囲に収まっている', () => {
    for (const preset of PRESETS) {
      const counts = [...preset.rule.birth, ...preset.rule.survive];
      expect(counts.every((n) => n >= 0 && n <= NEIGHBOR_COUNT)).toBe(true);
    }
  });
});

describe('randomGrid 3D', () => {
  it('fill を省略すると盤面全体を埋める', () => {
    expect(countAlive(randomGrid(4, 1))).toBe(64);
  });
});

describe('layeredGrid', () => {
  it('2D の形を指定した層の数だけ重ねて置く', () => {
    expect(countAlive(layeredGrid(16, GLIDER.rows, 2))).toBe(10);
  });

  it('Bays 5766 では 2 層のグライダーが 4 世代で斜めに 1 マス進む', () => {
    const rule = parseRule('B6/S5-7');
    const start = layeredGrid(16, GLIDER.rows, 2);
    let grid = start;
    for (let generation = 0; generation < 4; generation++) {
      grid = step(grid, rule);
    }
    // Glider rows go along z and characters along x, and it moves toward +x and +z
    const moved = createGrid(16);
    start.cells.forEach((cell, i) => {
      if (cell === ALIVE) {
        const x = i % 16;
        const y = Math.floor(i / 16) % 16;
        const z = Math.floor(i / 256);
        moved.cells[indexOf(moved, x + 1, y, z + 1)] = ALIVE;
      }
    });
    expect([...grid.cells]).toEqual([...moved.cells]);
  });
});

describe('countAllNeighbors', () => {
  it('素直に数えた countNeighbors と同じ結果になる', () => {
    let seed = 1;
    // A simple random generator that gives the same numbers every time (linear congruential)
    const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const grid = randomGrid(7, 0.4, 7, random);
    const counts = countAllNeighbors(grid);
    for (let z = 0; z < 7; z++) {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          expect(counts[indexOf(grid, x, y, z)]).toBe(countNeighbors(grid, x, y, z));
        }
      }
    }
  });
});

describe('Generations ルール', () => {
  it('生き残れなかったセルは死にかけの段階を順にたどってから消える', () => {
    const rule = parseRule('B/S/C4');
    let grid = createGrid(4);
    grid.cells[indexOf(grid, 1, 1, 1)] = ALIVE;
    const states: number[] = [];
    for (let i = 0; i < 3; i++) {
      grid = step(grid, rule);
      states.push(grid.cells[indexOf(grid, 1, 1, 1)]);
    }
    expect(states).toEqual([2, 3, DEAD]);
  });

  it('死にかけのセルは近傍に数えない', () => {
    const grid = createGrid(4);
    grid.cells[indexOf(grid, 1, 1, 1)] = 2;
    expect(countNeighbors(grid, 2, 2, 2)).toBe(0);
    expect(countAlive(grid)).toBe(0);
  });
});
