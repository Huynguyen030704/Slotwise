module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  testMatch: ['<rootDir>/src/**/*.test.js'],
  moduleNameMapper: { '^lucide-react-native/icons/.*$': '<rootDir>/src/test/iconStub.js' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|i18next|react-i18next|@slotwise/.*))',
  ],
};
