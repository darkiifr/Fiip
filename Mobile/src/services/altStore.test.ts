import { Linking } from 'react-native';

import {
  ALTSTORE_INSTALL_URL,
  ALTSTORE_IPA_URL,
  ALTSTORE_SOURCE_URL,
  AltStoreService,
} from './altStore';

jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    openURL: jest.fn(() => Promise.resolve()),
  },
}));

describe('AltStoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps source and direct IPA URLs separate', () => {
    expect(ALTSTORE_SOURCE_URL).toContain('altstore.json');
    expect(ALTSTORE_IPA_URL).toContain('FiipMobile-Unsigned.ipa');
    expect(ALTSTORE_INSTALL_URL).toBe(`altstore://install?url=${encodeURIComponent(ALTSTORE_IPA_URL)}`);
  });

  it('opens the direct IPA install URL for installation', async () => {
    await AltStoreService.installApp();

    expect(Linking.openURL).toHaveBeenCalledWith(ALTSTORE_INSTALL_URL);
  });
});
