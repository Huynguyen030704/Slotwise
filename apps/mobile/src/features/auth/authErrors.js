/**
 * Turn a Supabase / network error message into an i18n key under `auth.errors`, so people read
 * what happened and what to do instead of a raw server string.
 * @param {string} message
 * @returns {string}
 */
export function authErrorKey(message) {
  const m = message.toLowerCase();
  if (/invalid login credentials|invalid credentials/.test(m)) return 'invalidCredentials';
  if (/already registered|already been registered|user already exists/.test(m))
    return 'alreadyRegistered';
  if (/email not confirmed/.test(m)) return 'emailNotConfirmed';
  if (/rate limit|too many|over_email_send_rate_limit|security purposes/.test(m))
    return 'rateLimited';
  if (/network|fetch|timeout|offline/.test(m)) return 'network';
  if (/weak|at least \d+ characters|password should/.test(m)) return 'weakPassword';
  if (/provider is not enabled|unsupported provider/.test(m)) return 'providerOff';
  return 'generic';
}

/** @param {string} email */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export const MIN_PASSWORD = 6;
