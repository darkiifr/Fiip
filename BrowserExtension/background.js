/* global chrome */

import { saveClip } from './background-helpers.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'FIIP_SAVE_CLIP') {
    return false;
  }

  (async () => {
    try {
      sendResponse(await saveClip(message.payload, {
        openTab: chrome.tabs.create,
        storageGet: chrome.storage.sync.get,
      }));
    } catch (error) {
      sendResponse({ error: error.message || 'Clip failed.' });
    }
  })();

  return true;
});
