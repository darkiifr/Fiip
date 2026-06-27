/* global chrome */

const status = document.getElementById('status');
const button = document.getElementById('clip-selection');

button.addEventListener('click', async () => {
  status.textContent = 'Capture en cours...';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    status.textContent = 'Aucun onglet actif.';
    return;
  }

  const payload = await chrome.tabs.sendMessage(tab.id, { type: 'FIIP_COLLECT_CLIP' });
  const result = await chrome.runtime.sendMessage({ type: 'FIIP_SAVE_CLIP', payload });

  if (result?.error) {
    status.textContent = result.error;
    return;
  }

  status.textContent = result?.mode === 'supabase' ? 'Capture envoyee au cloud.' : 'Capture envoyee a Fiip.';
});
