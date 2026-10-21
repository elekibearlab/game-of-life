import { useImperativeHandle, useRef, type Ref } from 'react';
import type { Grid } from '@/core/life3d';
import { useLifeScene } from '../scene/useLifeScene';
import type { LifeSceneHandle, LifeSceneOptions } from '../types';
import styles from './styles.module.css';

type Props = LifeSceneOptions & {
  ref: Ref<LifeSceneHandle>;
  initialGrid: Grid;
};

/**
 * Canvas for the 3D Game of Life. It fills its parent.
 * Drag to turn the view. Use the mouse wheel or a pinch to zoom in and out (the panel has buttons too).
 *
 * @param props.ref         Gets commands: replace the board, go forward one generation
 * @param props.initialGrid Board at the start
 * @param props.running     Whether generations go forward on their own
 * @param props.interval    Seconds per generation
 * @param props.rule        Rule for birth and survival
 * @param props.autoRotate  Whether the camera turns on its own
 * @param props.effects     Effects on/off
 * @param props.onStats     Gets the generation and number of live cells
 */
export function LifeCanvas({ ref, initialGrid, ...options }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useLifeScene(canvasRef, initialGrid, options);
  useImperativeHandle(ref, () => handle, [handle]);
  return <canvas ref={canvasRef} className={styles.canvas} />;
}
