import type { Grid } from '@/core/life2d';

/** Numbers shown on screen. Sent each generation, and each time cells are drawn */
export type LifeStats = {
  generation: number;
  population: number;
};

/** Lets other code control the scene. Passed to Life2D through a React ref */
export type LifeSceneHandle = {
  /** Goes forward one generation */
  step: () => void;
  /** Replaces the board and sets the generation back to 0 */
  load: (grid: Grid) => void;
};

/**
 * Effects for looks only. None of them change the rules.
 * With all off, live cells are bright squares and dead cells are dark squares, so the logic itself is easy to follow.
 */
export type Effects = {
  /** The longer a cell lives, the more purple it gets */
  age: boolean;
  /** Dead cells glow pink for a short time, to show where things moved */
  trail: boolean;
  /** Bright cells glow (Bloom) */
  bloom: boolean;
};

export type LifeSceneOptions = {
  /** Whether generations go forward on their own */
  running: boolean;
  /** Seconds per generation */
  interval: number;
  effects: Effects;
  onStats: (stats: LifeStats) => void;
};
