export { addDays } from '@slotwise/core';

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
