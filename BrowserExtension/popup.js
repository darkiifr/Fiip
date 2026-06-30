/* global chrome */

import { captureActiveTab } from './popup-helpers.js';

const status = document.getElementById('status');
const button = document.getElementById('clip-selection');
const captureModeInput = document.getElementById('capture-mode');

button.addEventListener('click', async () => {
  await captureActiveTab({
    tabs: chrome.tabs,
    runtime: chrome.runtime,
    scripting: chrome.scripting,
    status,
    captureModeInput,
  });
});
