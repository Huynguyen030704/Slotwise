import { localDate } from '../data/time';

/**
 * Shift a 'YYYY-MM-DD' date by whole days (calendar arithmetic, no timezone drift).
 * @param {string} date
 * @param {number} days
 */
export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + days));
}

/**
 * @param {string} date 'YYYY-MM-DD'
 * @param {string} locale
 */
export function formatDay(date, locale) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(y, m - 1, d),
  );
}
