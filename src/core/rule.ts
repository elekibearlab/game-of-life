/**
 * The rule for birth and survival: how many live neighbors a cell needs to be alive in the next generation.
 * They are lists of counts, so 2D and 3D can use the same type (up to 8 in 2D, up to 26 in 3D).
 */
export type Rule = {
  /** A dead cell is born if this many of its neighbors are alive */
  birth: number[];
  /** A live cell survives if this many of its neighbors are alive */
  survive: number[];
  /**
   * How many states a cell can have. Default is 2 (only alive and dead).
   * With 3 or more, it is a "Generations" rule. A cell that can't survive does not disappear at once.
   * It goes through states - 2 "dying" stages first. Dying cells are not counted as neighbors, and nothing is born there
   */
  states?: number;
};

/** Conway's Game of Life. Born with 3, survives with 2 or 3 (B3/S23) */
export const CONWAY: Rule = { birth: [3], survive: [2, 3] };

/**
 * Turns a list like '23', '4,5' or '13-14,17-19' into an array of numbers.
 * 3D needs 2-digit numbers, so commas and ranges are allowed.
 * '23' (no commas or ranges) is read the usual 2D way: one digit = one number.
 *
 * @param text List of numbers
 */
function parseNumbers(text: string): number[] {
  if (text === '') {
    return [];
  }
  if (/^\d+$/.test(text)) {
    return [...text].map(Number);
  }
  return text.split(',').flatMap((part) => {
    const [from, to = from] = part.split('-').map(Number);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  });
}

/**
 * Turns numbers into a string. Numbers in a row become 'a-b'.
 *
 * @param values Numbers, smallest first
 */
function formatNumbers(values: number[]): string {
  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i <= values.length; i++) {
    if (i < values.length && values[i] === values[i - 1] + 1) {
      continue;
    }
    const from = values[start];
    const to = values[i - 1];
    parts.push(from === to ? `${from}` : `${from}-${to}`);
    start = i;
  }
  return parts.join(',');
}

/**
 * Turns a string like 'B3/S23' or 'B13-14,17-19/S13-26' into a rule.
 * Generations rules add '/C' and the number of states at the end, like 'B6-8/S4-7/C10'.
 *
 * @param text 'B' + birth counts, then '/S' + survival counts
 */
export function parseRule(text: string): Rule {
  const matched = /^B([\d,-]*)\/S([\d,-]*)(?:\/C(\d+))?$/i.exec(text.trim());
  if (!matched) {
    throw new Error(`ルールの形式が不正です: ${text}`);
  }
  const rule: Rule = { birth: parseNumbers(matched[1]), survive: parseNumbers(matched[2]) };
  if (matched[3] && Number(matched[3]) > 2) {
    rule.states = Number(matched[3]);
  }
  return rule;
}

/**
 * Turns a rule into a string. Shown on screen as the rule name.
 *
 * @param rule  Rule to turn into a string
 * @param style 'digits' is the usual 2D form, 'B3/S23'. 'list' is the 3D form, 'B1,3/S0-6'.
 *              In 3D, '13' could mean "1 and 3" or "13", so there are two forms
 */
export function formatRule(rule: Rule, style: 'digits' | 'list' = 'digits'): string {
  const format = style === 'digits' ? (values: number[]) => values.join('') : formatNumbers;
  const states = rule.states && rule.states > 2 ? `/C${rule.states}` : '';
  return `B${format(rule.birth)}/S${format(rule.survive)}${states}`;
}
