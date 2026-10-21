import { describe, expect, it } from 'vitest';
import { CONWAY, formatRule, parseRule } from '@/core/rule';

describe('rule', () => {
  it('B3/S23 を読むとコンウェイのルールになる', () => {
    expect(parseRule('B3/S23')).toEqual(CONWAY);
  });

  it('2D の書き方は1文字ずつの数として読み、そのまま戻せる', () => {
    expect(formatRule(parseRule('B36/S23'))).toBe('B36/S23');
  });

  it('3D の書き方は2桁の数と範囲を読める', () => {
    expect(parseRule('B13-14,17-19/S13-15')).toEqual({
      birth: [13, 14, 17, 18, 19],
      survive: [13, 14, 15],
    });
  });

  it('list 形式では連続部分が範囲にまとまる', () => {
    expect(formatRule(parseRule('B1,3/S0,1,2,3,4,5,6'), 'list')).toBe('B1,3/S0-6');
  });

  it('形式が違えばエラーにする', () => {
    expect(() => parseRule('23/3')).toThrow();
  });
});

describe('Generations ルールの表記', () => {
  it('/C で状態の数を読み、文字列に戻せる', () => {
    const rule = parseRule('B6-8/S4-7/C10');
    expect(rule.states).toBe(10);
    expect(formatRule(rule, 'list')).toBe('B6-8/S4-7/C10');
  });

  it('/C2 は普通のルールと同じ扱いにする', () => {
    expect(parseRule('B3/S23/C2')).toEqual(parseRule('B3/S23'));
  });
});
