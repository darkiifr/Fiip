/* global chrome */

import {
  captureActiveTab,
  getAuthStateFromPopup,
  signInFromPopup,
  signOutFromPopup,
} from './popup-helpers.js';

const status = document.getElementById('status');
const button = document.getElementById('clip-selection');
const captureModeInput = document.getElementById('capture-mode');
const openFiipLink = document.getElementById('open-fiip');
const authForm = document.getElementById('auth-form');
const accountPanel = document.getElementById('account-panel');
const accountEmail = document.getElementById('account-email');
const signInButton = document.getElementById('sign-in');
const signOutButton = document.getElementById('sign-out');
const authStatus = document.getElementById('auth-status');

function renderAuthState(result = {}) {
  const authenticated = Boolean(result.authenticated || result.user);
  authForm.hidden = authenticated;
  accountPanel.hidden = !authenticated;
  accountEmail.textContent = result.user?.email || 'Compte Fiip connecté';
  authStatus.textContent = authenticated
    ? 'Les captures sont synchronisées avec Fiip Cloud.'
    : (result.error || 'Connectez-vous pour synchroniser les captures même si Fiip est fermé.');
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  signInButton.disabled = true;
  authStatus.textContent = 'Ouverture de Fiip...';
  try {
    const result = await signInFromPopup({
      runtime: chrome.runtime,
    });
    if (result?.error) {
      throw new Error(result.error);
    }
    if (result?.openUrl) {
      await chrome.tabs.create({ url: result.openUrl, active: true });
      authStatus.textContent = 'Connectez-vous dans Fiip, puis rouvrez cette extension.';
      return;
    }
    renderAuthState(result);
  } catch (error) {
    authStatus.textContent = error?.message || 'Connexion impossible.';
  } finally {
    signInButton.disabled = false;
  }
});

signOutButton.addEventListener('click', async () => {
  signOutButton.disabled = true;
  try {
    const result = await signOutFromPopup({ runtime: chrome.runtime });
    if (result?.error) {
      throw new Error(result.error);
    }
    renderAuthState(result);
  } catch (error) {
    authStatus.textContent = error?.message || 'Déconnexion impossible.';
  } finally {
    signOutButton.disabled = false;
  }
});

openFiipLink.addEventListener('click', async (event) => {
  event.preventDefault();
  const url = openFiipLink.href;
  if (!url || url === '#') {return;}
  try {
    await chrome.tabs.create({ url, active: true });
    status.textContent = 'Ouverture de Fiip...';
  } catch {
    status.textContent = 'Impossible d’ouvrir Fiip depuis Chrome.';
  }
});

button.addEventListener('click', async () => {
  await captureActiveTab({
    tabs: chrome.tabs,
    runtime: chrome.runtime,
    scripting: chrome.scripting,
    status,
    captureModeInput,
    openFiipLink,
  });
});

getAuthStateFromPopup({ runtime: chrome.runtime })
  .then(renderAuthState)
  .catch((error) => {
    authStatus.textContent = error?.message || 'État du compte indisponible.';
  });
