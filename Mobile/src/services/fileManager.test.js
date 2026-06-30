import RNFS from 'react-native-fs';
import { errorCodes, pick } from '@react-native-documents/picker';

import { importMarkdownFile } from './fileManager';

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: jest.fn((error) => Boolean(error?.code)),
  pick: jest.fn(),
  types: { allFiles: '*/*', plainText: 'text/plain' },
}));

describe('fileManager importMarkdownFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports the first picked markdown file with the maintained document picker', async () => {
    pick.mockResolvedValue([{ uri: 'content://picked/note.md', name: 'note.md' }]);
    RNFS.readFile.mockResolvedValue('# Imported title\n\nBody text');

    const result = await importMarkdownFile();

    expect(pick).toHaveBeenCalledWith({ type: ['text/plain', '*/*'] });
    expect(RNFS.readFile).toHaveBeenCalledWith('content://picked/note.md', 'utf8');
    expect(result).toMatchObject({
      success: true,
      note: {
        title: 'Imported title',
        content: 'Body text',
      },
    });
  });

  it('returns cancelled when the native picker is dismissed', async () => {
    pick.mockRejectedValue(Object.assign(new Error('cancelled'), { code: errorCodes.OPERATION_CANCELED }));

    await expect(importMarkdownFile()).resolves.toEqual({ success: false, cancelled: true });
  });
});
