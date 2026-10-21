import { useRef, useState } from 'react';
import { CONWAY, formatRule } from '@/core/rule';
import { PATTERNS, type Pattern } from '@/data/patterns';
import { Workspace } from '@/ui';
import { t } from '@/shared/i18n';
import { useKeyboardShortcuts } from '@/shared/useKeyboardShortcuts';
import { buildGrid, type BoardSize, type Seed } from './seed';
import type { Effects, LifeSceneHandle, LifeStats } from './types';
import { ControlPanel } from './components/ControlPanel';
import { LifeCanvas } from './components/LifeCanvas';
import { PatternGallery } from './gallery/PatternGallery';

/** Board sizes to choose from. Each one fits the 16:9 video exactly */
const BOARD_SIZES: BoardSize[] = [
  { width: 48, height: 27 },
  { width: 64, height: 36 },
  { width: 96, height: 54 },
  { width: 128, height: 72 },
  { width: 192, height: 108 },
  { width: 256, height: 144 },
];
const DEFAULT_BOARD_SIZE = BOARD_SIZES[3];
/** Speed at the start, in generations per second */
const DEFAULT_SPEED = 10;
/** Density (%) for random fill: the chance that a cell is alive */
const DEFAULT_DENSITY = 12;
/** All effects are off at first, so we start with a near black-and-white look that shows only the rules */
const NO_EFFECTS: Effects = { age: false, trail: false, bloom: false };

/**
 * The 2D Game of Life screen. It keeps the seed, play state and effects in state, and builds the canvas and panel.
 */
export function Life2D() {
  const sceneRef = useRef<LifeSceneHandle>(null);
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE);
  const [seed, setSeed] = useState<Seed>({ kind: 'random', density: DEFAULT_DENSITY / 100 });
  // A new board size makes a new canvas, so keep the first board for it
  const [initialGrid, setInitialGrid] = useState(() => buildGrid(seed, boardSize));
  const [density, setDensity] = useState(DEFAULT_DENSITY);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [effects, setEffects] = useState(NO_EFFECTS);
  const [stats, setStats] = useState<LifeStats>({ generation: 0, population: 0 });

  const load = (next: Seed) => {
    setSeed(next);
    sceneRef.current?.load(buildGrid(next, boardSize));
  };

  const pattern = seed.kind === 'pattern' ? seed.pattern : null;
  const choosePattern = (next: Pattern | undefined) => {
    if (!next) {
      return;
    }
    load({ kind: 'pattern', pattern: next });
    setGalleryOpen(false);
  };
  /** The pattern that is `offset` places away from the current one in the list */
  const patternAt = (offset: number) => {
    const index = pattern ? PATTERNS.indexOf(pattern) : -1;
    return PATTERNS[(index + offset + PATTERNS.length) % PATTERNS.length];
  };

  const actions = {
    toggleRunning: () => setRunning((value) => !value),
    step: () => {
      // Auto play while stepping one generation at a time is confusing, so stop it
      setRunning(false);
      sceneRef.current?.step();
    },
    random: () => load({ kind: 'random', density: density / 100 }),
    changeDensity: (next: number) => {
      setDensity(next);
      // If random fill is shown, fill again with the new density now. You can compare densities right away
      if (seed.kind === 'random') {
        load({ kind: 'random', density: next / 100 });
      }
    },
    toggleGallery: () => setGalleryOpen((value) => !value),
    clear: () => {
      setRunning(false);
      load({ kind: 'empty' });
    },
    resize: (next: BoardSize) => {
      setBoardSize(next);
      setInitialGrid(buildGrid(seed, next));
    },
  };

  useKeyboardShortcuts({
    Space: actions.toggleRunning,
    ArrowRight: actions.step,
    ArrowDown: () => choosePattern(patternAt(1)),
    ArrowUp: () => choosePattern(patternAt(-1)),
    KeyR: actions.random,
    KeyL: actions.toggleGallery,
    Escape: () => setGalleryOpen(false),
    KeyC: actions.clear,
  });

  return (
    <Workspace
      caption={<Caption seed={seed} />}
      panel={
        <ControlPanel
          running={running}
          speed={speed}
          boardSizes={BOARD_SIZES}
          boardSize={boardSize}
          density={density}
          patternId={pattern?.id ?? ''}
          effects={effects}
          stats={stats}
          onToggleRunning={actions.toggleRunning}
          onStep={actions.step}
          onSpeedChange={setSpeed}
          onBoardSizeChange={actions.resize}
          onDensityChange={actions.changeDensity}
          onRandom={actions.random}
          onClear={actions.clear}
          onOpenGallery={actions.toggleGallery}
          onPatternChange={(id) => choosePattern(PATTERNS.find((item) => item.id === id))}
          onEffectsChange={setEffects}
        />
      }
    >
      {/* A new board size changes the camera and the number of cells, so change the key to make a new scene */}
      <LifeCanvas
        key={`${boardSize.width}x${boardSize.height}`}
        ref={sceneRef}
        initialGrid={initialGrid}
        running={running}
        interval={1 / speed}
        effects={effects}
        onStats={setStats}
      />
      {galleryOpen && (
        <PatternGallery
          currentId={pattern?.id ?? ''}
          onPick={choosePattern}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </Workspace>
  );
}

/**
 * Text on the top left of the canvas. It tells what is on the board now.
 *
 * @param props.seed How the board is made
 */
function Caption({ seed }: { seed: Seed }) {
  const rule = <code>{formatRule(CONWAY)}</code>;
  switch (seed.kind) {
    case 'random':
      return (
        <>
          <h2>{t({ ja: 'ランダム', en: 'Random' })}</h2>
          <p>
            {rule} ·{' '}
            {t({
              ja: `確率 ${Math.round(seed.density * 100)}% · ドラッグでセルを描けます`,
              en: `density ${Math.round(seed.density * 100)}% · drag to draw cells`,
            })}
          </p>
        </>
      );
    case 'pattern':
      return (
        <>
          <h2>{t(seed.pattern.name)}</h2>
          <p>
            {rule} · {t(seed.pattern.description)}
          </p>
        </>
      );
    case 'empty':
      return (
        <>
          <h2>{t({ ja: '空の盤面', en: 'Empty board' })}</h2>
          <p>
            {rule} · {t({ ja: 'ドラッグでセルを描けます', en: 'drag to draw cells' })}
          </p>
        </>
      );
  }
}
