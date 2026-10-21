import { useEffect, useRef, type RefObject } from 'react';
import { ALIVE, DEAD, countAlive, type Grid, step } from '@/core/life2d';
import { createCellMesh, type CellMesh } from './cellMesh';
import { createStage } from './createStage';
import { attachPointerPaint } from './pointerPaint';
import type { LifeSceneHandle, LifeSceneOptions } from '../types';

/** Max time (seconds) for one frame. Keeps trails from vanishing at once when you come back to the tab */
const MAX_DELTA = 0.1;

/**
 * Makes a Three.js scene on the canvas and runs the Game of Life.
 *
 * The board changes every generation, so it is in a ref, not in React state.
 * In state, React would re-render every generation, and both React and the draw loop would manage the board.
 *
 * @param canvasRef   Canvas to draw on
 * @param initialGrid Board at the start. It also sets the board size
 * @param options     Play state, speed and effects. Each render passes the latest values
 */
export function useLifeScene(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  initialGrid: Grid,
  options: LifeSceneOptions,
): LifeSceneHandle {
  const gridRef = useRef(initialGrid);
  const generationRef = useRef(0);
  const cellsRef = useRef<CellMesh | null>(null);
  // The draw loop is made only once, so it reads the latest props through a ref
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const notify = () =>
    optionsRef.current.onStats({
      generation: generationRef.current,
      population: countAlive(gridRef.current),
    });

  const handleRef = useRef<LifeSceneHandle>({
    step: () => {
      gridRef.current = step(gridRef.current);
      generationRef.current += 1;
      cellsRef.current?.advance(gridRef.current);
      notify();
    },
    load: (grid) => {
      gridRef.current = grid;
      generationRef.current = 0;
      cellsRef.current?.advance(grid);
      notify();
    },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const { width, height } = gridRef.current;
    const stage = createStage(canvas, width, height);
    const cells = createCellMesh(width, height);
    stage.scene.add(cells.mesh);
    cells.advance(gridRef.current);
    cellsRef.current = cells;
    notify();

    const observer = new ResizeObserver(([entry]) =>
      cells.setCellPixels(stage.resize(entry.contentRect.width, entry.contentRect.height)),
    );
    observer.observe(canvas);

    const detachPointer = attachPointerPaint(
      canvas,
      (px, py) => {
        // The board's center is (0, 0) and +y is up, so change to cell positions with (0, 0) at the top left
        const world = stage.toWorld(px, py);
        const x = Math.floor(world.x + width / 2);
        const y = Math.floor(height / 2 - world.y);
        if (x < 0 || x >= width || y < 0 || y >= height) {
          return null;
        }
        return y * width + x;
      },
      (index) => gridRef.current.cells[index] === ALIVE,
      (index, alive) => {
        gridRef.current.cells[index] = alive ? ALIVE : DEAD;
        cells.paint(index, alive);
        notify();
      },
    );

    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, MAX_DELTA);
      last = now;
      const { running, interval, effects } = optionsRef.current;
      if (running) {
        elapsed += delta;
        if (elapsed >= interval) {
          elapsed = 0;
          handleRef.current.step();
        }
      }
      cells.tick(delta, effects);
      stage.setBloom(effects.bloom);
      stage.render();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      detachPointer();
      cellsRef.current = null;
      cells.dispose();
      stage.dispose();
    };
  }, [canvasRef]);

  return handleRef.current;
}
