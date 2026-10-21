import { useEffect, useRef, type RefObject } from 'react';
import { countAlive, type Grid, step } from '@/core/life3d';
import { createCellMesh, type CellMesh } from './cellMesh';
import { createStage, type Stage } from './createStage';
import type { LifeSceneHandle, LifeSceneOptions } from '../types';

/** Max time (seconds) for one frame. Keeps cells from growing or shrinking at once when you come back to the tab */
const MAX_DELTA = 0.1;

/**
 * Makes a Three.js scene on the canvas and runs the 3D Game of Life.
 *
 * The board changes every generation, so it is in a ref, not in React state.
 * In state, React would re-render every generation, and both React and the draw loop would manage the board.
 *
 * @param canvasRef   Canvas to draw on
 * @param initialGrid Board at the start. It also sets the board size
 * @param options     Play state, speed, rule and effects. Each render passes the latest values
 */
export function useLifeScene(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  initialGrid: Grid,
  options: LifeSceneOptions,
): LifeSceneHandle {
  const gridRef = useRef(initialGrid);
  const generationRef = useRef(0);
  const cellsRef = useRef<CellMesh | null>(null);
  const stageRef = useRef<Stage | null>(null);
  // The draw loop is made only once, so it reads the latest props through a ref
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /** Number of states in the current rule. 2 if it is not a Generations rule */
  const statesOf = () => optionsRef.current.rule.states ?? 2;

  const notify = () =>
    optionsRef.current.onStats({
      generation: generationRef.current,
      population: countAlive(gridRef.current),
    });

  const handleRef = useRef<LifeSceneHandle>({
    step: () => {
      gridRef.current = step(gridRef.current, optionsRef.current.rule);
      generationRef.current += 1;
      cellsRef.current?.advance(gridRef.current, statesOf());
      notify();
    },
    load: (grid) => {
      gridRef.current = grid;
      generationRef.current = 0;
      cellsRef.current?.advance(grid, statesOf());
      notify();
    },
    zoom: (scale) => stageRef.current?.zoom(scale),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const { size } = gridRef.current;
    const stage = createStage(canvas, size);
    stageRef.current = stage;
    const cells = createCellMesh(size);
    stage.scene.add(cells.mesh);
    cells.advance(gridRef.current, statesOf());
    cellsRef.current = cells;
    notify();

    const observer = new ResizeObserver(([entry]) =>
      stage.resize(entry.contentRect.width, entry.contentRect.height),
    );
    observer.observe(canvas);

    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, MAX_DELTA);
      last = now;
      const { running, interval, autoRotate, effects } = optionsRef.current;
      if (running) {
        elapsed += delta;
        if (elapsed >= interval) {
          elapsed = 0;
          handleRef.current.step();
        }
      }
      stage.controls.autoRotate = autoRotate;
      cells.tick(delta, effects);
      stage.setEffects(effects);
      stage.render();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      cellsRef.current = null;
      cells.dispose();
      stageRef.current = null;
      stage.dispose();
    };
  }, [canvasRef]);

  return handleRef.current;
}
