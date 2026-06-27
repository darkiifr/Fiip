import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { type } from '@tauri-apps/plugin-os';
import { relaunch } from '@tauri-apps/plugin-process';
import { Bot, Crown, Database, FileText, Link, Monitor, Moon, Plus, Search, Settings, Share2, Sun } from 'lucide-react';
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';

import OnboardingView from "./components/OnboardingView";
import SettingsView from "./components/SettingsView";
import { CommandPalette } from "./components/ui/CommandPalette";
import Dexter from "./components/Dexter";
import Editor from "./components/Editor";
import LicenseModal from "./components/LicenseModal";
import LoadingScreen from "./components/LoadingScreen";
import ShareModal from "./components/ShareModal";
import UnifiedSidebar from "./components/UnifiedSidebar";
import HomeDashboard from "./components/HomeDashboard";
import Titlebar from "./components/Titlebar";
import UserProfileModal from "./components/UserProfileModal";
import { buildPublicNoteUrl } from "./config/links";
import { calculateTotalUsage, importFiinFromPath, normalizeFiinNotePayload } from "./services/fileManager";
import { initializeFonts } from "./services/fontStore";
import { keyAuthService } from "./services/keyauth";
import { soundManager } from "./services/soundManager";
import { createTask, defaultHomeWidgets, filterNotesAdvanced, normalizeNotebook } from './services/fiipV1';
import { authService, dataService, getStorageLimit, supabase } from './services/supabase';
import { normalizeNoteTags } from './utils/noteTags';
import { coerceWindowEffect } from './utils/windowEffects';

import "./App.css";

const getCurrentTimestamp = () => new Date().getTime();

function App() {
  const { t, i18n } = useTranslation();
  const [appLoading, setAppLoading] = useState({ isLoading: true, status: 'Chargement...' });
  const [activeNav, setActiveNav] = useState('home');
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    return localStorage.getItem('fiip-onboarding-completed') === 'true';
  });
  const [user, setUser] = useState(null);
  
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
        theme: 'system', 
        autoSave: true, 
        aiEnabled: true,
        appSound: true,
        chatSound: true,
        windowEffect: 'mica',
        titlebarStyle: 'macos',
        darkMode: true,
        cloudSync: true
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });
  
  const [isDexterOpen, setIsDexterOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('general');
  const [osType, setOsType] = useState('unknown');
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

  // --- Computed State ---
  const storageUsage = useMemo(() => {
    const level = keyAuthService.hasProAccess() ? 10 : 0;
    const limit = getStorageLimit(level);
    const used = calculateTotalUsage(notes);
    return {
        used,
        limit,
        percent: limit > 0 ? (used / limit) * 100 : 0
    };
  }, [notes]);

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

  // --- Supabase Data Sync & Realtime ---
  async function loadDataFromSupabase() {
    const authedUser = await authService.getUser();
    if (!authedUser) {
        return;
    }

    setIsSyncing(true);
    try {
      const { data: remoteNotes, error: notesError } = await dataService.fetchNotes();
      
      if (!notesError && remoteNotes) {
          const localNotes = notesRef.current;
          if (remoteNotes.length === 0 && localNotes && localNotes.length > 0) {
              const isDefault = localNotes.length === 1 && localNotes[0].id === '1';
              if (!isDefault) {
                  for (const note of localNotes) {
                      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(note.id);
                      const noteToSave = { ...note };
                      if (!isValidUUID) {
                          noteToSave.id = crypto.randomUUID();
                      }
                      await dataService.saveNote(noteToSave);
                  }
                  const { data: refreshedRemote } = await dataService.fetchNotes();
                  if (refreshedRemote) {
                      setNotes(refreshedRemote);
                      notesRef.current = refreshedRemote;
                  }
              } else {
                  setNotes(remoteNotes);
                  notesRef.current = remoteNotes;
              }
          } else {
              setNotes(remoteNotes);
              notesRef.current = remoteNotes;
          }
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
      localStorage.setItem('fiip-last-sync-at', new Date().toISOString());
    }
  }

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      try {
        console.log("Fiip v" + (await invoke("get_app_version").catch(() => "3.0.0")) + " initializing...");
        
        if (window.__TAURI_INTERNALS__) {
            await initializeFonts();
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
          } else {
              if (localStorage.getItem('fiip-mode-local') !== 'true') {
                  setOnboardingCompleted(false);
              }
          }
        });

        setAppLoading({ isLoading: false, status: '' });

        return () => {
            if (unlistenFn) { unlistenFn(); }
            subscription?.unsubscribe();
        };
      } catch (e) {
        console.error("Critical Init Error:", e);
        setAppLoading({ isLoading: false, status: '' });
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set real-time subscription
  useEffect(() => {
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
  }, [isSyncing]);

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
    localStorage.setItem("fiip-settings", JSON.stringify(settings));
    
    // Resolve Light/Dark Mode
    const resolveTheme = () => {
      if (settings.theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return settings.theme === 'light' ? 'light' : 'dark';
    };
    const resolvedTheme = resolveTheme();
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.body.classList.toggle('dark', resolvedTheme === 'dark');
    document.documentElement.dataset.theme = resolvedTheme;
    document.body.dataset.theme = resolvedTheme;
    const supportedWindowEffect = coerceWindowEffect(settings.windowEffect || 'none', osType);
    document.documentElement.dataset.windowEffect = supportedWindowEffect;
    document.body.dataset.windowEffect = supportedWindowEffect;
    document.documentElement.style.colorScheme = resolvedTheme;
    document.body.style.backgroundColor = supportedWindowEffect !== 'none' ? 'transparent' : (resolvedTheme === 'dark' ? '#101216' : '#F8FAFC');
    document.documentElement.classList.toggle('window-effect-active', supportedWindowEffect !== 'none');
    
    soundManager.setAppSoundEnabled(settings.appSound);
    soundManager.setChatSoundEnabled(settings.chatSound);
    
    if (window.__TAURI_INTERNALS__ && osType !== 'unknown') {
        if (supportedWindowEffect !== settings.windowEffect) {
            setSettings((prev) => ({ ...prev, windowEffect: supportedWindowEffect }));
            return;
        }
        invoke('set_window_effect', { effect: supportedWindowEffect, dark: resolvedTheme === 'dark' }).catch((error) => {
            console.warn('Window effect unavailable:', error);
            setSettings((prev) => ({ ...prev, windowEffect: 'none' }));
        });
    }
  }, [settings, osType]);

  useEffect(() => {
    if (settings.theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => {
      const resolvedTheme = media.matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
      document.body.classList.toggle('dark', resolvedTheme === 'dark');
      document.documentElement.dataset.theme = resolvedTheme;
      document.body.dataset.theme = resolvedTheme;
      document.documentElement.style.colorScheme = resolvedTheme;
      document.body.style.backgroundColor = settings.windowEffect && settings.windowEffect !== 'none'
        ? 'transparent'
        : (resolvedTheme === 'dark' ? '#101216' : '#F8FAFC');
    };
    media.addEventListener('change', syncSystemTheme);
    syncSystemTheme();
    return () => media.removeEventListener('change', syncSystemTheme);
  }, [settings.theme]);

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

  const handleCreateNote = useCallback(async (title = "", content = "") => {
    const now = getCurrentTimestamp();
    const newNote = {
      id: crypto.randomUUID(),
      title: title || t('common.new_note', "Nouvelle Note"),
      content: content || "",
      updatedAt: now,
      createdAt: now,
      favorite: false,
      deleted: false,
      tags: []
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    setActiveNav('home');
    
    try {
        await dataService.saveNote(newNote);
    } catch (e) {
        console.error("Failed to sync new note", e);
    }
    
    return newNote;
  }, [t]);

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
    await loadDataFromSupabase();
  };

  const handleUpdateNote = (updatedNote) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
        setIsSyncing(true);
        await dataService.saveNote(updatedNote);
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
        description: 'Voir le statut Supabase',
        icon: <Database size={15} />,
        group: 'Réglages',
        onSelect: () => openSettingsTab('sync')
      },
      {
        id: 'settings-ai',
        label: 'Intelligence artificielle',
        description: 'Voir le routeur OpenRouter et les statistiques',
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
      },
      {
        id: 'theme-light',
        label: 'Activer le Thème Clair',
        description: 'Changer l\'apparence',
        icon: <Sun size={15} />,
        group: 'Apparence',
        onSelect: () => setSettings(prev => ({ ...prev, theme: 'light' }))
      },
      {
        id: 'theme-dark',
        label: 'Activer le Thème Sombre',
        description: 'Changer l\'apparence',
        icon: <Moon size={15} />,
        group: 'Apparence',
        onSelect: () => setSettings(prev => ({ ...prev, theme: 'dark' }))
      },
      {
        id: 'theme-system',
        label: 'Suivre le thème système',
        description: 'Utiliser le thème de Windows/macOS',
        icon: <Monitor size={15} />,
        group: 'Apparence',
        onSelect: () => setSettings(prev => ({ ...prev, theme: 'system' }))
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
          </>
      );
  }

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
            onSelectNote={(id) => {
                setSelectedNoteId(id);
                setActiveNav('home');
            }}
            activeNav={activeNav}
            onNavigate={setActiveNav}
            onOpenSettings={() => setActiveNav('settings')}
            onOpenAuth={() => setOnboardingCompleted(false)}
            onOpenProfile={() => setIsUserProfileOpen(true)}
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
                />
            ) : (
                <HomeDashboard 
                    featuredNote={notes.find(n => !n.deleted)} 
                    recentNotes={notes.filter(n => !n.deleted).slice(0, 6)}
                    onSelectNote={setSelectedNoteId}
                    notebooks={notebooks}
                    tasks={tasks}
                    widgets={homeWidgets}
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
        onOpenAuth={() => { setIsLicenseModalOpen(false); setOnboardingCompleted(false); }}
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

      {appLoading.isLoading && (
        <LoadingScreen status={appLoading.status} />
      )}
    </div>
  );
}

export default App;
