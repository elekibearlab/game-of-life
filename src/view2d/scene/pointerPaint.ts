/**
 * Lets you draw cells by dragging on the canvas.
 * If the first cell is dead, you draw. If it is alive, you erase. This keeps going until you let go.
 *
 * @param canvas  Canvas that gets pointer input
 * @param pick    Gets the cell index from a screen position (px, the top left of the canvas is 0). null if outside the board
 * @param isAlive Whether the cell at the index is alive
 * @param paint   Makes the cell at the index alive (true) or dead (false)
 * @returns A function that removes the events
 */
export function attachPointerPaint(
  canvas: HTMLCanvasElement,
  pick: (px: number, py: number) => number | null,
  isAlive: (index: number) => boolean,
  paint: (index: number, alive: boolean) => void,
): () => void {
  let drawing: boolean | null = null;

  const apply = (event: PointerEvent) => {
    const index = pick(event.offsetX, event.offsetY);
    if (index === null) {
      return;
    }
    drawing ??= !isAlive(index);
    paint(index, drawing);
  };
  const down = (event: PointerEvent) => {
    canvas.setPointerCapture(event.pointerId);
    apply(event);
  };
  const move = (event: PointerEvent) => {
    if (drawing !== null) {
      apply(event);
    }
  };
  const up = () => {
    drawing = null;
  };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
  };
}
