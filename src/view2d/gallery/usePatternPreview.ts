import { useEffect, type RefObject } from 'react';
import { countAlive, step } from '@/core/life2d';
import type { Pattern } from '@/data/patterns';
import { createPreviewGrid, drawPreview } from './preview';

/** Play speed in the list (generations per second) */
const PREVIEW_SPEED = 8;
/** After this many generations, go back to the first shape, so guns and methuselahs restart before they fill the board */
const RESET_GENERATIONS = 240;
/** Frames to wait after all cells die, before going back to the first shape */
const EMPTY_FRAMES = 12;

/**
 * Puts a pattern on the canvas and plays it in a loop. Each card in the list uses this.
 *
 * @param canvasRef Canvas to draw on
 * @param pattern   Pattern to run
 */
export function usePatternPreview(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  pattern: Pattern,
) {
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) {
      return;
    }
    const initial = createPreviewGrid(pattern);
    let grid = initial;
    let generation = 0;
    let emptyFrames = 0;
    drawPreview(context, grid);

    const timer = window.setInterval(() => {
      // If all cells die (like Diehard), show the empty board for a moment, then restart
      emptyFrames = countAlive(grid) === 0 ? emptyFrames + 1 : 0;
      const finished = generation >= RESET_GENERATIONS || emptyFrames > EMPTY_FRAMES;
      grid = finished ? initial : step(grid);
      generation = finished ? 0 : generation + 1;
      drawPreview(context, grid);
    }, 1000 / PREVIEW_SPEED);
    return () => window.clearInterval(timer);
  }, [canvasRef, pattern]);
}
