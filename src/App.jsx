
import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from '@tauri-apps/api/window';
import Sidebar from "./components/Sidebar";
import NoteList from "./components/NoteList";
import Editor from "./components/Editor";
import SettingsModal from "./components/SettingsModal";
import LicenseModal from "./components/LicenseModal";
import ChatModal from "./components/ChatModal";
import AuthModal from "./components/AuthModal";
import ShareModal from "./components/ShareModal";
import LoadingScreen from "./components/LoadingScreen";
import Dexter from "./components/Dexter";
import Titlebar from "./components/Titlebar";
// import CollaborationView from "./components/CollaborationView";
import "./App.css";

import { type } from '@tauri-apps/plugin-os';
// import { readFile } from '@tauri-apps/plugin-fs';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { relaunch } from '@tauri-apps/plugin-process';
import { ask } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import IconFileText from '~icons/mingcute/file-fill';
import { keyAuthService } from "./services/keyauth";
import { authService, dataService, getStorageLimit, supabase } from './services/supabase';
import { soundManager } from "./services/soundManager";
import { calculateTotalUsage } from "./services/fileManager";

// Helper to convert buffer to base64
// function arrayBufferToBase64(buffer) {
//    let binary = '';
//    const bytes = new Uint8Array(buffer);
//    const len = bytes.byteLength;
//    for (let i = 0; i < len; i++) {
//        binary += String.fromCharCode(bytes[i]);
//    }
//    return window.btoa(binary);
// }

// const LICENSE_URL = "https://votre-site-de-licence.com"; // À remplacer par le vrai lien

function App() {
  const { t, i18n } = useTranslation();
  const [appLoading, setAppLoading] = useState({ isLoading: true, status: 'Chargement...' });
  const [activeNav, setActiveNav] = useState('home');
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("fiip-notes");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to parse notes", e);
      }
    }
    return [
      {
        id: "1",
        title: "Bienvenue sur Fiip",
        content: "Ceci est une note d'exemple. Créez-en une nouvelle pour commencer !",
        updatedAt: Date.now(),
      }
    ];
  });

  const [selectedNoteId, setSelectedNoteId] = useState(notes?.[0]?.id || null);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("fiip-settings");
    const defaults = { 
        theme: 'system', 
        fontSize: 'medium', 
        autoSave: true, 
        aiEnabled: true,
        appSound: true,
        chatSound: true,
        windowEffect: 'mica',
        titlebarStyle: 'macos',
        darkMode: true,
        cloudSync: true // Default to true
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDexterOpen, setIsDexterOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ used: 0, limit: 0, percent: 0 });
  
  // Refs for stable access in callbacks/listeners
  const notesRef = useRef(notes);
  const saveTimeoutRef = useRef(null);
  const settingsRef = useRef(settings);

  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Update storage info whenever notes change or modal opens
  useEffect(() => {
      const updateStorage = async () => {
          let used = 0;
          // Only fetch real cloud usage if settings are open to save API calls
          if (isSettingsOpen) {
             used = await dataService.getUsage();
          } else {
             // Otherwise use local estimation
             used = await calculateTotalUsage(notes);
          }
          
          const user = await authService.getUser();
          const level = user?.user_metadata?.subscription_level || 0;
          const limit = getStorageLimit(level);
          const percent = limit > 0 ? (used / limit) * 100 : 0;
          setStorageUsage({ used, limit, percent });
      };
      updateStorage();
  }, [notes, isSettingsOpen]);

  // Configure Deep Link Listener
  useEffect(() => {
    const setupDeepLink = async () => {
      try {
        const unlisten = await onOpenUrl(async (urls) => {
          console.log('Deep link received:', urls);
          for (const url of urls) {

            // Handle Import Note
            if (url.startsWith('fiip://note/')) {
                const slug = url.split('fiip://note/')[1];
                if (slug) {
                    window.dispatchEvent(new CustomEvent('import-note', { detail: slug }));
                    continue; // Skip the rest for this URL
                }
            }

            // Handle Supabase OAuth Callback (Implicit & PKCE)
            let success = false;
            try {
                const urlObj = new URL(url);
                const hashParams = new URLSearchParams(urlObj.hash.substring(1)); // remove #
                const queryParams = urlObj.searchParams;

                // 1. Implicit Grant (Access Token in Hash)
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                // 2. PKCE Flow (Code in Query)
                const code = queryParams.get('code');
                const error = queryParams.get('error') || hashParams.get('error');
                const errorDesc = queryParams.get('error_description') || hashParams.get('error_description');

                if (error) {
                    console.error("Auth Error:", error, errorDesc);
                    // Optionally show error to user
                    continue;
                }

                if (accessToken && refreshToken) {
                    const { error } = await authService.setSession(accessToken, refreshToken);
                    if (!error) success = true;
                } else if (code) {
                    const { error } = await authService.exchangeCodeForSession(code);
                    if (!error) success = true;
                }

                if (success) {
                    const user = await authService.getUser();
                    if (user) {
                        const savedLevel = user?.user_metadata?.subscription_level || 0;
                        const savedKey = user?.user_metadata?.license_key;
                        const username = user?.user_metadata?.username || user?.email;
                        
                        if (savedKey) {
                            // Validation de la clé de l'utilisateur après login Google
                            const res = await keyAuthService.validateLicense(savedKey);
                            if (res.success) {
                                keyAuthService.setLocalLevel(res.level, username);
                            } else {
                                keyAuthService.setLocalLevel(0, username);
                            }
                        } else {
                            keyAuthService.setLocalLevel(savedLevel, username);
                        }
                        
                        setIsAuthModalOpen(false);
                        
                        if (keyAuthService.isAuthenticated || keyAuthService.isTrialActive) {
                            setIsLicenseModalOpen(false);
                        } else {
                            setIsLicenseModalOpen(true);
                        }

                        // Force sync immediately
                        if (typeof loadDataFromSupabase === 'function') {
                            await loadDataFromSupabase();
                        }
                    }
                }
            } catch (e) {
                console.error("Deep link parse error", e);
            }
          }
        });
        // Cleanup function for unlisten if supported by run-time? 
        // onOpenUrl returns a Promise<UnlistenFn> usually.
        return unlisten;
      } catch (e) {
        console.error("Deep link setup failed", e);
      }
    };
    
    let unlistenFn;
    setupDeepLink().then(fn => unlistenFn = fn);
    
    return () => {
        if (unlistenFn) unlistenFn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for 'import-note' events safely
  useEffect(() => {
    const handleImportNoteEvent = async (e) => {
        const slug = e.detail;
        if (!slug) return;
        
        try {
            setAppLoading({ isLoading: true, status: "Importation de la note..." });
            const { data, error } = await dataService.getPublicNote(slug);
            
            if (error || !data) {
                console.error("Failed to fetch public note", error);
                alert("Erreur lors de l'importation de la note partagée.");
                setAppLoading({ isLoading: false, status: '' });
                return;
            }

            // Demander confirmation avant d'importer la note copiée
            const confirmImport = window.confirm(`Voulez-vous importer la note partagée "${data.title || 'Sans titre'}" dans votre espace ?\nElle sera ajoutée à vos notes partagées.`);
            if (!confirmImport) {
                setAppLoading({ isLoading: false, status: '' });
                return;
            }

            const newId = crypto.randomUUID();
            const importedNote = {
                ...data,
                id: newId,
                public_slug: null, // Don't steal original's slug
                shared: true,      // Pre-add to shared list/category
                created_at: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            setNotes(prev => [importedNote, ...prev]);
            setSelectedNoteId(newId);
            setActiveNav('shared');
            
            // Save to DB
            await dataService.saveNote(importedNote);
        } catch (err) {
            console.error("Error importing note:", err);
            alert("Erreur lors de l'importation de la note partagée.");
        } finally {
            setAppLoading({ isLoading: false, status: "" });
        }
    };

    window.addEventListener('import-note', handleImportNoteEvent);
    return () => window.removeEventListener('import-note', handleImportNoteEvent);
  }, []); // notes are accessed correctly via functional update prev => ...

  // Configure Auto Updater
  useEffect(() => {
    const checkAndInstallUpdates = async () => {
      // Désactiver les mises à jour automatiques en mode développement
      if (import.meta.env.DEV) {
        return;
      }
      
      // Check if user disabled auto-update
      if (settingsRef.current?.autoUpdate === false) {
        return;
      }
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update?.available) {
          console.log(`Update available: ${update.version}`);
            const yes = await ask(`Une nouvelle version de Fiip vous attend (v${update.version}).\n\nVoulez-vous la télécharger et l'installer maintenant ?`, {
              title: 'Mise à jour disponible',
              kind: 'info',
              okLabel: 'Mettre à jour',
              cancelLabel: 'Plus tard'
            });
            if (yes) {
              await update.downloadAndInstall();
              console.log("Update installed, relaunching...");
              // Redémarrer l'application pour appliquer les changements
              await relaunch();
            }
        }
      } catch (e) {
        console.error("Erreur durant la mise à jour automatique :", e);
      }
    };
    checkAndInstallUpdates();
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e) => {
        // Check if target is a button, or inside a button
        let target = e.target;
        while (target && target !== document.body) {
            if (target.tagName === 'BUTTON' || target.getAttribute('role') === 'button') {
                soundManager.play('interaction');
                break;
            }
            target = target.parentElement;
        }
    };
    window.addEventListener('click', handleGlobalClick, true); // Capture phase to ensure we catch it
    return () => window.removeEventListener('click', handleGlobalClick, true);
  }, []);

  // Initialize KeyAuth and check license with Loading Screen
  useEffect(() => {
    const initApp = async () => {
        try {
            setAppLoading({ isLoading: true, status: "Démarrage des services..." });

            // Helper function to prevent any await from blocking infinitely
            const withGlobalTimeout = (promise, ms, name) => {
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${name}`)), ms));
                return Promise.race([promise, timeout]);
            };

            try {
                await withGlobalTimeout(keyAuthService.init(), 5000, "KeyAuth Init");
            } catch (err) {
                console.warn("KeyAuth initialization skipped or failed:", err);
            }

            // Sync Supabase Level to Local
            let user = null;
            try {
                user = await withGlobalTimeout(authService.getUser(), 5000, "Supabase GetUser");
            } catch (err) {
                console.warn("Supabase auth check failed or timed out:", err);
            }
            
            if (user) {
                const savedLevel = user?.user_metadata?.subscription_level || 0;
                const savedKey = user?.user_metadata?.license_key;
                const username = user?.user_metadata?.username || user?.email;
                
                if (savedKey) {
                    setAppLoading({ isLoading: true, status: "Vérification de la licence système..." });
                    try {
                        const res = await withGlobalTimeout(keyAuthService.validateLicense(savedKey), 5000, "KeyAuth Validate");
                        if (res && res.success) {
                            keyAuthService.setLocalLevel(res.level, username);
                        } else {
                            keyAuthService.setLocalLevel(0, username);
                        }
                    } catch (err) {
                        console.warn("License validation timed out or failed:", err);
                        keyAuthService.setLocalLevel(savedLevel, username); // fallback to saved level
                    }
                } else {
                    keyAuthService.setLocalLevel(savedLevel, username);
                }
            }

            // Register Deep Link Protocol (Windows Registry)
            try {
                await withGlobalTimeout(invoke('register_deep_link'), 3000, "Register Deep Link");
                console.log("Deep link protocol registered.");
            } catch (e) {
                console.warn("Failed to register deep link:", e);
            }
            
            setAppLoading({ isLoading: true, status: "Vérification de la licence..." });
            
            // If still not authenticated and not in trial -> show license modal
            if (!keyAuthService.isAuthenticated && !keyAuthService.isTrialActive) {
                setIsLicenseModalOpen(true);
            }
            
            // If logged in, maybe sync?
            if (keyAuthService.isAuthenticated) {
                 setAppLoading({ isLoading: true, status: "Synchronisation des notes..." });
                 // Auto-sync down silently on startup
                 try {
                     await withGlobalTimeout(loadDataFromSupabase(), 8000, "Supabase Sync");
                 } catch (err) {
                     console.warn("Supabase loadDataFromSupabase timeout or failed:", err);
                 }
            }

            setAppLoading({ isLoading: true, status: "Prêt" });
            await new Promise(r => setTimeout(r, 400));
            
        } catch (e) {
            console.error("Critical Init Error", e);
            setAppLoading({ isLoading: false, status: "Mode hors ligne" });
        } finally {
            // ALWAYS finish loading
            setAppLoading({ isLoading: false, status: "" });
        }
    };
    initApp();

    // Set up auth state listener
    const authListener = authService.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            const level = session.user.user_metadata?.subscription_level || 0;
            const username = session.user.user_metadata?.username || session.user.email;
            keyAuthService.setLocalLevel(level, username);
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                await loadDataFromSupabase();
            }
        } else if (event === 'SIGNED_OUT') {
            keyAuthService.isAuthenticated = false;
            keyAuthService.currentLevel = 0;
            setNotes([{ id: '1', title: 'Bienvenue', content: 'Connectez-vous pour synchroniser...', favorite: false, badges: [], tags: [] }]);
        }
    });

    // Sync on window focus
    const handleFocus = () => {
        if (keyAuthService.isAuthenticated) {
            loadDataFromSupabase();
        }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
        if (authListener?.data?.subscription) {
            authListener.data.subscription.unsubscribe();
        }
        window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Supabase Data Sync & Realtime ---
  const loadDataFromSupabase = async () => {
    const user = await authService.getUser();
    if (!user) return;

    setIsSyncing(true);
    try {
      // 1. Fetch Notes with Migration Logic
      const { data: remoteNotes, error: notesError } = await dataService.fetchNotes();
      
      if (!notesError && remoteNotes) {
          const localNotes = notesRef.current;
          // Check for migration needed: Local has data, Remote is empty
          if (remoteNotes.length === 0 && localNotes && localNotes.length > 0) {
              // Check if only default note
              const isDefault = localNotes.length === 1 && localNotes[0].id === '1';
              
              if (!isDefault) {
                  // Migrate local notes to cloud
                  console.log("Migrating local notes to Supabase...");
                  for (const note of localNotes) {
                      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(note.id);
                      let noteToSave = { ...note };
                      
                      if (!isValidUUID) {
                          noteToSave.id = crypto.randomUUID();
                      }
                      
                      await dataService.saveNote(noteToSave);
                  }
                  // Re-fetch after migration
                  const { data: migratedNotes, error: fetchErr } = await dataService.fetchNotes();
                  if (!fetchErr && migratedNotes) setNotes(migratedNotes);
              }
          } else if (remoteNotes.length > 0) {
              setNotes(remoteNotes);
          }
      }

      // 2. Fetch Settings
      const { data: remoteSettings, error: settingsError } = await dataService.fetchSettings();
      if (!settingsError && remoteSettings && Object.keys(remoteSettings).length > 0) {
         setSettings(prev => ({ ...prev, ...remoteSettings }));
         // Apply language if changed
         if (remoteSettings.language && remoteSettings.language !== i18n.language) {
             i18n.changeLanguage(remoteSettings.language);
         }
      }

      console.log("Supabase data loaded successfully");
    } catch (e) {
      console.error("Error loading data from Supabase:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let subscription;
    const setupRealtime = async () => {
      const user = await authService.getUser();
      if (!user) return;

      subscription = dataService.subscribeToNotes((payload) => {
          console.log('Realtime change:', payload);
          if (payload.eventType === 'INSERT') {
             setNotes(prev => {
                const exists = prev.find(n => n.id === payload.new.id);
                if (exists) return prev;
                return [payload.new, ...prev];
             });
          } else if (payload.eventType === 'UPDATE') {
             setNotes(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n));
          } else if (payload.eventType === 'DELETE') {
             setNotes(prev => prev.filter(n => n.id !== payload.old.id));
          }
      });
    };
    setupRealtime();

    return () => {
        if (subscription) supabase.removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyAuthService.isAuthenticated]); // Re-run when auth changes

  // Keep local storage in sync
  useEffect(() => {
      if (notes) localStorage.setItem("fiip-notes", JSON.stringify(notes));
  }, [notes]);

  const handleLoginSuccess = async () => {
      setIsAuthModalOpen(false);
      await loadDataFromSupabase();
  };

  // Detect OS for default settings
  useEffect(() => {
    if (!localStorage.getItem("fiip-settings")) {
        const checkOS = async () => {
            try {
                const osType = await type();
                if (osType === 'windows' || osType === 'linux') {
                    setSettings(prev => ({ ...prev, titlebarStyle: 'windows' }));
                }
            } catch (e) {
                console.error("Failed to detect OS", e);
            }
        };
        checkOS();
    }
  }, []);

  // Disable default context menu (Inspect Element)
  useEffect(() => {
    const handleContextMenu = (e) => {
      // Allow context menu only on inputs and textareas if needed, 
      // but user asked to remove "Inspect", so we block it globally 
      // unless we implement custom menus everywhere.
      // For now, we block it globally to satisfy "enlève le inspecter".
      // We will implement custom context menu for notes in Sidebar.
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Handle Close Request
  useEffect(() => {
      let unlisten;
      const initCloseListener = async () => {
          const win = getCurrentWindow();
        unlisten = await win.listen('close-requested', async () => {
            // Check if we need to sync
              if (settings.cloudSync && keyAuthService.isAuthenticated) {
                  // We can't easily prevent close in async listener in all Tauri versions cleanly without a state flag loop
                  // But we can try to fire a sync. 
                  // For a truly robust "save on exit", we'd need to preventDefault(), sync, then close.
                  // For now, let's assume the 3s auto-save catches most, and we fire one last attempt.
                  // However, since the app dies, this async call might die with it.
                  // Best practice: The 3s debounce is the main mechanism.
                  // We can reduce it to 1s for "iCloud-like" speed.
                  console.log("Closing...");
              }
          });
      };
      initCloseListener();
      return () => { if (unlisten) unlisten(); };
  }, [settings.cloudSync]);

  // Persist Settings
  useEffect(() => {
    localStorage.setItem("fiip-settings", JSON.stringify(settings));
    
    // Apply Settings Effects locally
    document.documentElement.classList.add('dark'); // Force dark
    if (settings.largeText) document.documentElement.classList.add('text-lg');
    else document.documentElement.classList.remove('text-lg');
    
    const effect = settings.windowEffect || 'none';
    document.documentElement.classList.remove('effect-none', 'effect-mica', 'effect-acrylic', 'effect-blur');
    document.documentElement.classList.add(`effect-${effect}`);
    
    if (effect === 'none') {
        document.body.style.backgroundColor = '#1C1C1E';
    } else {
        document.body.style.backgroundColor = 'transparent';
    }
    
    invoke('set_window_effect', { effect })
      .catch(err => console.error("Failed to set window effect:", err));

    // Save to Supabase (Debounced)
    const timeoutId = setTimeout(() => {
        dataService.saveSettings(settings);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [settings]);


  // Close Dexter if AI is disabled
  useEffect(() => {
    if (settings.aiEnabled === false && isDexterOpen) {
      setIsDexterOpen(false);
    }
  }, [settings.aiEnabled, isDexterOpen]);

  // Handle Theme & Settings Persistence
  useEffect(() => {
    localStorage.setItem("fiip-settings", JSON.stringify(settings));

    // Force Dark Mode
    document.documentElement.classList.add('dark');

    // Apply Font Size
    if (settings.largeText) {
      document.documentElement.classList.add('text-lg');
    } else {
      document.documentElement.classList.remove('text-lg');
    }

    // Apply Window Effect
    const effect = settings.windowEffect || 'none';
    document.documentElement.classList.remove('effect-none', 'effect-mica', 'effect-acrylic', 'effect-blur');
    document.documentElement.classList.add(`effect-${effect}`);

    // Apply UI Theme
    document.body.classList.remove('theme-default', 'theme-liquid-glass-original', 'theme-liquid-glass-op');
    document.body.classList.add(`theme-${settings.uiTheme || 'default'}`);

    // If effect is 'none', ensure we have a background color
    if (effect === 'none') {
        document.body.style.backgroundColor = '#1C1C1E';
    } else {
        document.body.style.backgroundColor = 'transparent';
    }

    invoke('set_window_effect', { effect })
      .catch(err => console.error("Failed to set window effect:", err));

  }, [settings]);

  const handleCreateNote = async (initialData = {}) => {
    const user = await authService.getUser();
    
    // Generating UUID locally to match Supabase schema
    // If initialData already has an id, it's a complete note (from import)
    if (initialData.id) {
      setNotes(prevNotes => [initialData, ...prevNotes]);
      setSelectedNoteId(initialData.id);
      await dataService.saveNote(initialData);
      return;
    }

    // Otherwise, create a new empty note
    const newNote = {
      id: crypto.randomUUID(),
      title: initialData.title || "",
      content: initialData.content || "",
      updatedAt: Date.now(), // Local timestamp, Supabase will use its own or this one
      deleted: false,
      favorite: false,
      user_id: user ? user.id : undefined
    };
    setNotes(prevNotes => [newNote, ...prevNotes]);
    setSelectedNoteId(newNote.id);
    const saved = await dataService.saveNote(newNote);
    
    // Once saved, if it was successful and returned data, we could potentially update the note with DB defaults, e.g., user_id.
    // By adding it directly above, we solve the owner UI bug immediately.
  };

  const handleUpdateNote = (updatedNote) => {
    setNotes((prevNotes) => prevNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
    // Debounce Save to Supabase
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
        setIsSyncing(true);
        await dataService.saveNote(updatedNote);
        setIsSyncing(false);
    }, 1000);
  };

  /*
  const checkStorageLimit = async (additionalBytes = 0) => {
      const user = await authService.getUser();
      const level = user?.user_metadata?.subscription_level || 0;
      const limit = getStorageLimit(level);
      if (limit === 0) return true; 
      
      const currentUsage = await calculateTotalUsage(notes);
      
      if (currentUsage + additionalBytes > limit) {
          return false;
      }
      return true;
  };
  */
  const handleDeleteNote = (noteId) => {
    const idToDelete = noteId || selectedNoteId;
    if (!idToDelete) return;

    if (activeNav === 'trash') {
        // Permanent delete
        const newNotes = notes.filter((n) => n.id !== idToDelete);
        setNotes(newNotes);
        if (selectedNoteId === idToDelete) {
            setSelectedNoteId(newNotes[0]?.id || null);
        }
        dataService.deleteNote(idToDelete);
    } else {
        // Soft delete
        setNotes(prev => {
            const newNotes = prev.map(n => n.id === idToDelete ? { ...n, deleted: true } : n);
            const note = newNotes.find(n => n.id === idToDelete);
            if (note) dataService.saveNote(note);
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
          if (note) dataService.saveNote(note);
          return newNotes;
      });
  };

  const handleToggleFavorite = (noteId) => {
      setNotes(prev => {
          const newNotes = prev.map(n => n.id === noteId ? { ...n, favorite: !n.favorite } : n);
          const note = newNotes.find(n => n.id === noteId);
          if (note) dataService.saveNote(note);
          return newNotes;
      });
  };

  const handleEmptyTrash = () => {
    const toDelete = notes.filter(n => n.deleted);
    toDelete.forEach(n => dataService.deleteNote(n.id));

    setNotes(prev => prev.filter(n => !n.deleted));
    if (selectedNoteId && notes.find(n => n.id === selectedNoteId)?.deleted) {
        setSelectedNoteId(null);
    }
  };

  // Find active note
  const activeNote = notes.find((n) => n.id === selectedNoteId);

  const handleCloudSync = async () => {
      await loadDataFromSupabase();
  };

  return (
    <div className="h-screen w-screen bg-transparent text-white overflow-hidden flex flex-col font-sora select-none">
      <Titlebar style={settings.titlebarStyle} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar 
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleDexter={() => setIsDexterOpen(!isDexterOpen)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            settings={settings}
            activeNav={activeNav}
            onNavigate={setActiveNav}
            isSyncing={isSyncing}
            onSync={() => handleCloudSync(true)}
        />

        {/* Note List */}
        <NoteList 
            notes={notes} 
            selectedNoteId={selectedNoteId} 
            onSelectNote={setSelectedNoteId} 
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            onToggleFavorite={handleToggleFavorite}
            onEmptyTrash={handleEmptyTrash}
            onRestoreNote={handleRestoreNote}
            activeNav={activeNav}
            settings={settings}
            isSyncing={isSyncing}
        />

        {/* Editor Area */}
        <div className="flex-1 flex flex-col h-full bg-transparent relative">
            {activeNote ? (
                <Editor 
                    key={activeNote.id} // Force remount on note switch
                    note={activeNote} 
                    onUpdateNote={handleUpdateNote} 
                    settings={settings}
                    onOpenShare={() => setIsShareModalOpen(true)}
                />
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-4">
                    <IconFileText className="w-16 h-16 opacity-20" />
                    <p className="text-sm opacity-50">{t('editor.no_note_selected', "Aucune note sélectionnée")}</p>
                </div>
            )}
        </div>

        {/* Dexter AI Panel */}
        <Dexter 
            isOpen={isDexterOpen} 
            onClose={() => setIsDexterOpen(false)} 
            currentNote={activeNote}
            onUpdateNote={handleUpdateNote}
            settings={settings}
        />
      </div>

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onUpdateSettings={setSettings}
        storageUsage={storageUsage}
        onSync={() => handleCloudSync(true)}
      />
      
      <LicenseModal 
        isOpen={isLicenseModalOpen} 
        onClose={() => setIsLicenseModalOpen(false)} 
        onOpenAuth={() => { setIsLicenseModalOpen(false); setIsAuthModalOpen(true); }}
      />
      
      <ChatModal 
        isOpen={isChatModalOpen} 
        onClose={() => setIsChatModalOpen(false)} 
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        note={activeNote}
        notes={notes}
        onUpdateNote={handleUpdateNote}
      />

      {/* 
      <CollaborationView 
        note={activeNote} 
        isOpen={false} // Placeholder for future collab feature
        onClose={() => {}}
        onImportNote={handleCreateNote}
      />
      */}

      {appLoading.isLoading && (
        <LoadingScreen status={appLoading.status} />
      )}
    </div>
  );
}

export default App;
