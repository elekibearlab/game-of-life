import type { Grid } from '@/core/life3d';
import type { Rule } from '@/core/rule';

/** Numbers shown on screen. Sent each generation */
export type LifeStats = {
  generation: number;
  population: number;
};

/** Lets other code control the scene. Passed to Life3D through a React ref */
export type LifeSceneHandle = {
  /** Goes forward one generation */
  step: () => void;
  /** Replaces the board and sets the generation back to 0 */
  load: (grid: Grid) => void;
  /** Moves the camera closer (scale < 1) or farther away (scale > 1) */
  zoom: (scale: number) => void;
};

/**
 * Effects for looks only. None of them change the rules.
 * With all off, live cells are cubes of one color that just appear and disappear, so the logic itself is easy to follow.
 */
export type Effects = {
  /** New cells grow, and dying cells shrink */
  grow: boolean;
  /** Color by distance from the center, brightness by age */
  color: boolean;
  /** Cells farther away fade into the background */
  fog: boolean;
  /** Bright cells glow (Bloom) */
  bloom: boolean;
};

export type LifeSceneOptions = {
  /** Whether generations go forward on their own */
  running: boolean;
  /** Seconds per generation */
  interval: number;
  rule: Rule;
  /** Whether the camera turns on its own */
  autoRotate: boolean;
  effects: Effects;
  onStats: (stats: LifeStats) => void;
};
