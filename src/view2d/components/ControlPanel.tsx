import { PATTERN_CATEGORIES, PATTERNS } from '@/data/patterns';
import { Button, ButtonRow, Section, Select, Slider, Stats, Toggle } from '@/ui';
import { t } from '@/shared/i18n';
import type { BoardSize } from '../seed';
import type { Effects, LifeStats } from '../types';

type Props = {
  running: boolean;
  /** Generations per second */
  speed: number;
  boardSizes: BoardSize[];
  boardSize: BoardSize;
  /** Density (%) for random fill: the chance that a cell is alive */
  density: number;
  /** id of the pattern on the board. Empty string if there is none */
  patternId: string;
  effects: Effects;
  stats: LifeStats;
  onToggleRunning: () => void;
  onStep: () => void;
  onSpeedChange: (speed: number) => void;
  onBoardSizeChange: (size: BoardSize) => void;
  onDensityChange: (density: number) => void;
  onRandom: () => void;
  onClear: () => void;
  onPatternChange: (id: string) => void;
  onOpenGallery: () => void;
  onEffectsChange: (effects: Effects) => void;
};

/** Turns the board size into a Select value */
const sizeKey = ({ width, height }: BoardSize) => `${width}x${height}`;

/**
 * The control panel on the right. From the top: "Playback", "Board", "Random fill", "Patterns", "Effects".
 *
 * @param props.running           Whether it is playing
 * @param props.speed             Generations per second
 * @param props.boardSizes        Board sizes to choose from
 * @param props.boardSize         Current board size
 * @param props.density           Density (%) for random fill
 * @param props.patternId         The pattern on the board
 * @param props.effects           Effects on/off
 * @param props.stats             Generation and number of live cells
 * @param props.onToggleRunning   Plays or stops
 * @param props.onStep            Goes forward one generation
 * @param props.onSpeedChange     Changes the speed
 * @param props.onBoardSizeChange Changes the board size
 * @param props.onDensityChange   Changes the density for random fill
 * @param props.onRandom          Fills the board at random
 * @param props.onClear           Clears all cells
 * @param props.onPatternChange   Makes a new board with the pattern on it
 * @param props.onOpenGallery     Opens the pattern gallery
 * @param props.onEffectsChange   Turns effects on or off
 */
export function ControlPanel(props: Props) {
  const setEffect = (key: keyof Effects) => (checked: boolean) =>
    props.onEffectsChange({ ...props.effects, [key]: checked });

  return (
    <>
      <Section title={t({ ja: '再生', en: 'Playback' })}>
        <ButtonRow>
          <Button onClick={props.onToggleRunning} active={props.running} title="Space">
            {props.running ? t({ ja: '■ 停止', en: '■ Stop' }) : t({ ja: '▶ 再生', en: '▶ Play' })}
          </Button>
          <Button onClick={props.onStep} title="→">
            {t({ ja: '1世代', en: 'Step' })}
          </Button>
        </ButtonRow>
        <Slider
          label={t({ ja: '速度', en: 'Speed' })}
          value={props.speed}
          min={1}
          max={60}
          format={(value) => `${value}/s`}
          onChange={props.onSpeedChange}
        />
        <Stats {...props.stats} />
      </Section>

      <Section title={t({ ja: '盤面', en: 'Board' })}>
        <Select
          label={t({ ja: 'マス数', en: 'Size' })}
          value={sizeKey(props.boardSize)}
          onChange={(key) =>
            props.onBoardSizeChange(props.boardSizes.find((s) => sizeKey(s) === key)!)
          }
        >
          {props.boardSizes.map((size) => (
            <option key={sizeKey(size)} value={sizeKey(size)}>
              {size.width} × {size.height}
            </option>
          ))}
        </Select>
        <ButtonRow>
          <Button onClick={props.onClear} title="C">
            {t({ ja: 'クリア', en: 'Clear' })}
          </Button>
        </ButtonRow>
      </Section>

      <Section title={t({ ja: 'ランダム配置', en: 'Random fill' })}>
        <Slider
          label={t({ ja: '確率', en: 'Density' })}
          value={props.density}
          min={1}
          max={80}
          format={(value) => `${value}%`}
          onChange={props.onDensityChange}
        />
        <ButtonRow>
          <Button onClick={props.onRandom} title="R">
            {t({ ja: 'ランダム配置', en: 'Random fill' })}
          </Button>
        </ButtonRow>
      </Section>

      <Section title={t({ ja: '図形', en: 'Patterns' })}>
        <Select
          label={t({ ja: '一覧', en: 'List' })}
          value={props.patternId}
          onChange={props.onPatternChange}
        >
          <option value="" disabled>
            {t({ ja: '選ぶと中央に置きます', en: 'Pick one to place it' })}
          </option>
          {PATTERN_CATEGORIES.map((category) => (
            <optgroup key={category.id} label={t(category.name)}>
              {PATTERNS.filter((pattern) => pattern.category === category.id).map((pattern) => (
                <option key={pattern.id} value={pattern.id}>
                  {t(pattern.name)}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <ButtonRow>
          <Button onClick={props.onOpenGallery} title="L">
            {t({ ja: '一覧で見る', en: 'Browse all' })}
          </Button>
        </ButtonRow>
      </Section>

      <Section
        title={t({
          ja: 'エフェクト（見た目だけ。ルールには影響しない）',
          en: 'Effects (visual only)',
        })}
      >
        <Toggle
          label={t({ ja: '年齢で色を変える', en: 'Colour by age' })}
          checked={props.effects.age}
          onChange={setEffect('age')}
        />
        <Toggle
          label={t({ ja: '死んだセルの残光', en: 'Afterglow of dead cells' })}
          checked={props.effects.trail}
          onChange={setEffect('trail')}
        />
        <Toggle
          label={t({ ja: '発光（Bloom）', en: 'Glow (Bloom)' })}
          checked={props.effects.bloom}
          onChange={setEffect('bloom')}
        />
      </Section>
    </>
  );
}
