import { ALIVE, indexOf, type Grid } from '@/core/life2d';
import type { LocalizedText } from '@/shared/i18n';

/** Pattern groups. The panel shows them in this order */
export const PATTERN_CATEGORIES = [
  { id: 'still', name: { ja: '固定物体', en: 'Still lifes' } },
  { id: 'oscillator', name: { ja: '振動子', en: 'Oscillators' } },
  { id: 'spaceship', name: { ja: '宇宙船', en: 'Spaceships' } },
  { id: 'gun', name: { ja: '銃', en: 'Guns' } },
  { id: 'methuselah', name: { ja: 'メトセラ', en: 'Methuselahs' } },
  { id: 'growth', name: { ja: '無限成長', en: 'Infinite growth' } },
] as const;

export type PatternCategory = (typeof PATTERN_CATEGORIES)[number]['id'];

/**
 * A pattern to put on the board. Each row is a string: 'O' is a live cell, anything else is dead.
 * It looks like the real shape (a list of positions would not), so you can read it in the video too.
 */
export type Pattern = {
  id: string;
  name: LocalizedText;
  category: PatternCategory;
  /** Short description shown on screen */
  description: LocalizedText;
  rows: string[];
  /**
   * Generations until it gets back to its first shape. 1 for still lifes.
   * For spaceships, generations until the same shape shows up in a new place. Tests use this to check the shape
   */
  period?: number;
};

/** The smallest spaceship. It moves diagonally forever. Exported because tests use it too */
export const GLIDER: Pattern = {
  id: 'glider',
  name: { ja: 'グライダー', en: 'Glider' },
  category: 'spaceship',
  description: {
    ja: '4世代で斜めに1マス進む、最小の宇宙船',
    en: 'The smallest spaceship. Moves one cell diagonally every 4 generations',
  },
  rows: ['.O.', '..O', 'OOO'],
  period: 4,
};

/** Shoots a glider every 30 generations. The first pattern found that grows forever */
export const GOSPER_GLIDER_GUN: Pattern = {
  id: 'gosper-gun',
  name: { ja: 'ゴスパーのグライダー銃', en: 'Gosper glider gun' },
  category: 'gun',
  description: {
    ja: '30世代ごとにグライダーを撃ち出す。最初に見つかった「無限に増える」パターン',
    en: 'Fires a glider every 30 generations. The first pattern found to grow forever',
  },
  rows: [
    '........................O...........',
    '......................O.O...........',
    '............OO......OO............OO',
    '...........O...O....OO............OO',
    'OO........O.....O...OO..............',
    'OO........O...O.OO....O.O...........',
    '..........O.....O.......O...........',
    '...........O...O....................',
    '............OO......................',
  ],
};

/**
 * Patterns you can pick on the panel. Well-known patterns with names (see LifeWiki), sorted by group.
 * tests/patterns.test.ts runs each one to check its period.
 */
export const PATTERNS: Pattern[] = [
  // ---- Still lifes: the shape never changes, however many generations pass
  {
    id: 'block',
    name: { ja: 'ブロック', en: 'Block' },
    category: 'still',
    description: {
      ja: '最小の固定物体。どのセルも隣が3つで生き残る',
      en: 'The smallest still life. Every cell has 3 neighbours, so it survives',
    },
    rows: ['OO', 'OO'],
    period: 1,
  },
  {
    id: 'beehive',
    name: { ja: '蜂の巣', en: 'Beehive' },
    category: 'still',
    description: {
      ja: 'ランダムな盤面で、ブロックの次によく残る固定物体',
      en: 'After the block, the still life most often left on a random board',
    },
    rows: ['.OO.', 'O..O', '.OO.'],
    period: 1,
  },
  {
    id: 'loaf',
    name: { ja: 'パン', en: 'Loaf' },
    category: 'still',
    description: {
      ja: '蜂の巣の角が1つ欠けた形の固定物体',
      en: 'A still life shaped like a beehive with one corner missing',
    },
    rows: ['.OO.', 'O..O', '.O.O', '..O.'],
    period: 1,
  },
  {
    id: 'boat',
    name: { ja: 'ボート', en: 'Boat' },
    category: 'still',
    description: { ja: '5セルでできる唯一の固定物体', en: 'The only still life made of 5 cells' },
    rows: ['OO.', 'O.O', '.O.'],
    period: 1,
  },
  {
    id: 'ship',
    name: { ja: 'シップ', en: 'Ship' },
    category: 'still',
    description: {
      ja: 'ボートを伸ばした6セルの固定物体',
      en: 'A 6-cell still life: a stretched boat',
    },
    rows: ['OO.', 'O.O', '.OO'],
    period: 1,
  },
  {
    id: 'tub',
    name: { ja: 'タブ', en: 'Tub' },
    category: 'still',
    description: {
      ja: '中央が空いた4セルの固定物体',
      en: 'A 4-cell still life with an empty centre',
    },
    rows: ['.O.', 'O.O', '.O.'],
    period: 1,
  },
  {
    id: 'pond',
    name: { ja: '池', en: 'Pond' },
    category: 'still',
    description: {
      ja: '蜂の巣を縦に伸ばした8セルの固定物体',
      en: 'An 8-cell still life: a beehive stretched vertically',
    },
    rows: ['.OO.', 'O..O', 'O..O', '.OO.'],
    period: 1,
  },
  {
    id: 'eater',
    name: { ja: 'イーター', en: 'Eater' },
    category: 'still',
    description: {
      ja: 'ぶつかってきたグライダーを食べて、自分は元に戻る',
      en: 'Eats a glider that hits it, then returns to its own shape',
    },
    rows: ['OO..', 'O.O.', '..O.', '..OO'],
    period: 1,
  },

  // ---- Oscillators: come back to the same shape after a fixed period
  {
    id: 'blinker',
    name: { ja: 'ブリンカー', en: 'Blinker' },
    category: 'oscillator',
    description: {
      ja: '縦と横を交互に繰り返す。周期2の最小の振動子',
      en: 'Flips between vertical and horizontal. The smallest oscillator, period 2',
    },
    rows: ['OOO'],
    period: 2,
  },
  {
    id: 'toad',
    name: { ja: 'ヒキガエル', en: 'Toad' },
    category: 'oscillator',
    description: {
      ja: '2本の棒がずれながら膨らんで縮む。周期2',
      en: 'Two offset bars swell and shrink. Period 2',
    },
    rows: ['.OOO', 'OOO.'],
    period: 2,
  },
  {
    id: 'beacon',
    name: { ja: 'ビーコン', en: 'Beacon' },
    category: 'oscillator',
    description: { ja: '向かい合う角が点滅する。周期2', en: 'The facing corners blink. Period 2' },
    rows: ['OO..', 'OO..', '..OO', '..OO'],
    period: 2,
  },
  {
    id: 'clock',
    name: { ja: '時計', en: 'Clock' },
    category: 'oscillator',
    description: {
      ja: '中央の2セルが針のように回る。周期2',
      en: 'The two centre cells turn like clock hands. Period 2',
    },
    rows: ['..O.', 'O.O.', '.O.O', '.O..'],
    period: 2,
  },
  {
    id: 'pulsar',
    name: { ja: 'パルサー', en: 'Pulsar' },
    category: 'oscillator',
    description: {
      ja: '4方向に対称な大きな振動子。周期3',
      en: 'A large oscillator, symmetric in four directions. Period 3',
    },
    rows: [
      '..OOO...OOO..',
      '.............',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '..OOO...OOO..',
      '.............',
      '..OOO...OOO..',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '.............',
      '..OOO...OOO..',
    ],
    period: 3,
  },
  {
    id: 'octagon2',
    name: { ja: '八角形', en: 'Octagon' },
    category: 'oscillator',
    description: {
      ja: '八角形が内側へ崩れてまた戻る。周期5',
      en: 'An octagon collapses inward and comes back. Period 5',
    },
    rows: [
      '...OO...',
      '..O..O..',
      '.O....O.',
      'O......O',
      'O......O',
      '.O....O.',
      '..O..O..',
      '...OO...',
    ],
    period: 5,
  },
  {
    id: 'figure-eight',
    name: { ja: '8の字', en: 'Figure eight' },
    category: 'oscillator',
    description: {
      ja: '2つの正方形が8の字を描くように変形する。周期8',
      en: 'Two squares morph as if tracing a figure eight. Period 8',
    },
    rows: ['OOO...', 'OOO...', 'OOO...', '...OOO', '...OOO', '...OOO'],
    period: 8,
  },
  {
    id: 'koks-galaxy',
    name: { ja: 'コックの銀河', en: "Kok's galaxy" },
    category: 'oscillator',
    description: {
      ja: '4本の腕が渦を巻くように回る。周期8',
      en: 'Four arms turn like a spiral. Period 8',
    },
    rows: [
      'OOOOOO.OO',
      'OOOOOO.OO',
      '.......OO',
      'OO.....OO',
      'OO.....OO',
      'OO.....OO',
      'OO.......',
      'OO.OOOOOO',
      'OO.OOOOOO',
    ],
    period: 8,
  },
  {
    id: 'tumbler',
    name: { ja: 'タンブラー', en: 'Tumbler' },
    category: 'oscillator',
    description: {
      ja: '上下にひっくり返るように揺れる。周期14',
      en: 'Rocks as if flipping upside down. Period 14',
    },
    rows: ['.O.....O.', 'O.O...O.O', 'O..O.O..O', '..O...O..', '..OO.OO..'],
    period: 14,
  },
  {
    id: 'pentadecathlon',
    name: { ja: 'ペンタデカスロン', en: 'Pentadecathlon' },
    category: 'oscillator',
    description: {
      ja: '10セルの棒から始まり、15世代かけて元に戻る',
      en: 'Starts as a 10-cell bar and returns to it after 15 generations',
    },
    rows: ['..O....O..', 'OO.OOOO.OO', '..O....O..'],
    period: 15,
  },
  {
    id: 'queen-bee-shuttle',
    name: { ja: '女王蜂シャトル', en: 'Queen bee shuttle' },
    category: 'oscillator',
    description: {
      ja: '中央の「女王蜂」が両端のブロックの間を往復する。周期30',
      en: 'The "queen bee" in the middle shuttles between two blocks. Period 30',
    },
    rows: [
      '.........O............',
      '.......O.O............',
      '......O.O.............',
      'OO...O..O...........OO',
      'OO....O.O...........OO',
      '.......O.O............',
      '.........O............',
    ],
    period: 30,
  },

  // ---- Spaceships: keep moving while keeping their shape
  GLIDER,
  {
    id: 'lwss',
    name: { ja: '軽量級宇宙船', en: 'Lightweight spaceship' },
    category: 'spaceship',
    description: {
      ja: '4世代で横に2マス進む（光速の半分）。LWSS',
      en: 'Moves 2 cells sideways every 4 generations (half the speed of light). LWSS',
    },
    rows: ['.O..O', 'O....', 'O...O', 'OOOO.'],
    period: 4,
  },
  {
    id: 'mwss',
    name: { ja: '中量級宇宙船', en: 'Middleweight spaceship' },
    category: 'spaceship',
    description: {
      ja: '軽量級を1列伸ばした宇宙船。MWSS',
      en: 'A lightweight spaceship, one column longer. MWSS',
    },
    rows: ['...O..', '.O...O', 'O.....', 'O....O', 'OOOOO.'],
    period: 4,
  },
  {
    id: 'hwss',
    name: { ja: '重量級宇宙船', en: 'Heavyweight spaceship' },
    category: 'spaceship',
    description: {
      ja: 'さらに1列伸ばした宇宙船。これより長いと崩れてしまう。HWSS',
      en: 'One more column. Any longer and it falls apart. HWSS',
    },
    rows: ['...OO..', '.O....O', 'O......', 'O.....O', 'OOOOOO.'],
    period: 4,
  },
  {
    id: 'copperhead',
    name: { ja: 'コッパーヘッド', en: 'Copperhead' },
    category: 'spaceship',
    description: {
      ja: '10世代で1マスだけ進む、ゆっくりした宇宙船',
      en: 'A slow spaceship that moves just 1 cell every 10 generations',
    },
    rows: [
      '.OO..OO.',
      '...OO...',
      '...OO...',
      'O.O..O.O',
      'O......O',
      '........',
      'O......O',
      '.OO..OO.',
      '..OOOO..',
      '........',
      '...OO...',
      '...OO...',
    ],
    period: 10,
  },

  // ---- Guns: keep shooting spaceships
  GOSPER_GLIDER_GUN,
  {
    id: 'simkin-gun',
    name: { ja: 'シムキンのグライダー銃', en: 'Simkin glider gun' },
    category: 'gun',
    description: {
      ja: '120世代ごとにグライダーを撃ち出す、小さめの銃',
      en: 'A smaller gun that fires a glider every 120 generations',
    },
    rows: [
      'OO.....OO........................',
      'OO.....OO........................',
      '.................................',
      '....OO...........................',
      '....OO...........................',
      '.................................',
      '.................................',
      '.................................',
      '.................................',
      '......................OO.OO......',
      '.....................O.....O.....',
      '.....................O......O..OO',
      '.....................OOO...O...OO',
      '..........................O......',
      '.................................',
      '.................................',
      '.................................',
      '....................OO...........',
      '....................O............',
      '.....................OOO.........',
      '.......................O.........',
    ],
  },

  // ---- Methuselahs: small seeds that take a long time to settle down
  {
    id: 'r-pentomino',
    name: { ja: 'Rペントミノ', en: 'R-pentomino' },
    category: 'methuselah',
    description: {
      ja: 'たった5セルから、落ち着くまでに1103世代かかる',
      en: 'Just 5 cells, yet it takes 1103 generations to settle',
    },
    rows: ['.OO', 'OO.', '.O.'],
  },
  {
    id: 'diehard',
    name: { ja: 'ダイハード', en: 'Diehard' },
    category: 'methuselah',
    description: { ja: '130世代目にちょうど全滅する', en: 'Dies out exactly at generation 130' },
    rows: ['......O.', 'OO......', '.O...OOO'],
  },
  {
    id: 'acorn',
    name: { ja: 'どんぐり', en: 'Acorn' },
    category: 'methuselah',
    description: {
      ja: '7セルから5206世代にわたって育ち、600以上のセルを残す',
      en: 'Grows from 7 cells for 5206 generations and leaves over 600 cells',
    },
    rows: ['.O.....', '...O...', 'OO..OOO'],
  },
  {
    id: 'b-heptomino',
    name: { ja: 'Bヘプトミノ', en: 'B-heptomino' },
    category: 'methuselah',
    description: {
      ja: '大きな構造の部品としてよく使われる7セルの種',
      en: 'A 7-cell seed often used as a part of larger structures',
    },
    rows: ['O.OO', 'OOO.', '.O..'],
  },
  {
    id: 'pi-heptomino',
    name: { ja: 'πヘプトミノ', en: 'Pi-heptomino' },
    category: 'methuselah',
    description: {
      ja: 'π の字の形から、左右対称に広がって落ち着く',
      en: 'Starts as a π shape, spreads symmetrically, then settles',
    },
    rows: ['OOO', 'O.O', 'O.O'],
  },
  {
    id: 'rabbits',
    name: { ja: 'うさぎ', en: 'Rabbits' },
    category: 'methuselah',
    description: {
      ja: '9セルから17331世代も動き続ける',
      en: 'Keeps changing for 17331 generations from just 9 cells',
    },
    rows: ['O...OOO', 'OOO..O.', '.O.....'],
  },

  // ---- Infinite growth: on a big enough board, the number of cells grows forever
  {
    id: 'ten-cell-growth',
    name: { ja: '10セルの無限成長', en: '10-cell infinite growth' },
    category: 'growth',
    description: {
      ja: '無限に増え続けるパターンのうち、最も少ない10セルのもの',
      en: 'The smallest pattern that grows forever, with only 10 cells',
    },
    rows: ['......O.', '....O.OO', '....O.O.', '....O...', '..O.....', 'O.O.....'],
  },
  {
    id: 'five-square-growth',
    name: { ja: '5×5の無限成長', en: '5×5 infinite growth' },
    category: 'growth',
    description: {
      ja: '5×5の枠に収まる、無限に増え続けるパターン',
      en: 'A pattern that fits in a 5×5 box and grows forever',
    },
    rows: ['OOO.O', 'O....', '...OO', '.OO.O', 'O.O.O'],
  },
  {
    id: 'one-line-growth',
    name: { ja: '1行の無限成長', en: 'One-row infinite growth' },
    category: 'growth',
    description: {
      ja: '高さ1の横線だけでできた、無限に増え続けるパターン',
      en: 'A pattern made of a single 1-cell-high line that grows forever',
    },
    rows: ['OOOOOOOO.OOOOO...OOO......OOOOOOO.OOOOO'],
  },
];

/**
 * Returns a new board with the pattern on it. Live cells already on the board stay.
 *
 * @param grid    Board to put it on
 * @param pattern Pattern to put
 * @param left    X position of the pattern's left edge (cells)
 * @param top     Y position of the pattern's top edge (cells)
 */
export function placePattern(grid: Grid, pattern: Pattern, left: number, top: number): Grid {
  const cells = grid.cells.slice();
  pattern.rows.forEach((row, dy) => {
    [...row].forEach((mark, dx) => {
      if (mark === 'O') {
        cells[indexOf(grid, left + dx, top + dy)] = ALIVE;
      }
    });
  });
  return { ...grid, cells };
}

/**
 * Returns a new board with the pattern at the center.
 *
 * @param grid    Board to put it on
 * @param pattern Pattern to put
 */
export function placeCentered(grid: Grid, pattern: Pattern): Grid {
  const width = Math.max(...pattern.rows.map((row) => row.length));
  const left = Math.floor((grid.width - width) / 2);
  const top = Math.floor((grid.height - pattern.rows.length) / 2);
  return placePattern(grid, pattern, left, top);
}
