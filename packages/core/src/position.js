/**
 * Fractional indexing over base-62 strings, so reordering touches one node only.
 * Keys never end in '0', which guarantees there is always room between two keys.
 */

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = DIGITS.length;

/**
 * @param {string} a lower bound, '' means start
 * @param {string | null} b upper bound, null means end
 * @returns {string}
 */
function midpoint(a, b) {
  if (b !== null) {
    let n = 0;
    while ((a[n] || '0') === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const digitA = a ? DIGITS.indexOf(a[0]) : 0;
  const digitB = b !== null ? DIGITS.indexOf(b[0]) : BASE;
  if (digitB - digitA > 1) return DIGITS[Math.round(0.5 * (digitA + digitB))];
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return DIGITS[digitA] + midpoint(a.slice(1), null);
}

/**
 * Key strictly between `a` and `b` (null = open end).
 * @param {string | null} a
 * @param {string | null} b
 * @returns {string}
 */
export function positionBetween(a, b) {
  if (a !== null && b !== null && a >= b) {
    throw new Error(`positionBetween: ${a} must be smaller than ${b}`);
  }
  return midpoint(a ?? '', b);
}

/**
 * Evenly spaced keys for n items, used when seeding a list.
 * @param {number} n
 * @returns {string[]}
 */
export function initialPositions(n) {
  /** @type {string[]} */
  const keys = [];
  /** @type {string | null} */
  let prev = null;
  for (let i = 0; i < n; i++) {
    prev = positionBetween(prev, null);
    keys.push(prev);
  }
  return keys;
}
