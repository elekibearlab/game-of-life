import { Color, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';
import { ALIVE, type Grid } from '@/core/life2d';
import type { Effects } from '../types';

/** Gap between cells, as a share of a cell. The gaps look like grid lines */
const GAP = 0.14;
/** Cells smaller than this (device px) have no gap. A gap would leave almost nothing of the cell */
const MIN_PIXELS_FOR_GAP = 3;
/** Dead cells. A bit brighter than the background, so you can see the grid */
const EMPTY = new Color(0x0c1328);
/** Live cells. With no effects, this is the only color */
const YOUNG = new Color(0x3ef2ff);
/** Cells that have lived a long time */
const OLD = new Color(0x7b5cff);
/** Trail color right after a cell dies */
const TRAIL = new Color(0xff3d9a);
/** Generations to change fully from YOUNG to OLD */
const MATURE_AGE = 16;
/** Seconds until the trail fades out */
const FADE_SECONDS = 0.8;

/**
 * Draws all cells with one InstancedMesh.
 * A Mesh for each cell would mean thousands of draw calls, so all cells share one shape and each has only a position and color.
 */
export type CellMesh = {
  mesh: InstancedMesh;
  /** Call this when the board changes. It ages cells and starts a trail on cells that just died */
  advance: (grid: Grid) => void;
  /** Call this when a drag draws or erases one cell */
  paint: (index: number, alive: boolean) => void;
  /** Call this when the screen size changes. Fits the gaps to whole pixels at that size */
  setCellPixels: (cellPixels: number) => void;
  /** Call this every frame. It fades the trails and sets colors from life, death and the effect settings */
  tick: (deltaSeconds: number, effects: Effects) => void;
  dispose: () => void;
};

/**
 * Makes an InstancedMesh with one cell for each cell on the board.
 * Positions are set only when the screen size changes. Every frame, only colors change.
 *
 * @param width  Cells across the board
 * @param height Cells down the board
 */
export function createCellMesh(width: number, height: number): CellMesh {
  const count = width * height;
  // A 1 × 1 square that starts at its top left corner. Each cell is placed at the top left of its square on the board,
  // so the gap is on the right and bottom, and both edges of a cell land on whole pixels
  const geometry = new PlaneGeometry(1, 1).translate(0.5, -0.5, 0);
  // MeshBasicMaterial ignores lights, so each cell shows its color as is
  const material = new MeshBasicMaterial();
  const mesh = new InstancedMesh(geometry, material, count);

  // The center of the board is (0, 0). y is 0 at the top, so rows go down
  const dummy = new Object3D();
  const setCellPixels = (cellPixels: number) => {
    const gapPixels =
      cellPixels < MIN_PIXELS_FOR_GAP ? 0 : Math.max(1, Math.round(cellPixels * GAP));
    const size = (cellPixels - gapPixels) / cellPixels;
    dummy.scale.set(size, size, 1);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        dummy.position.set(x - width / 2, height / 2 - y, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(y * width + x, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  // Real positions come with the first resize, before anything is shown
  setCellPixels(1);
  for (let i = 0; i < count; i++) {
    mesh.setColorAt(i, EMPTY);
  }

  // How many generations each cell has lived (0 = dead), and how strong its trail is after death (1 → 0)
  const age = new Uint16Array(count);
  const fade = new Float32Array(count);
  const color = new Color();

  const paint = (index: number, alive: boolean) => {
    if (alive) {
      age[index] = Math.min(age[index] + 1, MATURE_AGE + 1);
    } else {
      if (age[index] > 0) {
        fade[index] = 1;
      }
      age[index] = 0;
    }
  };

  return {
    mesh,
    advance: (grid) => {
      for (let i = 0; i < count; i++) {
        paint(i, grid.cells[i] === ALIVE);
      }
    },
    paint: (index, alive) => {
      // A drawn cell should look newborn, so its age starts again
      if (alive) {
        age[index] = 0;
      }
      paint(index, alive);
    },
    setCellPixels,
    tick: (deltaSeconds, effects) => {
      for (let i = 0; i < count; i++) {
        // Keep fading trails while the effect is off, so old trails don't all flash at once when you turn it back on
        fade[i] = Math.max(0, fade[i] - deltaSeconds / FADE_SECONDS);

        if (age[i] > 0 && effects.age) {
          color.lerpColors(YOUNG, OLD, (age[i] - 1) / MATURE_AGE);
        } else if (age[i] > 0) {
          color.copy(YOUNG);
        } else if (effects.trail && fade[i] > 0) {
          // Squaring it makes the end of the fade slow, like a tail
          color.lerpColors(EMPTY, TRAIL, fade[i] * fade[i]);
        } else {
          color.copy(EMPTY);
        }
        mesh.setColorAt(i, color);
      }
      mesh.instanceColor!.needsUpdate = true;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
