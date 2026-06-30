/* global chrome */
const { buildClipPayload } = globalThis.FiipContentHelpers;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'FIIP_COLLECT_CLIP') {
    return false;
  }

  sendResponse(buildClipPayload({
    document,
    location,
    selectionText: window.getSelection()?.toString() || '',
    captureMode: message.captureMode,
  }));

  return true;
});
