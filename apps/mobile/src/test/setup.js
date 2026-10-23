// Shared test setup: deterministic ids, a stub router and the app's translations.
require('react-native-gesture-handler/jestSetup');

let mockCounter = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `id-${++mockCounter}` }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  Redirect: () => null,
}));

// Tests read the Vietnamese interface, the product's default language.
require('../i18n').default.changeLanguage('vi');
