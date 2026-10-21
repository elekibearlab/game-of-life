import { useImperativeHandle, useRef, type Ref } from 'react';
import type { Grid } from '@/core/life2d';
import { useLifeScene } from '../scene/useLifeScene';
import type { LifeSceneHandle, LifeSceneOptions } from '../types';
import styles from './styles.module.css';

type Props = LifeSceneOptions & {
  ref: Ref<LifeSceneHandle>;
  initialGrid: Grid;
};

/**
 * Canvas for the 2D Game of Life. It fills its parent.
 * Drag on the canvas to draw cells.
 *
 * @param props.ref         Gets commands: replace the board, go forward one generation
 * @param props.initialGrid Board at the start
 * @param props.running     Whether generations go forward on their own
 * @param props.interval    Seconds per generation
 * @param props.effects     Effects on/off
 * @param props.onStats     Gets the generation and number of live cells
 */
export function LifeCanvas({ ref, initialGrid, ...options }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useLifeScene(canvasRef, initialGrid, options);
  useImperativeHandle(ref, () => handle, [handle]);
  return <canvas ref={canvasRef} className={styles.canvas} />;
}
