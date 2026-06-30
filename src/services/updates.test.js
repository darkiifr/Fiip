import { describe, expect, it, vi } from 'vitest';

import { fetchGitHubLatestRelease, getUpdatePresentation } from './updates';

describe('update presentation', () => {
  it('prefers the updater changelog and keeps a GitHub fallback body readable', () => {
    expect(getUpdatePresentation({
      version: '3.1.0',
      date: '2026-06-27',
      body: '## Added\n- Better themes',
    }, {
      tag_name: 'v3.1.0',
      html_url: 'https://github.com/darkiifr/Fiip/releases/tag/v3.1.0',
      body: 'Fallback body',
    })).toEqual({
      version: '3.1.0',
      date: '2026-06-27',
      changelog: '## Added\n- Better themes',
      releaseUrl: 'https://github.com/darkiifr/Fiip/releases/tag/v3.1.0',
    });
  });

  it('fetches the latest GitHub release metadata', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        tag_name: 'v3.1.0',
        body: '- Fixed themes',
        html_url: 'https://github.com/darkiifr/Fiip/releases/tag/v3.1.0',
      }),
    });

    await expect(fetchGitHubLatestRelease({ fetchImpl })).resolves.toMatchObject({
      tag_name: 'v3.1.0',
      body: '- Fixed themes',
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.github.com/repos/darkiifr/Fiip/releases/latest', expect.any(Object));
  });
});
