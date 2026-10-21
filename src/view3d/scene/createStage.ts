import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Fog,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { Effects } from '../types';

/** Same color as --color-bg in styles.css. The fog fades into this color too */
const BACKGROUND = 0x05070f;
/** Camera distance from the center, as a multiple of the board's side */
const CAMERA_DISTANCE = 2.6;

/**
 * Base for drawing: the renderer, camera and post effects together.
 */
export type Stage = {
  scene: Scene;
  controls: OrbitControls;
  /** Call this when the canvas size on screen changes */
  resize: (width: number, height: number) => void;
  /** Turns fog and glow (Bloom) on or off */
  setEffects: (effects: Pick<Effects, 'fog' | 'bloom'>) => void;
  render: () => void;
  /** Moves the camera closer (scale < 1) or farther away (scale > 1). For the + / − buttons, because phones have no mouse wheel */
  zoom: (scale: number) => void;
  dispose: () => void;
};

/**
 * Makes a camera that looks down at the board cube from above, plus lights, fog and glow (Bloom).
 * The board's center is at (0, 0, 0), so OrbitControls can simply turn around that point.
 *
 * @param canvas    Where to draw
 * @param boardSize Cells on each side of the board (1 cell = 1 world unit)
 */
export function createStage(canvas: HTMLCanvasElement, boardSize: number): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true });

  const scene = new Scene();
  scene.background = new Color(BACKGROUND);

  // Look down from above at an angle, far enough back to see the whole board
  const camera = new PerspectiveCamera(40, 1, 0.1, boardSize * 10);
  camera.position.set(1.4, 1, 1.6).setLength(boardSize * CAMERA_DISTANCE);

  // The front half stays clear, and the back half fades into the background, so you can see what is in front even when it is crowded.
  // three.js rebuilds shaders when scene.fog is set or removed, so switching only needs one assignment
  const distance = camera.position.length();
  const fog = new Fog(BACKGROUND, distance, distance + boardSize * 1.4);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;

  // Ambient light for everything, plus two directional lights from above, so not only the front is bright
  scene.add(new AmbientLight(0xffffff, 0.5));
  const key = new DirectionalLight(0xffffff, 1.8);
  key.position.set(1, 2, 1.5);
  scene.add(key);
  const rim = new DirectionalLight(0x6a7dff, 1.2);
  rim.position.set(-1.5, -0.5, -1);
  scene.add(rim);

  // Board edges. It is a torus, so cells that go past a face come back on the other side
  const frame = new LineSegments(
    new EdgesGeometry(new BoxGeometry(boardSize, boardSize, boardSize)),
    new LineBasicMaterial({ color: 0x3a4a7a }),
  );
  scene.add(frame);

  // RenderPass draws as usual. UnrealBloomPass makes bright parts glow.
  // OutputPass converts the color space, so it must always be last.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.45, 0.4, 0.55);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return {
    scene,
    controls,
    resize: (width, height) => {
      // The pixel ratio changes with the browser zoom or when the window moves to another monitor, so set it every time
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(pixelRatio);
      composer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    setEffects: (effects) => {
      scene.fog = effects.fog ? fog : null;
      bloom.enabled = effects.bloom;
    },
    render: () => {
      controls.update();
      composer.render();
    },
    zoom: (scale) => {
      // Same as the mouse wheel: keep the direction to the point the camera turns around, and change only the distance
      camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
    },
    dispose: () => {
      controls.dispose();
      frame.geometry.dispose();
      frame.material.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
