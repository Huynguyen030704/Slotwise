/**
 * Human duration, e.g. 90 -> "1 giờ 30 phút".
 * @param {number} min
 * @param {(key: string, opts?: Record<string, unknown>) => string} t
 */
export function formatDuration(min, t) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return t('common.minutes', { n: m });
  if (m === 0) return t('common.hours', { n: h });
  return t('common.hoursMinutes', { h, m });
}

/** Minutes from 00:00 -> "08:30". */
/** @param {number} min */
export function formatClock(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
