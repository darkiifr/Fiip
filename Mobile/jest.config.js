module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect", "<rootDir>/__mocks__/setup.js"],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-paper|react-native-sfsymbols|react-native-haptic-feedback|@callstack/liquid-glass)/)'
  ],
};
