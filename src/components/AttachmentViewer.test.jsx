import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AttachmentViewer from './AttachmentViewer';
import { openPath } from '@tauri-apps/plugin-opener';

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
    resolveAttachmentCachePath: vi.fn(async (attachment) => attachment.path || `C:/Users/Test/AppData/Roaming/com.fiip.app/${attachment.cachePath}`),
  };
});

describe('AttachmentViewer', () => {
  it('renders an image attachment preview', async () => {
    render(<AttachmentViewer attachment={{ name: 'capture.png', type: 'image', url: 'https://example.com/capture.png' }} onClose={vi.fn()} />);

    expect(await screen.findByAltText('capture.png')).toBeInTheDocument();
  });

  it('renders a cached local image preview from an app-created blob url', async () => {
    render(<AttachmentViewer attachment={{ name: 'local.webp', type: 'image', cachePath: 'attachments/note/local.webp', url: 'blob:http://localhost/local' }} onClose={vi.fn()} />);

    expect(await screen.findByAltText('local.webp')).toHaveAttribute('src', 'blob:http://localhost/local');
  });

  it('shows selectable OCR text over image attachments', async () => {
    render(<AttachmentViewer attachment={{ name: 'scan.png', type: 'image', url: 'https://example.com/scan.png', ocrText: 'Facture 42 EUR' }} onClose={vi.fn()} />);

    expect(await screen.findByLabelText('Texte OCR sélectionnable')).toHaveTextContent('Facture 42 EUR');
  });

  it('renders cached audio from an app-created blob url', async () => {
    render(<AttachmentViewer attachment={{ name: 'voice.mp3', type: 'audio', cachePath: 'attachments/note/voice.mp3', url: 'blob:http://localhost/audio' }} onClose={vi.fn()} />);

    expect(await screen.findByText('voice.mp3')).toBeInTheDocument();
    expect(document.querySelector('audio')).toHaveAttribute('src', 'blob:http://localhost/audio');
  });

  it('opens local filesystem attachments through the native opener', async () => {
    render(<AttachmentViewer attachment={{ name: 'report.docx', type: 'document', path: 'C:/Users/Test/report.docx' }} onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /ouvrir le fichier/i }));

    expect(openPath).toHaveBeenCalledWith('C:/Users/Test/report.docx');
  });

  it('positions OCR words on top of the image when boxes are available', async () => {
    render(<AttachmentViewer attachment={{
      name: 'scan.png',
      type: 'image',
      url: 'https://example.com/scan.png',
      ocrText: 'Facture 42 EUR',
      ocrWords: [
        { text: 'Facture', bbox: { x: 10, y: 20, width: 80, height: 22 }, sourceWidth: 200, sourceHeight: 100 },
      ],
    }} onClose={vi.fn()} />);

    expect(await screen.findByLabelText("Texte OCR sélectionnable sur l'image")).toHaveTextContent('Facture');
  });

  it('shows fallback for unsupported attachments', async () => {
    render(<AttachmentViewer attachment={{ name: 'archive.zip', type: 'archive', size: 42 }} onClose={vi.fn()} />);

    expect(await screen.findByText('Apercu indisponible')).toBeInTheDocument();
  });
});
