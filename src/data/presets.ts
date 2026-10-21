import { parseRule, type Rule } from '@/core/rule';
import { GLIDER } from '@/data/patterns';
import type { LocalizedText } from '@/shared/i18n';

/**
 * A rule and a seed that looks good with it.
 * In 3D, many rules "die out at once" or "fill up at once" depending on the seed, so we keep them together.
 * Bays 4555 and 5766 are from Carter Bays's paper; the other names and rules are from a Softology article. Sources are listed in the README.
 */
export type Preset = {
  id: string;
  name: string;
  /** Short description shown on screen */
  description: LocalizedText;
  rule: Rule;
  /** Chance (0–1) that a cell is alive in the seed */
  density: number;
  /** Side of the center cube for the seed (cells). If omitted, the whole board */
  fill?: number;
  /**
   * A flat 2D shape stacked a few layers thick, used instead of the random seed.
   * Some rules show their character only with a shape placed on purpose
   */
  layers?: { rows: string[]; depth: number };
  /**
   * Chance (0–1) that keeps things moving when the whole board is filled at random.
   * Each rule needs a very different density to survive, so each preset has its own.
   */
  randomDensity: number;
};

/**
 * The presets, grouped by source: Bays's research first, then Softology's named rules (alive/dead only, then Generations).
 * All were tested on a 32³ board, with seeds that don't die out or fill up right away.
 */
export const PRESETS: Preset[] = [
  // Rules from Carter Bays's research
  {
    id: 'bays4555',
    name: 'Bays 4555',
    description: {
      ja: '3D版グライダーで有名なルール。ランダムな種はほとんど消えてしまう',
      en: 'Famous for its 3D glider. Random seeds mostly die out',
    },
    rule: parseRule('B5/S4-5'),
    density: 0.3,
    fill: 8,
    randomDensity: 0.2,
  },
  {
    id: 'bays5766',
    name: 'Bays 5766',
    description: {
      ja: '2Dのグライダーを2層の厚みにして置くと、2Dと同じく4世代で斜めに1マス進む',
      en: 'A 2D glider two layers thick moves one cell diagonally every 4 generations, just like in 2D',
    },
    rule: parseRule('B6/S5-7'),
    density: 1,
    layers: { rows: GLIDER.rows, depth: 2 },
    randomDensity: 0.2,
  },
  // Rules named by Jason Rampe (Softology). Alive and dead only
  {
    id: '445',
    name: '445',
    description: {
      ja: '小さな種が爆発的に広がり、沸騰するように変わり続ける',
      en: 'A small seed explodes outward and keeps churning like boiling water',
    },
    rule: parseRule('B4/S4'),
    density: 0.3,
    fill: 6,
    randomDensity: 0.15,
  },
  {
    id: 'clouds',
    name: 'Clouds',
    description: {
      ja: 'ランダムな霧が、数世代で雲のような塊にまとまる',
      en: 'A random mist gathers into cloud-like lumps within a few generations',
    },
    rule: parseRule('B13-14,17-19/S13-26'),
    density: 0.5,
    randomDensity: 0.5,
  },
  {
    id: 'crystal',
    name: 'Crystal',
    description: {
      ja: 'たった1つのセルから、対称な結晶が育つ',
      en: 'A symmetric crystal grows from a single cell',
    },
    rule: parseRule('B1,3/S0-6'),
    density: 1,
    fill: 1,
    randomDensity: 0.1,
  },
  {
    id: 'architecture',
    name: 'Architecture',
    description: {
      ja: '小さな種から一気に広がり、盤面全体がざらついた構造で埋まる',
      en: 'Spreads fast from a small seed and fills the board with a rough structure',
    },
    rule: parseRule('B3/S4-6'),
    density: 0.3,
    fill: 6,
    randomDensity: 0.1,
  },
  // Rules named by Jason Rampe (Softology). Generations rules with dying stages
  {
    id: 'pyroclastic',
    name: 'Pyroclastic',
    description: {
      ja: '噴煙のように燃え広がる。死にかけのセルが長い尾を引く（10段階）',
      en: 'Spreads like volcanic smoke. Dying cells leave long tails (10 states)',
    },
    rule: parseRule('B6-8/S4-7/C10'),
    density: 0.3,
    fill: 6,
    randomDensity: 0.1,
  },
  {
    id: 'coral',
    name: 'Coral',
    description: {
      ja: 'サンゴのように枝分かれしながら、ゆっくり育っていく（4段階）',
      en: 'Grows slowly, branching like coral (4 states)',
    },
    rule: parseRule('B6-7,9,12/S5-8/C4'),
    density: 0.3,
    fill: 6,
    randomDensity: 0.1,
  },
  {
    id: 'amoeba',
    name: 'Amoeba',
    description: {
      ja: 'アメーバのような塊が、うねりながら膨らんでいく（5段階）',
      en: 'Amoeba-like blobs swell as they writhe (5 states)',
    },
    rule: parseRule('B5-7,12-13,15/S9-26/C5'),
    density: 0.5,
    fill: 10,
    randomDensity: 0.1,
  },
  {
    id: 'pulse-waves',
    name: 'Pulse Waves',
    description: {
      ja: '波が盤面を何度も行き来し、対称な模様を描き続ける（10段階）',
      en: 'Waves sweep back and forth, drawing symmetric patterns (10 states)',
    },
    rule: parseRule('B1-3/S3/C10'),
    density: 0.3,
    fill: 6,
    randomDensity: 0.1,
  },
  {
    id: 'builder',
    name: 'Builder',
    description: {
      ja: '小さな種から、足場のような構造が伸びて盤面に散らばる（10段階）',
      en: 'Scaffold-like structures grow from a small seed and spread across the board (10 states)',
    },
    rule: parseRule('B4,6,8-9/S2,6,9/C10'),
    density: 0.3,
    fill: 6,
    randomDensity: 0.1,
  },
];
