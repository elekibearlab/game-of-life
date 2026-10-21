import { BoxGeometry, Color, InstancedMesh, Matrix4, MeshStandardMaterial } from 'three';
import { ALIVE, DEAD, type Grid } from '@/core/life3d';
import type { Effects } from '../types';

/** Size of one cell cube. Smaller than 1, so you can see where cells meet */
const CELL_SIZE = 0.82;
/** How fast new cells grow and dying cells shrink. Bigger is faster */
const GROW_SPEED = 12;
/** Cells smaller than this are not drawn */
const MIN_SCALE = 0.02;
/** If the size changes less than this, the animation has stopped */
const SETTLED = 0.001;
/** Color of live cells with no effects */
const PLAIN = new Color(0x3ef2ff);
/** Brightness of dying cells at the last stage. 0 would hide them, so keep a little */
const DYING_MIN_BRIGHTNESS = 0.15;
/**
 * Range of hue. Cyan at the center, changing to magenta toward the outside.
 * The seed is at the center, so you can also see it grow as the color spreads.
 */
const HUE_CENTER = 0.5;
const HUE_EDGE = 0.93;
/** Brightness of new cells, and of cells that keep living */
const LIGHTNESS_YOUNG = 0.68;
const LIGHTNESS_OLD = 0.5;
/** Generations until brightness drops to LIGHTNESS_OLD */
const MATURE_AGE = 10;

/**
 * Draws all cells with one InstancedMesh.
 * Only non-empty cells are written, packed from the start. mesh.count sets how many to draw.
 */
export type CellMesh = {
  mesh: InstancedMesh;
  /**
   * Call this when the board changes. It sets cell ages and the brightness of dying cells
   *
   * @param states Number of states in the rule. Used to know how many dying stages there are
   */
  advance: (grid: Grid, states: number) => void;
  /** Call this every frame. It draws again only if the board or effects changed, or cells are still growing or shrinking */
  tick: (deltaSeconds: number, effects: Effects) => void;
  dispose: () => void;
};

/**
 * Makes an InstancedMesh that draws the cells as cubes.
 *
 * @param size Cells on each side of the board
 */
export function createCellMesh(size: number): CellMesh {
  const count = size ** 3;
  const geometry = new BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
  const material = new MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 });
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.count = 0;
  // The number of cells to draw changes every frame. Turn off frustumCulled so the camera check never hides the whole mesh
  mesh.frustumCulled = false;
  // The first setColorAt creates instanceColor. Call it before drawing, or the shader is built without colors
  mesh.setColorAt(0, new Color());

  // How many generations each cell has lived (0 = not alive)
  const age = new Uint16Array(count);
  // Brightness. 1 for live cells, lower for later dying stages, 0 for empty cells
  const brightness = new Float32Array(count);
  // Current size (0–1)
  const scale = new Float32Array(count);
  // Shift that puts the board's center at (0, 0, 0)
  const half = size / 2 - 0.5;

  const matrix = new Matrix4();
  const color = new Color();
  // At 96³, just checking every cell each frame is slow, so draw again only when something changes
  let dirty = true;
  let animating = false;
  let lastEffects = '';

  return {
    mesh,
    advance: (grid, states) => {
      for (let i = 0; i < count; i++) {
        const state = grid.cells[i];
        age[i] = state === ALIVE ? Math.min(age[i] + 1, MATURE_AGE + 1) : 0;
        if (state === DEAD) {
          brightness[i] = 0;
        } else if (state === ALIVE) {
          brightness[i] = 1;
        } else {
          // Map dying stages 2 … states-1 to brightness 1 → DYING_MIN_BRIGHTNESS
          const progress = (state - 1) / (states - 1);
          brightness[i] = 1 - progress * (1 - DYING_MIN_BRIGHTNESS);
        }
      }
      dirty = true;
    },
    tick: (deltaSeconds, effects) => {
      const effectsKey = `${effects.grow}${effects.color}`;
      if (!dirty && !animating && effectsKey === lastEffects) {
        return;
      }
      dirty = false;
      lastEffects = effectsKey;

      // With grow/shrink off, the size jumps to 1 or 0 at once
      const t = effects.grow ? Math.min(1, deltaSeconds * GROW_SPEED) : 1;
      animating = false;
      let drawn = 0;
      for (let i = 0; i < count; i++) {
        const target = brightness[i] > 0 ? 1 : 0;
        scale[i] += (target - scale[i]) * t;
        if (Math.abs(target - scale[i]) > SETTLED) {
          animating = true;
        }
        if (scale[i] < MIN_SCALE) {
          continue;
        }

        const x = i % size;
        const y = Math.floor(i / size) % size;
        const z = Math.floor(i / (size * size));
        const px = x - half;
        const py = y - half;
        const pz = z - half;
        matrix.makeScale(scale[i], scale[i], scale[i]);
        matrix.setPosition(px, py, pz);
        mesh.setMatrixAt(drawn, matrix);

        if (effects.color) {
          const distance = Math.min(Math.hypot(px, py, pz) / half, 1);
          const hue = HUE_CENTER + (HUE_EDGE - HUE_CENTER) * distance;
          const maturity = Math.min(Math.max(age[i] - 1, 0), MATURE_AGE) / MATURE_AGE;
          color.setHSL(hue, 0.9, LIGHTNESS_YOUNG + (LIGHTNESS_OLD - LIGHTNESS_YOUNG) * maturity);
        } else {
          color.copy(PLAIN);
        }
        // Make dying cells darker. This is not an effect: it shows a different state in the rule
        mesh.setColorAt(drawn, color.multiplyScalar(brightness[i] || 1));
        drawn++;
      }
      mesh.count = drawn;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
