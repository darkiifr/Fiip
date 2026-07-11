import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalSize, LogicalPosition, currentMonitor } from '@tauri-apps/api/window';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { type } from '@tauri-apps/plugin-os';
import { Bot, Crown, Database, FileText, Link, Lock, Plus, Search, Settings, Share2 } from 'lucide-react';
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';

import OnboardingView from "./components/OnboardingView";
import SettingsView from "./components/SettingsView";
import { CommandPalette } from "./components/ui/CommandPalette";
import AuthModal from "./components/AuthModal";
import Dexter from "./components/Dexter";
import Editor from "./components/Editor";
import LicenseModal from "./components/LicenseModal";
import LoadingScreen from "./components/LoadingScreen";
import OfflineConnectionDialog from "./components/OfflineConnectionDialog";
import ShareModal from "./components/ShareModal";
import UnifiedSidebar from "./components/UnifiedSidebar";
import HomeDashboard from "./components/HomeDashboard";
import Titlebar from "./components/Titlebar";
import UserProfileModal from "./components/UserProfileModal";
import { buildPublicNoteUrl } from "./config/links";
import {
  authenticateBiometricLock,
  BIOMETRIC_LOCK_STORAGE_KEY,
  getBiometricPlatformInfo,
  getBiometricUserMessage,
} from './services/biometricLock';
import { calculateTotalUsage, importFiinFromPath, normalizeFiinNotePayload } from "./services/fileManager";
import { keyAuthService } from "./services/keyauth";
import { queuePendingNoteSync, syncNotesNow } from "./services/noteSync";
import { soundManager } from "./services/soundManager";
import { createNoteDraft, createTask, defaultHomeWidgets, filterNotesAdvanced, normalizeNotebook, removeTaskById } from './services/fiipV1';
import { authService, dataService, getStorageLimit, supabase } from './services/supabase';
import { applyTheme } from './services/theme';
import { normalizeNoteTags } from './utils/noteTags';

import "./App.css";

const getCurrentTimestamp = () => new Date().getTime();

async function fitMainWindowToVisibleArea() {
  if (!window.__TAURI_INTERNALS__) return;

  try {
    const appWindow = getCurrentWindow();
    const monitor = await currentMonitor();
    const workArea = monitor?.workArea || monitor?.size;
    if (!workArea?.width || !workArea?.height) return;

    const scaleFactor = monitor?.scaleFactor || 1;
    const maxWidth = Math.floor((workArea.width / scaleFactor) - 32);
    const maxHeight = Math.floor((workArea.height / scaleFactor) - 32);
    const width = Math.max(360, Math.min(1180, maxWidth));
    const height = Math.max(320, Math.min(760, maxHeight));
    const x = Math.max(0, Math.floor((workArea.x || 0) / scaleFactor + (maxWidth - width) / 2 + 16));
    const y = Math.max(0, Math.floor((workArea.y || 0) / scaleFactor + (maxHeight - height) / 2 + 16));

    await appWindow.setSize(new LogicalSize(width, height));
    await appWindow.setPosition(new LogicalPosition(x, y));
  } catch (error) {
    console.warn('Window fit skipped:', error);
  }
}

function isTransientSyncWelcomeNote(note = {}) {
  const title = String(note.title || '').toLowerCase();
  const content = String(note.content || '').toLowerCase();
  return title.includes('bienvenue')
    && (title.includes('connectez-vous') || content.includes('connectez-vous pour retrouver vos notes') || content.includes('connectez-vous pour synchroniser'));
}

function App() {
  const { t } = useTranslation();
  const [appLoading, setAppLoading] = useState({ isLoading: true, status: 'Chargement...' });
  const [activeNav, setActiveNav] = useState('home');
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    return localStorage.getItem('fiip-onboarding-completed') === 'true';
  });
  const [, setUser] = useState(null);
  
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("fiip-notes");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            return parsed;
        }
      } catch (e) {
        console.error("Failed to parse notes", e);
      }
    }
    const now = getCurrentTimestamp();
    return [
      {
        id: "1",
        title: "Démarrer avec Fiip",
        content: "<h1>Bienvenue dans votre nouvel espace de pensée</h1><p>Fiip est conçu pour être minimaliste, puissant et sécurisé.</p><ul><li><strong>Organisation</strong> : Utilisez la barre latérale pour naviguer dans vos notes et favoris.</li><li><strong>Intelligence</strong> : Sélectionnez du texte pour activer Dexter, votre assistant IA.</li><li><strong>Synchronisation</strong> : Connectez-vous pour retrouver vos notes sur tous vos appareils.</li></ul>",
        updatedAt: now,
        createdAt: now,
        favorite: false,
        deleted: false,
        tags: []
      }
    ];
  });

  const [selectedNoteId, setSelectedNoteId] = useState(notes?.[0]?.id || null);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("fiip-settings");
    const defaults = { 
        theme: 'dark', 
        autoSave: true, 
        aiEnabled: true,
        appSound: true,
        chatSound: true,
        windowEffect: 'mica',
        titlebarStyle: 'macos',
        darkMode: true,
        cloudSync: true,
        biometricLockEnabled: false
    };
    const parsed = saved ? JSON.parse(saved) : {};
    return { ...defaults, ...parsed, theme: 'dark' };
  });
  
  const [isDexterOpen, setIsDexterOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localStorageUsage, setLocalStorageUsage] = useState(0);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('general');
  const [osType, setOsType] = useState('unknown');
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [biometricLockError, setBiometricLockError] = useState('');
  const [storageLimitAlerted, setStorageLimitAlerted] = useState(false);
  const [offlineChoice, setOfflineChoice] = useState({ visible: false, waiting: false });
  const [notebooks, setNotebooks] = useState(() => {
    const saved = localStorage.getItem('fiip-notebooks');
    if (saved) {
      try {
        return JSON.parse(saved).map(normalizeNotebook);
      } catch {
        return [normalizeNotebook()];
      }
    }
    return [normalizeNotebook()];
  });
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('fiip-tasks');
    if (saved) {
      try {
        return JSON.parse(saved).map(createTask);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [homeWidgets, setHomeWidgets] = useState(() => {
    const saved = localStorage.getItem('fiip-home-widgets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultHomeWidgets();
      }
    }
    return defaultHomeWidgets();
  });

  // --- Refs ---
  const notesRef = useRef(notes);
  const saveTimeoutRef = useRef(null);
  const importedFiinPathsRef = useRef(new Set());
  const waitingForNetworkRef = useRef(false);

  // --- Computed State ---
  const planLevel = keyAuthService.hasProAccess() ? 10 : 0;
  const storageUsage = useMemo(() => {
    const limit = getStorageLimit(planLevel);
    const used = localStorageUsage;
    return {
        used,
        limit,
        percent: limit > 0 ? (used / limit) * 100 : 0
    };
  }, [localStorageUsage, planLevel]);

  useEffect(() => {
    let cancelled = false;
    const calculateUsage = async () => {
      const currentUser = await authService.getUser();
      if (currentUser && settings.cloudSync !== false) {
        const cloudUsage = await dataService.getUsage(currentUser.id);
        return cloudUsage;
      }
      return calculateTotalUsage(notes);
    };

    calculateUsage().then((used) => {
      if (!cancelled) {
        setLocalStorageUsage(used);
      }
    }).catch((error) => {
      console.warn('Failed to calculate local usage:', error);
      if (!cancelled) {
        setLocalStorageUsage(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [notes, settings.cloudSync]);

  useEffect(() => {
    if (storageUsage.percent < 100) {
      if (storageLimitAlerted) setStorageLimitAlerted(false);
      return;
    }
    if (storageLimitAlerted) return;
    setStorageLimitAlerted(true);

    const title = 'Espace de stockage atteint';
    const body = "Votre espace Fiip est plein. Supprimez des pièces jointes ou passez à une offre supérieure pour continuer à synchroniser et ajouter des fichiers.";
    if (window.__TAURI_INTERNALS__) {
      message(body, { title, kind: 'warning' }).catch(console.error);
    } else {
      window.alert(`${title}\n\n${body}`);
    }
  }, [storageUsage.percent, storageLimitAlerted]);

  const tagSuggestions = useMemo(() => {
    const frequency = new Map();
    notes.forEach((note) => {
      normalizeNoteTags(note.tags || []).forEach((tag) => {
        const normalized = tag.label;
        const key = normalized.toLowerCase();
        const current = frequency.get(key) || { tag, count: 0, lastUsed: 0 };
        current.count += 1;
        current.lastUsed = Math.max(current.lastUsed, Number(note.updatedAt || note.updated_at || note.createdAt || 0));
        frequency.set(key, current);
      });
    });
    return Array.from(frequency.values())
      .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed || a.tag.label.localeCompare(b.tag.label, 'fr'))
      .map((item) => item.tag);
  }, [notes]);

  const hydrateLicenseFromProfile = useCallback(async (userOverride = null) => {
    const currentUser = userOverride || await authService.getUser();
    if (!currentUser) {
      keyAuthService.setLocalLevel(0);
      return 0;
    }

    const level = await authService.getPlanLevel(currentUser);
    const username = currentUser.user_metadata?.username
      || currentUser.user_metadata?.nickname
      || currentUser.email;
    keyAuthService.setLocalLevel(level, username, currentUser.user_metadata?.license_key || null);
    return level;
  }, []);

  // --- Supabase Data Sync & Realtime ---
  async function loadDataFromSupabase() {
    const authedUser = await authService.getUser();
    if (!authedUser || settings.cloudSync === false) {
        return;
    }

    setIsSyncing(true);
    try {
      await hydrateLicenseFromProfile(authedUser);
      const syncResult = await syncNotesNow({
          localNotes: notesRef.current,
          settings,
          dataService,
          authService,
      });

      if (syncResult.notes) {
          const remoteNotes = syncResult.notes.filter((note) => !isTransientSyncWelcomeNote(note));
          setNotes(remoteNotes);
          notesRef.current = remoteNotes;
      }

      const [notebooksResult, tasksResult, widgetsResult] = await Promise.allSettled([
          dataService.fetchNotebooks(),
          dataService.fetchTasks(),
          dataService.fetchHomeWidgets(),
      ]);

      if (notebooksResult.status === 'fulfilled' && notebooksResult.value?.data) {
          setNotebooks(notebooksResult.value.data);
      }
      if (tasksResult.status === 'fulfilled' && tasksResult.value?.data) {
          setTasks(tasksResult.value.data);
      }
      if (widgetsResult.status === 'fulfilled' && widgetsResult.value?.data) {
          setHomeWidgets(widgetsResult.value.data);
      }
    } catch (e) {
      console.error("Sync error", e);
    } finally {
      setIsSyncing(false);
    }
  }

  const retryOnlineSession = useCallback(async () => {
    waitingForNetworkRef.current = false;
    setOfflineChoice({ visible: false, waiting: false });
    setAppLoading({ isLoading: true, status: 'Connexion retrouvée...' });

    try {
      const sessionUser = await authService.getUser();
      if (sessionUser) {
        setUser(sessionUser);
        await hydrateLicenseFromProfile(sessionUser);
        dataService.registerCurrentDevice().catch(console.warn);
        localStorage.setItem('fiip-onboarding-completed', 'true');
        localStorage.removeItem('fiip-mode-local');
        setOnboardingCompleted(true);
        await loadDataFromSupabase();
      }
    } finally {
      setAppLoading({ isLoading: false, status: '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrateLicenseFromProfile]);

  const handleWaitForNetwork = useCallback(() => {
    waitingForNetworkRef.current = true;
    setOfflineChoice({ visible: true, waiting: true });
    setAppLoading({ isLoading: true, status: 'En attente du réseau...' });

    if (navigator.onLine) {
      retryOnlineSession().catch((error) => {
        console.warn('Network retry failed:', error);
        waitingForNetworkRef.current = false;
        setOfflineChoice({ visible: true, waiting: false });
        setAppLoading({ isLoading: false, status: '' });
      });
    }
  }, [retryOnlineSession]);

  const handleUseOfflineMode = useCallback(() => {
    waitingForNetworkRef.current = false;
    localStorage.setItem('fiip-onboarding-completed', 'true');
    localStorage.setItem('fiip-mode-local', 'true');
    setSettings((prev) => ({ ...prev, cloudSync: false, theme: 'dark' }));
    setOnboardingCompleted(true);
    setOfflineChoice({ visible: false, waiting: false });
    setAppLoading({ isLoading: false, status: '' });
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      setOfflineChoice((prev) => ({ visible: true, waiting: prev.waiting }));
      if (waitingForNetworkRef.current) {
        setAppLoading({ isLoading: true, status: 'En attente du réseau...' });
      }
    };

    const handleOnline = () => {
      if (waitingForNetworkRef.current) {
        retryOnlineSession().catch((error) => {
          console.warn('Network retry failed:', error);
          waitingForNetworkRef.current = false;
          setOfflineChoice({ visible: true, waiting: false });
          setAppLoading({ isLoading: false, status: '' });
        });
        return;
      }
      setOfflineChoice({ visible: false, waiting: false });
    };

    if (navigator.onLine === false) {
      handleOffline();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryOnlineSession]);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      try {
        console.log("Fiip v" + (await invoke("get_app_version").catch(() => "3.0.0")) + " initializing...");
        
        if (window.__TAURI_INTERNALS__) {
            await fitMainWindowToVisibleArea();
            await invoke("register_deep_link").catch((error) => {
                console.warn("Deep link registration skipped or failed", error);
            });
            Promise.resolve(type()).then(setOsType).catch(() => setOsType('unknown'));
        }
        
        const setupDeepLink = async () => {
          try {
            const unlisten = await onOpenUrl(async (urls) => {
              console.log('URLs deep link received:', urls);
              for (const url of urls) {
                try {
                    const parsedUrl = new URL(url);
                    if (parsedUrl.host === 'login-callback' || parsedUrl.pathname.includes('/login-callback')) {
                        const { data, error } = await authService.completeOAuthCallback(url);
                        if (error) {
                            await message(`Connexion Google impossible : ${error.message}`, { title: 'Fiip', kind: 'error' }).catch(console.error);
                        } else if (data?.session?.user) {
                            setUser(data.session.user);
                            dataService.registerCurrentDevice().catch(console.warn);
                            localStorage.setItem('fiip-onboarding-completed', 'true');
                            localStorage.removeItem('fiip-mode-local');
                            setOnboardingCompleted(true);
                            await loadDataFromSupabase();
                        }
                    }
                    if (parsedUrl.host === 'license' || parsedUrl.pathname.includes('/license')) {
                        const key = parsedUrl.searchParams.get('key');
                        if (key) {
                            const result = await keyAuthService.verifyLicense(key);
                            if (result.success) {
                                await authService.updateSubscription(result.level, key).catch(console.error);
                                await hydrateLicenseFromProfile();
                                await message("Votre licence a été activée. Merci pour votre soutien !", { title: "Fiip License", kind: 'info' }).catch(console.error);
                                setIsLicenseModalOpen(false);
                            } else {
                                setIsLicenseModalOpen(true);
                            }
                            await loadDataFromSupabase();
                        }
                    }
                    if (parsedUrl.host === 'clip' || parsedUrl.pathname.includes('/clip')) {
                        const rawPayload = parsedUrl.searchParams.get('payload');
                        if (rawPayload) {
                            const payload = JSON.parse(decodeURIComponent(rawPayload));
                            const { data, error } = await dataService.createNoteFromClipper(payload);
                            if (error) {
                                await message(`Capture impossible : ${error.message || error}`, { title: 'Fiip', kind: 'error' }).catch(console.error);
                            } else if (data) {
                                await loadDataFromSupabase();
                                setSelectedNoteId(data.id);
                                setActiveNav('home');
                            }
                        }
                    }
                } catch (e) {
                    console.error("Deep link parse error", e);
                }
              }
            });
            return unlisten;
          } catch (e) {
            console.error("Deep link setup failed", e);
          }
        };
        
        let unlistenFn;
        if (window.__TAURI_INTERNALS__) {
            setupDeepLink().then(fn => unlistenFn = fn).catch(console.error);
        }
        
        const sessionUser = await authService.getUser();
        if (sessionUser) {
            setUser(sessionUser);
            await hydrateLicenseFromProfile(sessionUser);
            dataService.registerCurrentDevice().catch(console.warn);
            localStorage.setItem('fiip-onboarding-completed', 'true');
            setOnboardingCompleted(true);
            await loadDataFromSupabase();
        }

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          setUser(session?.user || null);
          if (session?.user) {
              localStorage.setItem('fiip-onboarding-completed', 'true');
              setOnboardingCompleted(true);
              hydrateLicenseFromProfile(session.user).catch(console.error);
              dataService.registerCurrentDevice().catch(console.warn);
          } else {
              keyAuthService.setLocalLevel(0);
              if (localStorage.getItem('fiip-mode-local') !== 'true') {
                  setOnboardingCompleted(false);
              }
          }
        });

        setAppLoading(waitingForNetworkRef.current
          ? { isLoading: true, status: 'En attente du réseau...' }
          : { isLoading: false, status: '' });

        return () => {
            if (unlistenFn) { unlistenFn(); }
            subscription?.unsubscribe();
        };
      } catch (e) {
        console.error("Critical Init Error:", e);
        setAppLoading(waitingForNetworkRef.current
          ? { isLoading: true, status: 'En attente du réseau...' }
          : { isLoading: false, status: '' });
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set real-time subscription
  useEffect(() => {
    if (settings.cloudSync === false) {
      return undefined;
    }

    const channel = supabase
      .channel('fiip-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
        if (isSyncing) return;
        
        if (payload.event === 'INSERT' || payload.event === 'UPDATE') {
            const receivedNote = payload.new;
            setNotes(prev => {
                const index = prev.findIndex(n => n.id === receivedNote.id);
                if (index !== -1) {
                    const existing = prev[index];
                    const receivedUpdatedAt = Date.parse(receivedNote.updated_at || receivedNote.updatedAt || '') || 0;
                    const existingUpdatedAt = existing.updatedAt || Date.parse(existing.updated_at || '') || 0;
                    if (receivedUpdatedAt > existingUpdatedAt) {
                        const newNotes = [...prev];
                        newNotes[index] = {
                            ...receivedNote,
                            updatedAt: receivedUpdatedAt || Date.now(),
                        };
                        return newNotes;
                    }
                    return prev;
                }
                return [...prev, {
                    ...receivedNote,
                    updatedAt: Date.parse(receivedNote.updated_at || receivedNote.updatedAt || '') || Date.now(),
                }];
            });
        } else if (payload.event === 'DELETE') {
            setNotes(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSyncing, settings.cloudSync]);

  useEffect(() => {
    localStorage.setItem("fiip-notes", JSON.stringify(notes));
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('fiip-notebooks', JSON.stringify(notebooks));
  }, [notebooks]);

  useEffect(() => {
    localStorage.setItem('fiip-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('fiip-home-widgets', JSON.stringify(homeWidgets));
  }, [homeWidgets]);

  useEffect(() => {
    const shouldLock = settings.biometricLockEnabled === true
      && localStorage.getItem(BIOMETRIC_LOCK_STORAGE_KEY)
      && sessionStorage.getItem('fiip-biometric-unlocked') !== 'true';
    setIsBiometricLocked(Boolean(shouldLock));
  }, [settings.biometricLockEnabled]);

  useEffect(() => {
    const lockNow = () => {
      if (settings.biometricLockEnabled === true && localStorage.getItem(BIOMETRIC_LOCK_STORAGE_KEY)) {
        sessionStorage.removeItem('fiip-biometric-unlocked');
        setIsBiometricLocked(true);
      }
    };
    window.addEventListener('fiip-lock-now', lockNow);
    return () => window.removeEventListener('fiip-lock-now', lockNow);
  }, [settings.biometricLockEnabled]);

  const unlockWithBiometrics = async () => {
    try {
      setBiometricLockError('');
      await authenticateBiometricLock();
      sessionStorage.setItem('fiip-biometric-unlocked', 'true');
      setIsBiometricLocked(false);
    } catch (error) {
      setBiometricLockError(getBiometricUserMessage(error));
    }
  };

  useEffect(() => {
    const effectiveSettings = { ...settings, theme: 'dark' };
    if (settings.theme !== 'dark') {
        setSettings(effectiveSettings);
        return;
    }

    localStorage.setItem("fiip-settings", JSON.stringify(effectiveSettings));

    soundManager.setAppSoundEnabled(effectiveSettings.appSound);
    soundManager.setChatSoundEnabled(effectiveSettings.chatSound);

    applyTheme({ settings: effectiveSettings, osType }).then(({ supportedWindowEffect }) => {
        if (supportedWindowEffect !== effectiveSettings.windowEffect) {
            setSettings((prev) => ({ ...prev, windowEffect: supportedWindowEffect }));
        }
    }).catch((error) => {
        if (window.__TAURI_INTERNALS__) {
            console.warn('Window effect unavailable:', error);
            setSettings((prev) => ({ ...prev, windowEffect: 'none' }));
        }
    });
  }, [settings, osType]);

  useEffect(() => {
    let lastSoundAt = 0;
    const playInteractionSound = (event) => {
      const target = event.target;
      if (!target?.closest) return;
      const interactive = target.closest('button, [role="button"], a, select, [data-sound="interaction"]');
      if (!interactive || interactive.disabled || interactive.getAttribute('aria-disabled') === 'true') return;
      const now = Date.now();
      if (now - lastSoundAt < 90) return;
      lastSoundAt = now;
      soundManager.play('interaction').catch(() => {});
    };
    window.addEventListener('pointerup', playInteractionSound, { capture: true });
    return () => window.removeEventListener('pointerup', playInteractionSound, { capture: true });
  }, []);

  const handleCreateNote = useCallback(async (title = "", content = "", options = {}) => {
    const input = title && typeof title === 'object' ? title : { title, content, ...options };
    const now = getCurrentTimestamp();
    const newNote = createNoteDraft({
      id: crypto.randomUUID(),
      title: input.title,
      content: input.content,
      activeNav,
      notebookId: input.notebookId || input.notebook_id || input.folder_id,
      now,
      defaultTitle: t('common.new_note', "Nouvelle Note"),
    });
    const inNotebook = newNote.notebookId !== 'all-notes';
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    setActiveNav(inNotebook ? `notebook:${newNote.notebookId}` : 'home');
    
    try {
        if (settings.cloudSync !== false) {
            const result = await dataService.saveNote(newNote);
            if (result?.error) {
                queuePendingNoteSync(newNote);
            }
        }
    } catch (e) {
        queuePendingNoteSync(newNote);
        console.error("Failed to sync new note", e);
    }
    
    return newNote;
  }, [activeNav, settings.cloudSync, t]);

  const importFiinNote = useCallback(async ({ filePath = '', content = '' } = {}) => {
    try {
      if (filePath && importedFiinPathsRef.current.has(filePath)) {
        return null;
      }

      const note = content
        ? normalizeFiinNotePayload(content)
        : await importFiinFromPath(filePath);

      if (filePath) {
        importedFiinPathsRef.current.add(filePath);
      }

      setNotes((prev) => [note, ...prev]);
      notesRef.current = [note, ...notesRef.current];
      setSelectedNoteId(note.id);
      setActiveNav('home');
      localStorage.setItem('fiip-onboarding-completed', 'true');
      setOnboardingCompleted(true);

      dataService.saveNote(note).catch((error) => {
        console.error('Failed to sync imported .fiin note', error);
      });

      return note;
    } catch (error) {
      console.error('Failed to import .fiin note', error);
      await message(error?.message || 'Impossible d’ouvrir ce fichier .fiin.', {
        title: 'Fiip',
        kind: 'error',
      }).catch(console.error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) {
      return undefined;
    }

    let disposed = false;
    let unlistenOpenFiin;

    const setupFiinOpen = async () => {
      try {
        const launchFile = await invoke('read_launch_fiin_file');
        if (!disposed && Array.isArray(launchFile) && launchFile.length === 2) {
          const [filePath, content] = launchFile;
          await importFiinNote({ filePath, content });
        }

        unlistenOpenFiin = await listen('fiip://open-fiin', async (event) => {
          if (typeof event.payload === 'string') {
            await importFiinNote({ filePath: event.payload });
          }
        });
      } catch (error) {
        console.error('Failed to setup .fiin file open handler', error);
      }
    };

    setupFiinOpen();

    return () => {
      disposed = true;
      if (unlistenOpenFiin) {
        unlistenOpenFiin();
      }
    };
  }, [importFiinNote]);

  // Global Keyboard listener for Command Palette (Ctrl/Cmd+K) & New Note (Ctrl/Cmd+N)
  useEffect(() => {
    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsCommandPaletteOpen(prev => !prev);
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
            e.preventDefault();
            handleCreateNote();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateNote]);

  // --- Handlers ---
  const handleLoginSuccess = async () => {
    setIsAuthModalOpen(false);
    await loadDataFromSupabase();
  };

  const handleOpenAccountFromLicense = useCallback(async () => {
    setIsLicenseModalOpen(false);
    const currentUser = await authService.getUser().catch(() => null);
    if (currentUser) {
      setIsUserProfileOpen(true);
      return;
    }
    setIsAuthModalOpen(true);
  }, []);

  const handleUpdateNote = (updatedNote) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );

    if (settings.autoSave === false) {
      return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (settings.cloudSync === false) {
        return;
      }
        setIsSyncing(true);
        try {
          const result = await dataService.saveNote(updatedNote);
          if (result?.error) {
            queuePendingNoteSync(updatedNote);
          }
        } catch (error) {
          queuePendingNoteSync(updatedNote);
          console.error('Failed to autosave note to cloud', error);
        }
        setIsSyncing(false);
    }, 1000);
  };

  const handleCreateNotebook = async () => {
    const notebook = normalizeNotebook({
      id: crypto.randomUUID(),
      name: `Carnet ${notebooks.length}`,
      sort_order: notebooks.length,
    });
    setNotebooks((prev) => [...prev, notebook]);
    dataService.saveNotebook(notebook).catch(console.error);
    setActiveNav(`notebook:${notebook.id}`);
    setSelectedNoteId(null);
    return notebook;
  };

  const handleRenameNotebook = async (notebook, nextNameInput) => {
    const notebookId = notebook?.id || notebook?.notebook_id;
    if (!notebookId || notebookId === 'all-notes') return;
    const currentName = notebook.name || '';
    const nextName = String(nextNameInput || '').trim();
    if (!nextName || nextName === currentName) return;
    const updatedNotebook = normalizeNotebook({ ...notebook, name: nextName, updated_at: new Date().toISOString() });
    setNotebooks((prev) => prev.map((item) => (item.id === notebookId ? updatedNotebook : item)));
    dataService.saveNotebook(updatedNotebook).catch(console.error);
  };

  const handleDeleteNotebook = async (notebook) => {
    const notebookId = notebook?.id || notebook?.notebook_id;
    if (!notebookId || notebookId === 'all-notes') return;
    const shouldDelete = await ask(`Supprimer le carnet "${notebook.name || 'Sans nom'}" ? Les notes seront replacées dans Toutes les notes.`, {
      title: 'Supprimer le carnet',
      kind: 'warning',
    }).catch(() => false);
    if (!shouldDelete) return;
    setNotebooks((prev) => prev.filter((item) => item.id !== notebookId));
    const movedNotes = [];
    setNotes((prev) => prev.map((note) => {
      const currentNotebookId = note.notebookId || note.notebook_id || note.folder_id || 'all-notes';
      if (currentNotebookId !== notebookId) return note;
      const movedNote = { ...note, notebookId: 'all-notes', notebook_id: null, folder_id: null, updatedAt: getCurrentTimestamp() };
      movedNotes.push(movedNote);
      return movedNote;
    }));
    if (activeNav === `notebook:${notebookId}`) {
      setActiveNav('home');
    }
    dataService.deleteNotebook(notebookId).catch(console.error);
    movedNotes.forEach((movedNote) => dataService.saveNote(movedNote).catch(console.error));
  };

  const handleSaveTask = async (taskInput) => {
    const task = createTask(taskInput);
    setTasks((prev) => {
      const exists = prev.some((item) => item.id === task.id);
      return exists ? prev.map((item) => item.id === task.id ? task : item) : [...prev, task];
    });
    dataService.saveTask(task).catch(console.error);
    return task;
  };

  const handleDeleteTask = async (taskId) => {
    setTasks((prev) => removeTaskById(prev, taskId));
    dataService.deleteTask(taskId).catch(console.error);
  };

  const handleAdvancedSearch = (query) => {
    const matches = filterNotesAdvanced(notes, query, { tasks });
    if (matches[0]) {
      setSelectedNoteId(matches[0].id);
      setActiveNav('home');
    }
    return matches;
  };

  const handleDeleteNote = async (noteId) => {
    const idToDelete = noteId || selectedNoteId;
    if (!idToDelete) return;

    if (activeNav === 'trash') {
        const confirmed = await ask(
            "Voulez-vous supprimer définitivement cette note ?",
            { title: "Fiip", kind: 'warning', okLabel: 'Supprimer', cancelLabel: 'Annuler' }
        );
        if (!confirmed) return;
        
        const newNotes = notes.filter((n) => n.id !== idToDelete);
        setNotes(newNotes);
        if (selectedNoteId === idToDelete) {
            setSelectedNoteId(null);
        }
        await dataService.deleteNote(idToDelete).catch(console.error);
    } else {
        setNotes(prev => {
            const newNotes = prev.map(n => n.id === idToDelete ? { ...n, deleted: true } : n);
            const note = newNotes.find(n => n.id === idToDelete);
            if (note) { dataService.saveNote(note).catch(console.error); }
            return newNotes;
        });
        if (selectedNoteId === idToDelete) {
             setSelectedNoteId(null);
        }
    }
  };

  const handleRestoreNote = (noteId) => {
      setNotes(prev => {
          const newNotes = prev.map(n => n.id === noteId ? { ...n, deleted: false } : n);
          const note = newNotes.find(n => n.id === noteId);
          if (note) { dataService.saveNote(note).catch(console.error); }
          return newNotes;
      });
  };

  const handleToggleFavorite = (noteId) => {
      setNotes(prev => {
          const newNotes = prev.map(n => n.id === noteId ? { ...n, favorite: !n.favorite } : n);
          const note = newNotes.find(n => n.id === noteId);
          if (note) { dataService.saveNote(note).catch(console.error); }
          return newNotes;
      });
  };

  const handleEmptyTrash = async () => {
    const confirmed = await ask(
        "Voulez-vous vider la corbeille ? Cette action est irréversible.",
        { title: "Fiip", kind: 'warning', okLabel: 'Vider', cancelLabel: 'Annuler' }
    );
    if (!confirmed) return;

    const toDelete = notes.filter(n => n.deleted);
    for (const n of toDelete) {
        await dataService.deleteNote(n.id).catch(console.error);
    }

    setNotes(prev => prev.filter(n => !n.deleted));
    if (selectedNoteId && notes.find(n => n.id === selectedNoteId)?.deleted) {
        setSelectedNoteId(null);
    }
  };

  const activeNote = notes.find((n) => n.id === selectedNoteId);

  // Command palette items creation
  const commandItems = useMemo(() => {
    const openSettingsTab = (tab) => {
      setSettingsInitialTab(tab);
      setActiveNav('settings');
    };

    const actions = [
      {
        id: 'new-note',
        label: 'Nouvelle Note',
        description: 'Créer une nouvelle note',
        icon: <Plus size={15} />,
        shortcut: ['Ctrl', 'N'],
        group: 'Actions',
        onSelect: () => handleCreateNote()
      },
      {
        id: 'focus-editor',
        label: "Focus éditeur",
        description: 'Revenir à la note active',
        icon: <Search size={15} />,
        group: 'Édition',
        onSelect: () => setActiveNav('home')
      },
      {
        id: 'open-dexter',
        label: 'Ouvrir Dexter',
        description: "Assistant d'écriture Fiip",
        icon: <Bot size={15} />,
        group: 'IA',
        onSelect: () => setIsDexterOpen(true)
      },
      {
        id: 'share-current',
        label: 'Partager la note',
        description: 'Ouvrir le partage de la note active',
        icon: <Share2 size={15} />,
        group: 'Partage',
        onSelect: () => activeNote && setIsShareModalOpen(true)
      },
      {
        id: 'copy-public-link',
        label: 'Copier le lien public',
        description: 'Copier le lien public si la note est publiée',
        icon: <Link size={15} />,
        group: 'Partage',
        onSelect: () => {
          if (activeNote?.public_slug) {
            navigator.clipboard.writeText(buildPublicNoteUrl(activeNote.public_slug));
          }
        }
      },
      {
        id: 'settings',
        label: 'Préférences',
        description: 'Ouvrir les réglages',
        icon: <Settings size={15} />,
        shortcut: ['Ctrl', ','],
        group: 'Réglages',
        onSelect: () => openSettingsTab('general')
      },
      {
        id: 'settings-sync',
        label: 'Synchronisation',
        description: 'Voir le statut du cloud Fiip',
        icon: <Database size={15} />,
        group: 'Réglages',
        onSelect: () => openSettingsTab('sync')
      },
      {
        id: 'settings-ai',
        label: 'Intelligence artificielle',
        description: "Voir l'activité de l'assistant et les statistiques",
        icon: <Bot size={15} />,
        group: 'Réglages',
        onSelect: () => openSettingsTab('ai')
      },
      {
        id: 'settings-premium',
        label: 'Fiip Premium',
        description: 'Compte, licence et achat SellAuth',
        icon: <Crown size={15} />,
        group: 'Réglages',
        onSelect: () => openSettingsTab('premium')
      },
      {
        id: 'settings-cache',
        label: 'Cache local',
        description: 'Voir et nettoyer le cache AppData',
        icon: <Database size={15} />,
        group: 'Réglages',
        onSelect: () => openSettingsTab('cache')
      }
    ];

    const noteItems = notes.filter(n => !n.deleted).map(n => ({
        id: `note-${n.id}`,
        label: n.title || 'Sans titre',
        description: 'Ouvrir cette note',
        icon: <FileText size={15} />,
        group: 'Notes Récentes',
        onSelect: () => {
            setSelectedNoteId(n.id);
            setActiveNav('home');
        }
    }));

    return [...actions, ...noteItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, activeNote, handleCreateNote]);

  // If Onboarding is not completed, route to OnboardingView
  if (!onboardingCompleted) {
      return (
          <>
              <Titlebar style={settings.titlebarStyle} />
              <OnboardingView 
                  onComplete={() => setOnboardingCompleted(true)} 
                  onLoginSuccess={handleLoginSuccess}
              />
              {appLoading.isLoading && (
                  <LoadingScreen status={appLoading.status} />
              )}
              {offlineChoice.visible && (
                  <OfflineConnectionDialog
                      isWaiting={offlineChoice.waiting}
                      onWaitOnline={handleWaitForNetwork}
                      onUseOffline={handleUseOfflineMode}
                  />
              )}
          </>
      );
  }

  const biometricPlatformInfo = getBiometricPlatformInfo(osType);

  return (
    <div className="h-screen w-screen bg-transparent text-warm-text-primary-light dark:text-warm-text-primary-dark overflow-hidden flex flex-col font-sans select-none relative">
      <div className="mica-noise-overlay" />
      <Titlebar style={settings.titlebarStyle} />
      
      {storageUsage.percent >= 90 && (
          <div className={`text-white text-[11px] font-medium py-1.5 px-4 flex justify-center items-center shadow-md z-50 text-center w-full shrink-0 ${storageUsage.percent >= 100 ? 'bg-[#E81123]' : 'bg-[#FEBC2E] text-black'}`}>
              <span>⚠️ {storageUsage.percent >= 100 ? 'Limite atteint' : 'Stockage presque plein'}. Vos notes risquent de ne plus être synchronisées.</span>
          </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <UnifiedSidebar 
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
            activeNav={activeNav}
            onNavigate={(navId) => {
                setActiveNav(navId);
                setSelectedNoteId(null);
            }}
            onOpenSettings={() => setActiveNav('settings')}
            onOpenAuth={() => setOnboardingCompleted(false)}
            onOpenProfile={() => setIsUserProfileOpen(true)}
            onCreateNote={handleCreateNote}
            onRestoreNote={handleRestoreNote}
            onToggleFavorite={handleToggleFavorite}
            onDeleteNote={handleDeleteNote}
            onEmptyTrash={handleEmptyTrash}
            notebooks={notebooks}
            onCreateNotebook={handleCreateNotebook}
            onRenameNotebook={handleRenameNotebook}
            onDeleteNotebook={handleDeleteNotebook}
        />

        <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
            {activeNav === 'settings' ? (
                <SettingsView 
                    settings={settings}
                    onUpdateSettings={setSettings}
                    storageUsage={storageUsage}
                    onSync={() => loadDataFromSupabase()}
                    initialTab={settingsInitialTab}
                    onBack={() => {
                        setActiveNav('home');
                        setSelectedNoteId(null);
                    }}
                    osType={osType}
                />
            ) : activeNav === 'home' && !selectedNoteId ? (
                <HomeDashboard 
                    featuredNote={notes.find(n => !n.deleted)} 
                    recentNotes={notes.filter(n => !n.deleted).slice(0, 6)}
                    onSelectNote={setSelectedNoteId}
                    notebooks={notebooks}
                    tasks={tasks}
                    widgets={homeWidgets}
                    settings={settings}
                    onAdvancedSearch={handleAdvancedSearch}
                />
            ) : activeNote ? (
                <Editor 
                    key={activeNote.id}
                    note={activeNote} 
                    onUpdateNote={handleUpdateNote} 
                    settings={settings}
                    onOpenShare={() => setIsShareModalOpen(true)}
                    onDeleteNote={handleDeleteNote}
                    onBack={() => setSelectedNoteId(null)}
                    onOpenDexter={() => setIsDexterOpen(true)}
                    onOpenLicense={() => setIsLicenseModalOpen(true)}
                    onCreateNote={() => handleCreateNote()}
                    tagSuggestions={tagSuggestions}
                    notebooks={notebooks}
                    tasks={tasks.filter((task) => task.note_id === activeNote.id)}
                    onSaveTask={handleSaveTask}
                    onDeleteTask={handleDeleteTask}
                    storageUsage={storageUsage}
                    planLevel={planLevel}
                />
            ) : (
                <HomeDashboard 
                    featuredNote={notes.find(n => !n.deleted)} 
                    recentNotes={notes.filter(n => !n.deleted).slice(0, 6)}
                    onSelectNote={setSelectedNoteId}
                    notebooks={notebooks}
                    tasks={tasks}
                    widgets={homeWidgets}
                    settings={settings}
                    onAdvancedSearch={handleAdvancedSearch}
                />
            )}
        </div>

        <Dexter 
            isOpen={isDexterOpen} 
            onClose={() => setIsDexterOpen(false)} 
            currentNote={activeNote}
            onCreateNote={handleCreateNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            settings={settings}
        />
      </div>
      
      <LicenseModal 
        isOpen={isLicenseModalOpen} 
        onClose={() => setIsLicenseModalOpen(false)} 
        onOpenAccount={handleOpenAccountFromLicense}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <UserProfileModal 
        isOpen={isUserProfileOpen} 
        onClose={() => setIsUserProfileOpen(false)} 
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        note={activeNote}
        notes={notes}
        onUpdateNote={handleUpdateNote}
      />

      <CommandPalette 
        items={commandItems}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {isBiometricLocked && (
        <div className="fiip-light-lock-screen fixed inset-0 z-[100000] flex items-center justify-center bg-[color:var(--bg-content)]/88 p-6 text-[color:var(--text-primary)] backdrop-blur-3xl">
          <div className="w-full max-w-sm rounded-3xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-6 shadow-2xl">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-sidebar-item-active text-[color:var(--text-primary)]">
              <Lock size={22} />
            </div>
            <h2 className="text-center text-lg font-bold tracking-tight text-[color:var(--text-primary)]">Fiip est verrouillé</h2>
            <p className="mt-2 text-center text-sm leading-6 text-[color:var(--text-secondary)]">
              Déverrouillez avec {biometricPlatformInfo.name}.
            </p>
            {biometricLockError && (
              <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs font-semibold leading-5 text-red-700 dark:text-red-300">
                {biometricLockError}
              </p>
            )}
            <button
              type="button"
              onClick={unlockWithBiometrics}
              className="fiip-lock-unlock-button mt-5 w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition-all hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Déverrouiller
            </button>
          </div>
        </div>
      )}

      {appLoading.isLoading && (
        <LoadingScreen status={appLoading.status} />
      )}
      {offlineChoice.visible && (
        <OfflineConnectionDialog
          isWaiting={offlineChoice.waiting}
          onWaitOnline={handleWaitForNetwork}
          onUseOffline={handleUseOfflineMode}
        />
      )}
    </div>
  );
}

export default App;
