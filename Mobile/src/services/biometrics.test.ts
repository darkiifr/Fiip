/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

jest.mock('react-native-biometrics', () => {
  return jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn(() => Promise.resolve({ available: true })),
    simplePrompt: jest.fn(() => Promise.resolve({ success: true })),
  }));
});

jest.mock('../utils/hapticEngine', () => ({
  triggerHaptic: jest.fn(),
}));

describe('mobile Fiip identity', () => {
  it('uses Fiip for native labels and biometric copy', () => {
    const { DEFAULT_BIOMETRIC_PROMPT } = require('./biometrics');
    const androidStrings = fs.readFileSync(path.join(__dirname, '../../android/app/src/main/res/values/strings.xml'), 'utf8');
    const launchScreen = fs.readFileSync(path.join(__dirname, '../../ios/FiipMobile/LaunchScreen.storyboard'), 'utf8');

    expect(DEFAULT_BIOMETRIC_PROMPT).toContain('Fiip');
    expect(DEFAULT_BIOMETRIC_PROMPT).not.toContain('Ship Intelligence');
    expect(androidStrings).toContain('<string name="app_name">Fiip</string>');
    expect(androidStrings).not.toContain('Ship Intelligence');
    expect(launchScreen).toContain('Fiip');
    expect(launchScreen).not.toContain('Fiip Intelligence');
  });
});
