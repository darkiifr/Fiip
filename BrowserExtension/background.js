/* global chrome */

import {
  getAuthState,
  saveClip,
  signInWithPassword,
  signOut,
} from './background-helpers.js';
import { FIIP_EXTENSION_CONFIG } from './extension-config.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (![
    'FIIP_AUTH_STATE',
    'FIIP_AUTH_SIGN_IN',
    'FIIP_AUTH_SIGN_OUT',
    'FIIP_SAVE_CLIP',
  ].includes(message?.type)) {
    return false;
  }

  (async () => {
    try {
      const dependencies = {
        config: FIIP_EXTENSION_CONFIG,
        storageGet: chrome.storage.local.get,
        storageSet: chrome.storage.local.set,
        storageRemove: chrome.storage.local.remove,
      };
      if (message.type === 'FIIP_AUTH_STATE') {
        sendResponse(await getAuthState(dependencies));
      } else if (message.type === 'FIIP_AUTH_SIGN_IN') {
        sendResponse(await signInWithPassword({
          email: message.email,
          password: message.password,
        }, dependencies));
      } else if (message.type === 'FIIP_AUTH_SIGN_OUT') {
        sendResponse(await signOut(dependencies));
      } else {
        sendResponse(await saveClip(message.payload, dependencies));
      }
    } catch (error) {
      sendResponse({ error: error.message || 'Action Fiip impossible.' });
    }
  })();

  return true;
});
