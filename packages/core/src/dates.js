/**
 * Shift a 'YYYY-MM-DD' date by whole days. Pure calendar arithmetic (UTC), no timezone drift.
 * @param {string} date
 * @param {number} days
 * @returns {string}
 */
export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  const out = new Date(Date.UTC(y, m - 1, d + days));
  return out.toISOString().slice(0, 10);
}
