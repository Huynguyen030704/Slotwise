import { MIN_PASSWORD, authErrorKey, isValidEmail } from './authErrors';

describe('authErrorKey', () => {
  it.each([
    ['Invalid login credentials', 'invalidCredentials'],
    ['User already registered', 'alreadyRegistered'],
    ['Email not confirmed', 'emailNotConfirmed'],
    ['email rate limit exceeded', 'rateLimited'],
    ['For security purposes, you can only request this after 20 seconds', 'rateLimited'],
    ['TypeError: Network request failed', 'network'],
    ['Failed to fetch', 'network'],
    ['Password should be at least 6 characters', 'weakPassword'],
    ['Unsupported provider: provider is not enabled', 'providerOff'],
    ['something unexpected', 'generic'],
  ])('maps "%s" to %s', (message, key) => {
    expect(authErrorKey(message)).toBe(key);
  });
});

describe('isValidEmail', () => {
  it('accepts normal addresses and trims spaces', () => {
    expect(isValidEmail('ten@congty.vn')).toBe(true);
    expect(isValidEmail('  ten@congty.vn ')).toBe(true);
  });

  it('rejects incomplete addresses', () => {
    for (const bad of ['', 'ten', 'ten@', '@congty.vn', 'ten@congty', 'ten @congty.vn']) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });

  it('keeps the password minimum in one place', () => {
    expect(MIN_PASSWORD).toBe(6);
  });
});
