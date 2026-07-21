/* global chrome */

import { createClerkClient } from '@clerk/chrome-extension/client';

import {
  getAuthState,
  saveClip,
  getClerkSignInUrl,
  signOut,
} from './background-helpers.js';
import { FIIP_EXTENSION_CONFIG } from './extension-config.js';

let clerkClientPromise = null;

async function getClerkClient() {
  if (!clerkClientPromise) {
    clerkClientPromise = createClerkClient({
      publishableKey: FIIP_EXTENSION_CONFIG.clerkPublishableKey,
      syncHost: FIIP_EXTENSION_CONFIG.clerkSyncHost,
      background: true,
    });
  }
  return clerkClientPromise;
}

async function createClerkSession() {
  const clerk = await getClerkClient();
  const token = await clerk.session?.getToken();
  return {
    token,
    user: clerk.user ? {
      id: clerk.user.id,
      email: clerk.user.primaryEmailAddress?.emailAddress || '',
    } : null,
  };
}

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
        createClerkSession,
        clerkSignOut: async () => {
          const clerk = await getClerkClient();
          await clerk.signOut();
        },
        storageGet: chrome.storage.local.get,
        storageSet: chrome.storage.local.set,
        storageRemove: chrome.storage.local.remove,
      };
      if (message.type === 'FIIP_AUTH_STATE') {
        sendResponse(await getAuthState(dependencies));
      } else if (message.type === 'FIIP_AUTH_SIGN_IN') {
        sendResponse({ authenticated: false, openUrl: getClerkSignInUrl(FIIP_EXTENSION_CONFIG) });
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
