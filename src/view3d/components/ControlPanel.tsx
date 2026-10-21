import { formatRule } from '@/core/rule';
import type { Preset } from '@/data/presets';
import { Button, ButtonGrid, ButtonRow, Section, Select, Slider, Stats, Toggle } from '@/ui';
import { t } from '@/shared/i18n';
import type { Effects, LifeStats } from '../types';

/** Random fill settings. Both are in %, which is easy to use on the panel */
export type RandomSettings = {
  /** Density (%): the chance that a cell is alive */
  density: number;
  /** How much to fill: the center cube's side, as a % of the board's side */
  extent: number;
};

type Props = {
  presets: Preset[];
  presetId: string;
  running: boolean;
  autoRotate: boolean;
  /** Generations per second */
  speed: number;
  boardSizes: number[];
  /** Cells on each side of the board */
  boardSize: number;
  random: RandomSettings;
  effects: Effects;
  stats: LifeStats;
  onPresetChange: (id: string) => void;
  onToggleRunning: () => void;
  onStep: () => void;
  onToggleRotate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSpeedChange: (speed: number) => void;
  onBoardSizeChange: (size: number) => void;
  onRandomChange: (random: RandomSettings) => void;
  onReset: () => void;
  onRandom: () => void;
  onEffectsChange: (effects: Effects) => void;
};

/**
 * The control panel on the right. From the top: "Playback", "Camera", "Rules", "Board", "Random fill", "Effects".
 *
 * @param props.presets           Rules to choose from
 * @param props.presetId          Selected rule
 * @param props.running           Whether it is playing
 * @param props.autoRotate        Whether the camera turns on its own
 * @param props.speed             Generations per second
 * @param props.boardSizes        Cells per side to choose from
 * @param props.boardSize         Current cells per side
 * @param props.random            Density and size of random fill
 * @param props.effects           Effects on/off
 * @param props.stats             Generation and number of live cells
 * @param props.onPresetChange    Changes the rule
 * @param props.onToggleRunning   Plays or stops
 * @param props.onStep            Goes forward one generation
 * @param props.onToggleRotate    Turns camera rotation on or off
 * @param props.onZoomIn          Moves the camera closer
 * @param props.onZoomOut         Moves the camera farther away
 * @param props.onSpeedChange     Changes the speed
 * @param props.onBoardSizeChange Changes the cells per side
 * @param props.onRandomChange    Changes the density or size of random fill
 * @param props.onReset           Starts again from the current rule's seed
 * @param props.onRandom          Fills again at random
 * @param props.onEffectsChange   Turns effects on or off
 */
export function ControlPanel(props: Props) {
  const setEffect = (key: keyof Effects) => (checked: boolean) =>
    props.onEffectsChange({ ...props.effects, [key]: checked });
  const setRandom = (key: keyof RandomSettings) => (value: number) =>
    props.onRandomChange({ ...props.random, [key]: value });

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
          max={30}
          format={(value) => `${value}/s`}
          onChange={props.onSpeedChange}
        />
        <Stats {...props.stats} />
      </Section>

      {/* Turning and zoom are both about the view, so they are together. Phones have no mouse wheel, so zoom needs buttons */}
      <Section title={t({ ja: 'カメラ', en: 'Camera' })}>
        <ButtonRow>
          <Button onClick={props.onToggleRotate} active={props.autoRotate} title="A">
            {t({ ja: '自動回転', en: 'Auto-rotate' })}
          </Button>
        </ButtonRow>
        {/* Zoom is on its own row, so it does not look like the auto-rotate toggle.
            − is on the left and + on the right, like a number line, as in most zoom controls in a row */}
        <ButtonRow>
          <Button onClick={props.onZoomOut} title="-">
            {t({ ja: '− 縮小', en: '− Zoom out' })}
          </Button>
          <Button onClick={props.onZoomIn} title="+">
            {t({ ja: '+ 拡大', en: '+ Zoom in' })}
          </Button>
        </ButtonRow>
      </Section>

      <Section
        title={t({
          ja: 'ルール（選ぶと初期配置から始める）',
          en: 'Rules (choosing one restarts from its seed)',
        })}
      >
        <ButtonGrid>
          {props.presets.map((preset, i) => (
            <Button
              key={preset.id}
              onClick={() => props.onPresetChange(preset.id)}
              active={preset.id === props.presetId}
              title={`${(i + 1) % 10} · ${formatRule(preset.rule, 'list')}`}
            >
              {preset.name}
            </Button>
          ))}
        </ButtonGrid>
        <ButtonRow>
          <Button onClick={props.onReset} title="I">
            {t({ ja: '初期配置に戻す', en: 'Reset to seed' })}
          </Button>
        </ButtonRow>
      </Section>

      <Section title={t({ ja: '盤面', en: 'Board' })}>
        <Select
          label={t({ ja: 'マス数', en: 'Size' })}
          value={String(props.boardSize)}
          onChange={(value) => props.onBoardSizeChange(Number(value))}
        >
          {props.boardSizes.map((size) => (
            <option key={size} value={size}>
              {size} × {size} × {size}{' '}
              {t({
                ja: `（${(size ** 3).toLocaleString()} セル）`,
                en: `(${(size ** 3).toLocaleString()} cells)`,
              })}
            </option>
          ))}
        </Select>
      </Section>

      <Section title={t({ ja: 'ランダム配置', en: 'Random fill' })}>
        <Slider
          label={t({ ja: '確率', en: 'Density' })}
          value={props.random.density}
          min={1}
          max={80}
          format={(value) => `${value}%`}
          onChange={setRandom('density')}
        />
        <Slider
          label={t({ ja: '範囲', en: 'Extent' })}
          value={props.random.extent}
          min={5}
          max={100}
          step={5}
          format={(value) => `${value}%`}
          onChange={setRandom('extent')}
        />
        <ButtonRow>
          <Button onClick={props.onRandom} title="R">
            {t({ ja: 'ランダム配置', en: 'Random fill' })}
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
          label={t({ ja: '膨らむ・縮む', en: 'Grow and shrink' })}
          checked={props.effects.grow}
          onChange={setEffect('grow')}
        />
        <Toggle
          label={t({ ja: '位置と年齢で色を変える', en: 'Colour by position and age' })}
          checked={props.effects.color}
          onChange={setEffect('color')}
        />
        <Toggle
          label={t({ ja: '奥を霧で薄くする', en: 'Fade the far side with fog' })}
          checked={props.effects.fog}
          onChange={setEffect('fog')}
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
