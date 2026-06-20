import { afterEach, describe, expect, it, vi } from 'vitest';

import { soundManager } from './soundManager';

describe('soundManager API contract', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    soundManager.setAppSoundEnabled(true);
    soundManager.setChatSoundEnabled(true);
  });

  it('exposes the settings methods used by App', () => {
    expect(soundManager.setAppSoundEnabled).toBeTypeOf('function');
    expect(soundManager.setChatSoundEnabled).toBeTypeOf('function');
  });

  it('uses App sound settings when localStorage has no explicit value', () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const audioMock = vi.fn(function AudioMock() {
      this.currentTime = 0;
      this.pause = pause;
      this.play = play;
      this.volume = 1;
    });
    vi.stubGlobal('Audio', audioMock);

    soundManager.setAppSoundEnabled(false);
    soundManager.play('interaction');

    expect(audioMock).not.toHaveBeenCalled();

    soundManager.setAppSoundEnabled(true);
    soundManager.play('interaction');

    expect(audioMock).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('treats editor aliases as interface sounds', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const audioMock = vi.fn(function AudioMock() {
      this.currentTime = 0;
      this.pause = vi.fn();
      this.play = play;
      this.volume = 1;
    });
    vi.stubGlobal('Audio', audioMock);

    await soundManager.play('crystal-chime');

    expect(audioMock).toHaveBeenCalledTimes(1);
    expect(audioMock.mock.instances[0].volume).toBe(0.2);
  });
});
