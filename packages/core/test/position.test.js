import { describe, expect, it } from 'vitest';
import { initialPositions, positionBetween } from '../src/position.js';

describe('positionBetween', () => {
  it('returns a key for an empty list', () => {
    expect(positionBetween(null, null)).toBe('V');
  });

  it('puts keys strictly between neighbours', () => {
    const a = 'V';
    const b = positionBetween(a, null);
    const m = positionBetween(a, b);
    expect(a < m && m < b).toBe(true);
  });

  it('inserts before the first key', () => {
    const first = 'V';
    const k = positionBetween(null, first);
    expect(k < first).toBe(true);
  });

  it('keeps finding room when inserting repeatedly at the same spot', () => {
    let lo = 'V';
    const hi = 'W';
    for (let i = 0; i < 40; i++) {
      const k = positionBetween(lo, hi);
      expect(lo < k && k < hi).toBe(true);
      lo = k;
    }
  });

  it('keeps finding room when inserting repeatedly at the start', () => {
    let hi = 'V';
    for (let i = 0; i < 40; i++) {
      const k = positionBetween(null, hi);
      expect(k < hi).toBe(true);
      hi = k;
    }
  });

  it('handles adjacent digits with a longer upper bound', () => {
    expect(positionBetween('V', 'W1')).toBe('W');
    const k = positionBetween('V', 'W');
    expect('V' < k && k < 'W').toBe(true);
  });

  it('rejects an inverted range', () => {
    expect(() => positionBetween('b', 'a')).toThrow();
    expect(() => positionBetween('a', 'a')).toThrow();
  });
});

describe('initialPositions', () => {
  it('creates strictly increasing keys', () => {
    const keys = initialPositions(60);
    expect(keys).toHaveLength(60);
    for (let i = 1; i < keys.length; i++) expect(keys[i - 1] < keys[i]).toBe(true);
  });

  it('returns nothing for zero items', () => {
    expect(initialPositions(0)).toEqual([]);
  });
});
