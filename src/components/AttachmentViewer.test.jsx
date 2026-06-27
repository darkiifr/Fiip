import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AttachmentViewer from './AttachmentViewer';

vi.mock('@tauri-apps/plugin-opener', () => ({
  openPath: vi.fn(),
  openUrl: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(async () => 'C:/Users/Test/AppData/Roaming/com.fiip.app'),
  join: vi.fn(async (...parts) => parts.join('/')),
}));

vi.mock('../services/attachmentCache', async () => {
  const actual = await vi.importActual('../services/attachmentCache');
  return {
    ...actual,
    getAttachmentPreviewUrl: vi.fn(async (attachment) => attachment.url || ''),
  };
});

describe('AttachmentViewer', () => {
  it('renders an image attachment preview', async () => {
    render(<AttachmentViewer attachment={{ name: 'capture.png', type: 'image', url: 'blob:image' }} onClose={vi.fn()} />);

    expect(await screen.findByAltText('capture.png')).toBeInTheDocument();
  });

  it('shows fallback for unsupported attachments', async () => {
    render(<AttachmentViewer attachment={{ name: 'archive.zip', type: 'archive', size: 42 }} onClose={vi.fn()} />);

    expect(await screen.findByText('Apercu indisponible')).toBeInTheDocument();
  });
});
