import { useRef, useState } from 'react';
import { formatRule } from '@/core/rule';
import { PRESETS, type Preset } from '@/data/presets';
import { Workspace } from '@/ui';
import { t } from '@/shared/i18n';
import { useKeyboardShortcuts } from '@/shared/useKeyboardShortcuts';
import { buildGrid, type Seed } from './seed';
import type { Effects, LifeSceneHandle, LifeStats } from './types';
import { ControlPanel, type RandomSettings } from './components/ControlPanel';
import { LifeCanvas } from './components/LifeCanvas';

/**
 * Cells on each side to choose from. Neighbors are counted all at once, so even 96³ (about 880,000 cells) takes only tens of milliseconds.
 * Over 64, there are hundreds of thousands of cubes to draw, which can be slow on some GPUs
 */
const BOARD_SIZES = [16, 24, 32, 48, 64, 96];
const DEFAULT_BOARD_SIZE = 32;
/** Speed at the start. A bit slower than 2D, because counting is heavier and things change faster */
const DEFAULT_SPEED = 8;
/** All effects are off at first, so we start with only life and death on screen */
const NO_EFFECTS: Effects = { grow: false, color: false, fog: false, bloom: false };
/** How much one press of zoom changes the camera distance */
const ZOOM_STEP = 1.25;

/** The preset shown first. Not the first in the list: Bays 4555 mostly dies out, so it makes a poor first look */
const FIRST_PRESET = PRESETS.find((item) => item.id === '445')!;

/** Random fill for the whole board, with the density the preset suggests */
const randomFor = (preset: Preset): RandomSettings => ({
  density: Math.round(preset.randomDensity * 100),
  extent: 100,
});

/**
 * The 3D Game of Life screen. It keeps the rule, seed, play state and effects in state, and builds the canvas and panel.
 */
export function Life3D() {
  const sceneRef = useRef<LifeSceneHandle>(null);
  const [preset, setPreset] = useState(FIRST_PRESET);
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE);
  const [seed, setSeed] = useState<Seed>({ kind: 'preset' });
  // A new board size makes a new canvas, so keep the first board for it
  const [initialGrid, setInitialGrid] = useState(() => buildGrid(seed, preset, boardSize));
  const [random, setRandom] = useState(() => randomFor(FIRST_PRESET));
  const [running, setRunning] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [effects, setEffects] = useState(NO_EFFECTS);
  const [stats, setStats] = useState<LifeStats>({ generation: 0, population: 0 });

  const load = (nextSeed: Seed, nextPreset = preset) => {
    setSeed(nextSeed);
    sceneRef.current?.load(buildGrid(nextSeed, nextPreset, boardSize));
  };
  /** Makes a random fill seed from the panel settings (%) */
  const randomSeed = (settings: RandomSettings): Seed => ({
    kind: 'random',
    density: settings.density / 100,
    extent: settings.extent / 100,
  });

  const actions = {
    choosePreset: (next: Preset) => {
      setPreset(next);
      // Each rule needs a very different density to survive, so also set the random fill density for the new rule
      setRandom(randomFor(next));
      load({ kind: 'preset' }, next);
    },
    toggleRunning: () => setRunning((value) => !value),
    step: () => {
      // Auto play while stepping one generation at a time is confusing, so stop it
      setRunning(false);
      sceneRef.current?.step();
    },
    toggleRotate: () => setAutoRotate((value) => !value),
    zoomIn: () => sceneRef.current?.zoom(1 / ZOOM_STEP),
    zoomOut: () => sceneRef.current?.zoom(ZOOM_STEP),
    reset: () => load({ kind: 'preset' }),
    random: () => load(randomSeed(random)),
    changeRandom: (next: RandomSettings) => {
      setRandom(next);
      // If random fill is shown, fill again with the new values now. You can compare densities and sizes right away
      if (seed.kind === 'random') {
        load(randomSeed(next));
      }
    },
    resize: (next: number) => {
      setBoardSize(next);
      setInitialGrid(buildGrid(seed, preset, next));
    },
  };

  useKeyboardShortcuts({
    Space: actions.toggleRunning,
    ArrowRight: actions.step,
    KeyA: actions.toggleRotate,
    // The + key is Shift + = on most keyboards, so = also works
    Equal: actions.zoomIn,
    NumpadAdd: actions.zoomIn,
    Minus: actions.zoomOut,
    NumpadSubtract: actions.zoomOut,
    KeyI: actions.reset,
    KeyR: actions.random,
    // 1–9 and 0 pick one of the first 10 presets (the rest are on the panel only)
    ...Object.fromEntries(
      PRESETS.slice(0, 10).map((item, i) => [
        `Digit${(i + 1) % 10}`,
        () => actions.choosePreset(item),
      ]),
    ),
  });

  return (
    <Workspace
      caption={
        <>
          <h2>
            {preset.name} <code>{formatRule(preset.rule, 'list')}</code>
          </h2>
          <p>
            {seed.kind === 'random'
              ? t({
                  ja: `ランダム配置（確率 ${Math.round(seed.density * 100)}% · 中央 ${Math.round(seed.extent * 100)}% の範囲）`,
                  en: `Random fill (density ${Math.round(seed.density * 100)}% · central ${Math.round(seed.extent * 100)}%)`,
                })
              : t(preset.description)}
          </p>
        </>
      }
      panel={
        <ControlPanel
          presets={PRESETS}
          presetId={preset.id}
          running={running}
          autoRotate={autoRotate}
          speed={speed}
          boardSizes={BOARD_SIZES}
          boardSize={boardSize}
          random={random}
          effects={effects}
          stats={stats}
          onPresetChange={(id) => actions.choosePreset(PRESETS.find((item) => item.id === id)!)}
          onToggleRunning={actions.toggleRunning}
          onStep={actions.step}
          onToggleRotate={actions.toggleRotate}
          onZoomIn={actions.zoomIn}
          onZoomOut={actions.zoomOut}
          onSpeedChange={setSpeed}
          onBoardSizeChange={actions.resize}
          onRandomChange={actions.changeRandom}
          onReset={actions.reset}
          onRandom={actions.random}
          onEffectsChange={setEffects}
        />
      }
    >
      {/* A new board size changes the camera distance and the number of cells, so change the key to make a new scene */}
      <LifeCanvas
        key={boardSize}
        ref={sceneRef}
        initialGrid={initialGrid}
        running={running}
        interval={1 / speed}
        rule={preset.rule}
        autoRotate={autoRotate}
        effects={effects}
        onStats={setStats}
      />
    </Workspace>
  );
}
