import { Color, OrthographicCamera, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/** Same color as --color-bg in styles.css, so the canvas blends into the area around it */
const BACKGROUND = 0x05070f;
/**
 * Space around the board (CSS px). More at the top, so the board doesn't overlap the text on the top left.
 * In px, not cells: with small cells, a margin of a few cells is too thin for the text
 */
const MARGIN_X = 16;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 16;

/**
 * Base for drawing: the renderer, camera and post effects together.
 */
export type Stage = {
  scene: Scene;
  camera: OrthographicCamera;
  /**
   * Call this when the canvas size on screen changes (CSS px).
   * Returns how many device pixels one cell takes, for the cell mesh to fit its gaps to whole pixels
   */
  resize: (width: number, height: number) => number;
  /** Turns glow (Bloom) on or off */
  setBloom: (enabled: boolean) => void;
  render: () => void;
  /** Turns a screen position (px) into a board position (1 cell = 1, the center is 0) */
  toWorld: (px: number, py: number) => Vector3;
  dispose: () => void;
};

/**
 * Makes an orthographic camera that shows the whole board, and a renderer with glow (Bloom).
 * It is 2D, so OrthographicCamera has no perspective. 1 cell = 1 world unit.
 *
 * @param canvas      Where to draw
 * @param boardWidth  Cells across the board
 * @param boardHeight Cells down the board
 */
export function createStage(
  canvas: HTMLCanvasElement,
  boardWidth: number,
  boardHeight: number,
): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true });

  const scene = new Scene();
  scene.background = new Color(BACKGROUND);

  const camera = new OrthographicCamera();
  camera.position.z = 10;

  // RenderPass draws as usual. UnrealBloomPass makes bright parts glow.
  // OutputPass converts the color space, so it must always be last.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.125, 0.35, 0.15);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const resize = (width: number, height: number) => {
    // Everything below is in device pixels. The pixel ratio changes with the browser zoom or when the window moves
    // to another monitor, so read it every time. The canvas size is given to three.js already in whole device pixels:
    // with a pixel ratio, three.js rounds the canvas down but the drawing area to the nearest, and the board shifts by 1 px
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const canvasWidth = Math.round(width * pixelRatio);
    const canvasHeight = Math.round(height * pixelRatio);
    renderer.setSize(canvasWidth, canvasHeight, false);
    composer.setSize(canvasWidth, canvasHeight);

    // The largest cell that fits the whole board inside the margins.
    // Rounded down to whole pixels: if cells were 5.3 px, some cells and gaps would be 1 px wider than others, and the grid would look uneven
    const areaWidth = (width - MARGIN_X * 2) * pixelRatio;
    const areaHeight = (height - MARGIN_TOP - MARGIN_BOTTOM) * pixelRatio;
    const fit = Math.min(areaWidth / boardWidth, areaHeight / boardHeight);
    const cellPixels = fit >= 1 ? Math.floor(fit) : fit;

    // Put the board's top left corner on a whole pixel too, centered in the area inside the margins
    const left = Math.round((canvasWidth - boardWidth * cellPixels) / 2);
    const top = Math.round(MARGIN_TOP * pixelRatio + (areaHeight - boardHeight * cellPixels) / 2);
    // The board's center is (0, 0) and 1 cell = 1, so its top left corner is (-boardWidth / 2, boardHeight / 2)
    camera.left = -boardWidth / 2 - left / cellPixels;
    camera.right = camera.left + canvasWidth / cellPixels;
    camera.top = boardHeight / 2 + top / cellPixels;
    camera.bottom = camera.top - canvasHeight / cellPixels;
    camera.updateProjectionMatrix();
    return cellPixels;
  };

  const toWorld = (px: number, py: number) => {
    const { width, height } = canvas.getBoundingClientRect();
    return new Vector3((px / width) * 2 - 1, -(py / height) * 2 + 1, 0).unproject(camera);
  };

  return {
    scene,
    camera,
    resize,
    setBloom: (enabled) => {
      bloom.enabled = enabled;
    },
    render: () => composer.render(),
    toWorld,
    dispose: () => {
      composer.dispose();
      renderer.dispose();
    },
  };
}
