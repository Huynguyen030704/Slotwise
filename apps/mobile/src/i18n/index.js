import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import vi from './vi';
import en from './en';

export const SUPPORTED = ['vi', 'en'];

/** Vietnamese is the default; English only when the device asks for it. */
function detectLanguage() {
  const code = getLocales()[0]?.languageCode;
  return code === 'en' ? 'en' : 'vi';
}

i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: detectLanguage(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
});

export default i18n;
