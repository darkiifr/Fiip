const CONTENT_SCRIPT_FILES = ['content-helpers.js', 'content.js'];
const NO_RECEIVER_PATTERNS = [
  /Could not establish connection/i,
  /Receiving end does not exist/i,
  /The message port closed/i,
];

function canCaptureTab(tab) {
  return !tab.url || /^https?:\/\//i.test(tab.url);
}

function isMissingContentScriptError(error) {
  const message = error?.message || String(error || '');
  return NO_RECEIVER_PATTERNS.some((pattern) => pattern.test(message));
}

async function collectClipPayload({ tabs, scripting, tabId, captureMode }) {
  const message = { type: 'FIIP_COLLECT_CLIP', captureMode };

  try {
    return await tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!scripting?.executeScript || !isMissingContentScriptError(error)) {
      throw error;
    }

    await scripting.executeScript({
      target: { tabId },
      files: CONTENT_SCRIPT_FILES,
    });

    return tabs.sendMessage(tabId, message);
  }
}

export async function captureActiveTab({ tabs, runtime, scripting, status, captureModeInput }) {
  status.textContent = 'Capture en cours...';
  try {
    const [tab] = await tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      status.textContent = 'Aucun onglet actif.';
      return { error: 'NO_ACTIVE_TAB' };
    }

    if (!canCaptureTab(tab)) {
      status.textContent = 'Cette page ne peut pas être capturée par Chrome.';
      return { error: 'UNSUPPORTED_PAGE' };
    }

    const captureMode = captureModeInput?.value === 'selection' ? 'selection' : 'readable';
    const payload = await collectClipPayload({ tabs, scripting, tabId: tab.id, captureMode });
    const result = await runtime.sendMessage({ type: 'FIIP_SAVE_CLIP', payload });

    if (result?.error) {
      status.textContent = result.error;
      return result;
    }

    status.textContent = result?.mode === 'supabase' ? 'Capture envoyée au cloud.' : 'Capture envoyée à Fiip.';
    return result;
  } catch (error) {
    status.textContent = error?.message || 'Capture impossible sur cette page.';
    return { error: status.textContent };
  }
}
