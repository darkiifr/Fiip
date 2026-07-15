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
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
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
  authStatus.textContent = 'Connexion...';
  try {
    const result = await signInFromPopup({
      runtime: chrome.runtime,
      email: emailInput.value,
      password: passwordInput.value,
    });
    if (result?.error) {
      throw new Error(result.error);
    }
    passwordInput.value = '';
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
