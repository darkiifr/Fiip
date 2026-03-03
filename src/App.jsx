
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
import CollaborationView from "./components/CollaborationView";
import "./App.css";

import { type } from '@tauri-apps/plugin-os';
import { readFile } from '@tauri-apps/plugin-fs';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { relaunch } from '@tauri-apps/plugin-process';
import { useTranslation } from 'react-i18next';
import IconFileText from '~icons/mingcute/file-fill';
import { keyAuthService } from "./services/keyauth";
import { authService, storageService, getStorageLimit } from "./services/supabase";
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

const LICENSE_URL = "https://votre-site-de-licence.com"; // À remplacer par le vrai lien

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
  const settingsRef = useRef(settings);

  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Update storage info whenever notes change or modal opens
  useEffect(() => {
      const updateStorage = async () => {
          const used = await calculateTotalUsage(notes);
          const user = await authService.getUser();
          const level = user?.user_metadata?.subscription_level || 0;
          const limit = getStorageLimit(level);
          const percent = limit > 0 ? (used / limit) * 100 : 0;
          setStorageUsage({ used, limit, percent });
      };
      updateStorage();
  }, [notes, isSettingsOpen]);

  // Safety Net: Force app to load after 7 seconds no matter what
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
        setAppLoading(prev => {
            if (prev.isLoading) {
                console.warn("Safety net triggered: Force loading app");
                return { isLoading: false, status: "" };
            }
            return prev;
        });
    }, 7000);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Configure Deep Link Listener
  useEffect(() => {
    const setupDeepLink = async () => {
      try {
        const unlisten = await onOpenUrl(async (urls) => {
          console.log('Deep link received:', urls);
          for (const url of urls) {
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
                        
                        if (savedKey) {
                            // Validation de la clé de l'utilisateur après login Google
                            const res = await keyAuthService.validateLicense(savedKey);
                            if (res.success) {
                                keyAuthService.setLocalLevel(res.level);
                            } else {
                                keyAuthService.setLocalLevel(0);
                            }
                        } else {
                            keyAuthService.setLocalLevel(savedLevel);
                        }
                        
                        setIsAuthModalOpen(false);
                        
                        if (keyAuthService.isAuthenticated || keyAuthService.isTrialActive) {
                            setIsLicenseModalOpen(false);
                        } else {
                            setIsLicenseModalOpen(true);
                        }

                        // Force sync immediately
                        if (typeof performCloudSyncDown === 'function') {
                            await performCloudSyncDown(false);
                        } else {
                            console.warn("performCloudSyncDown not available yet");
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

  // Configure Auto Updater
  useEffect(() => {
    const checkAndInstallUpdates = async () => {
      // Check if user disabled auto-update
      if (settingsRef.current?.autoUpdate === false) {
        return;
      }
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update?.available) {
          console.log(`Update available: ${update.version}`);
          await update.downloadAndInstall();
          console.log("Update installed, relaunching...");
          // Redémarrer l'application pour appliquer les changements
          await relaunch();
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
            // Fake sequence for UX
            setAppLoading({ isLoading: true, status: "Démarrage des services..." });
            await new Promise(r => setTimeout(r, 800));

            setAppLoading({ isLoading: true, status: "Connexion au serveur..." });
            
            // Timeout wrapper for KeyAuth init to prevent blocking
            const initWithTimeout = async () => {
                const timeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Connection timed out")), 5000)
                );
                return Promise.race([keyAuthService.init(), timeout]);
            };

            try {
                await initWithTimeout();
            } catch (err) {
                console.warn("KeyAuth initialization skipped or failed:", err);
                // Continue execution so user isn't stuck
            }

            // Sync Supabase Level to Local
            const user = await authService.getUser();
            if (user) {
                const savedLevel = user?.user_metadata?.subscription_level || 0;
                const savedKey = user?.user_metadata?.license_key;
                
                if (savedKey) {
                    setAppLoading({ isLoading: true, status: "Vérification de la licence système..." });
                    // Validation silencieuse en arrière-plan
                    const res = await keyAuthService.validateLicense(savedKey);
                    if (res.success) {
                        keyAuthService.setLocalLevel(res.level); // Met à jour le niveau réel
                    } else {
                        // Clé expirée ou invalide, on remet le niveau à 0
                        keyAuthService.setLocalLevel(0);
                    }
                } else {
                    keyAuthService.setLocalLevel(savedLevel);
                }
            }

            // Register Deep Link Protocol (Windows Registry)
            try {
                await invoke('register_deep_link');
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
                 await performCloudSyncDown(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cloud Sync Logic
  // Using Refs to ensure latest state access even in async callbacks/listeners
  const handleCloudSync = async (force = false) => {
      const currentSettings = settingsRef.current;
      const currentNotes = notesRef.current;

      // Security check: Never sync if disabled in settings
      if (currentSettings.cloudSync === false && !force) {
          console.log("Cloud sync disabled by user.");
          return;
      }

      // Check portability (don't sync if portable)
      try {
          const isPortable = await invoke('is_portable');
          if (isPortable) {
              console.log("Portable mode: Sync disabled.");
              return;
          }
      } catch { /* ignore */ }
      
      // Prevent sync for Trial users (Free Trial has no cloud access)
      if (keyAuthService.isTrialActive) {
          console.log("Sync disabled for Trial users.");
          return;
      }

      // Only sync if user is logged in with account
      const user = await authService.getUser();
      if (!user) return;

      setIsSyncing(true);
      try {
          const settingsToSync = { ...currentSettings };

          // Remove strictly excluded hardware settings
          delete settingsToSync.audioInputId;
          delete settingsToSync.audioOutputId;

          settingsToSync.language = i18n.language; 
          
          const updates = {
              settings: settingsToSync
          };
          
          // Sync Notes always when cloudSync is true
          if (currentSettings.cloudSync !== false) {
              // Deep copy notes to avoid mutating state
              const hydratedNotes = JSON.parse(JSON.stringify(currentNotes));

              // Process attachments: Upload local files to cloud
              for (const note of hydratedNotes) {
                  if (note.attachments && Array.isArray(note.attachments)) {
                      const processedAttachments = [];
                      
                      for (const att of note.attachments) {
                          // Check if it's a local file path (string not starting with http/data/blob)
                          // OR if it's a large Base64 string (> 100KB)
                          const isLocalFile = att.data && typeof att.data === 'string' && !att.data.startsWith('data:') && !att.data.startsWith('http') && !att.data.startsWith('blob:');
                          const isLargeBase64 = att.data && typeof att.data === 'string' && att.data.startsWith('data:') && att.data.length > 100000;

                          if (isLocalFile || isLargeBase64) {
                               try {
                                   let file;
                                   if (isLocalFile) {
                                       // Verify file exists and read it
                                       const content = await readFile(att.data);
                                       // Prepare file object
                                       const mime = att.mimeType || 'application/octet-stream';
                                       const blob = new Blob([content], { type: mime });
                                       file = new File([blob], att.name, { type: mime });
                                   } else {
                                       // Convert Base64 (Data URI) to Blob
                                       const fetchRes = await fetch(att.data);
                                       const blob = await fetchRes.blob();
                                       // Ensure filename has extension
                                       let name = att.name;
                                       if (!name.includes('.')) {
                                           const ext = blob.type.split('/')[1] || 'bin';
                                           name = `${name}.${ext}`;
                                       }
                                       file = new File([blob], name, { type: blob.type });
                                   }
                                   
                                   // Upload to Supabase Storage
                                   const uploadRes = await storageService.uploadFile(user.id, file, `attachments/${Date.now()}_${file.name}`);
                                   const publicUrl = storageService.getPublicUrl(user.id, uploadRes.path);
                                   
                                   if (publicUrl) {
                                       processedAttachments.push({
                                           ...att,
                                           data: publicUrl,
                                           // Keep mimeType and type
                                       });
                                   } else {
                                       console.warn("Upload failed for " + att.name);
                                       processedAttachments.push({ ...att, syncError: "Upload failed" });
                                   }
                               } catch (e) {
                                   console.error("Sync attachment error", e);
                                   if (e.message === "STORAGE_LIMIT_EXCEEDED") {
                                        alert(t('storage.limit_exceeded', "Limite de stockage atteinte. Veuillez mettre à niveau votre licence."));
                                        await open(LICENSE_URL);
                                        return; // Stop sync
                                   }
                                   processedAttachments.push({ ...att, syncError: "File processing error" });
                               }
                          } else {
                              // Already Cloud URL or small Data URI
                              processedAttachments.push(att);
                          }
                      }
                      note.attachments = processedAttachments;
                  }
              }
              updates.notes = hydratedNotes;
          }
          
          // Upload data.json to Supabase
          const blob = new Blob([JSON.stringify(updates)], { type: 'application/json' });
          const file = new File([blob], 'data.json', { type: 'application/json' });
          await storageService.uploadFile(user.id, file, 'data.json');

      } catch (err) {
          console.error("Cloud sync failed:", err);
          if (err.message === "STORAGE_LIMIT_EXCEEDED") {
              alert(t('storage.limit_exceeded', "Limite de stockage atteinte. Veuillez mettre à niveau votre licence."));
              await open(LICENSE_URL);
          }
      } finally {
          setIsSyncing(false);
      }
  };

  const performCloudSyncDown = async (silent = false) => {
      // Prevent sync for Trial users (Free Trial has no cloud access)
      if (keyAuthService.isTrialActive) {
          console.log("Cloud sync download disabled for Trial users.");
          return;
      }
      
      const currentSettings = settingsRef.current;

      // Only sync if enabled
      if (currentSettings.cloudSync === false) return;

      const user = await authService.getUser();
      if (!user) return;

      setIsSyncing(true);
      try {
          // Try to load data from Supabase
          try {
              const jsonText = await storageService.downloadFile(user.id, 'data.json');
              const data = JSON.parse(jsonText);
              
              if (data) {
                  const syncNotesEnabled = true; // Always sync notes for iCloud-style
                  
                  if (syncNotesEnabled && data.notes && Array.isArray(data.notes)) {
                      const cloudNotes = data.notes;
                      if (cloudNotes.length > 0) {
                          setNotes(prev => {
                              const newNotes = [...prev];
                              cloudNotes.forEach(cNote => {
                                  const idx = newNotes.findIndex(n => n.id === cNote.id);
                                  if (idx === -1) {
                                      newNotes.push(cNote);
                                  } else {
                                      // Merge based on updatedAt. Robust date comparison
                                      const cloudTime = new Date(cNote.updatedAt || 0).getTime();
                                      const localTime = new Date(newNotes[idx].updatedAt || 0).getTime();
                                      
                                      if (cloudTime > localTime) {
                                          newNotes[idx] = cNote;
                                      }
                                  }
                              });
                              return newNotes;
                          });
                      }
                  }
                  
                  // Sync Settings (all-or-nothing approach)
                  if (data.settings) {
                      const newSettings = { ...currentSettings, ...data.settings };
                      // Ensure local cloudSync preference isn't accidentally overridden if it was false
                      if (currentSettings.cloudSync === false) {
                          newSettings.cloudSync = false;
                      }
                      setSettings(newSettings);
                      localStorage.setItem('fiip-settings', JSON.stringify(newSettings));
                      if (newSettings.language && newSettings.language !== i18n.language) {
                          i18n.changeLanguage(newSettings.language);
                      }
                  }
              }
              
              if (!silent) {
                  console.log("Cloud sync downward complete");
              }
          } catch (e) {
              console.warn("No cloud data found or failed to parse", e);
              if (!silent) handleCloudSync(true); // First sync up
          }
      } catch (err) {
          console.error("Cloud sync downward failed:", err);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleLoginSuccess = async () => {
      setIsAuthModalOpen(false);
      await performCloudSyncDown(false);
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

  // Persist Notes & Cloud Sync
  useEffect(() => {
    localStorage.setItem("fiip-notes", JSON.stringify(notes));
    // Trigger Cloud Sync (debounced)
    if (settings.cloudSync) {
        const timeoutId = setTimeout(() => {
            handleCloudSync();
        }, 2000); // Reduced to 2s for faster sync
        return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, settings]); // Re-run when notes OR settings change

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

    // If effect is 'none', ensure we have a background color
    if (effect === 'none') {
        document.body.style.backgroundColor = '#1C1C1E';
    } else {
        document.body.style.backgroundColor = 'transparent';
    }

    invoke('set_window_effect', { effect })
      .catch(err => console.error("Failed to set window effect:", err));

  }, [settings]);

  const handleCreateNote = (initialData = {}) => {
    // If initialData already has an id, it's a complete note (from import)
    if (initialData.id) {
      setNotes([initialData, ...notes]);
      setSelectedNoteId(initialData.id);
      return;
    }

    // Otherwise, create a new empty note
    const newNote = {
      id: Date.now().toString(),
      title: initialData.title || "",
      content: initialData.content || "",
      updatedAt: Date.now(),
      deleted: false,
      favorite: false,
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateNote = (updatedNote) => {
    setNotes((prevNotes) => prevNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
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
    } else {
        // Soft delete
        setNotes(prev => prev.map(n => n.id === idToDelete ? { ...n, deleted: true } : n));
        if (selectedNoteId === idToDelete) {
             setSelectedNoteId(null);
        }
    }
  };

  const handleRestoreNote = (noteId) => {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, deleted: false } : n));
  };

  const handleToggleFavorite = (noteId) => {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, favorite: !n.favorite } : n));
  };

  const handleEmptyTrash = () => {
    setNotes(prev => prev.filter(n => !n.deleted));
    if (selectedNoteId && notes.find(n => n.id === selectedNoteId)?.deleted) {
        setSelectedNoteId(null);
    }
  };

  // Find active note
  const activeNote = notes.find((n) => n.id === selectedNoteId);

  return (
    <div className="h-screen w-screen bg-[#1C1C1E] text-white overflow-hidden flex flex-col font-sora select-none">
      <Titlebar />

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
        />

        {/* Editor Area */}
        <div className="flex-1 flex flex-col h-full bg-[#1C1C1E] relative">
            {activeNote ? (
                <Editor 
                    key={activeNote.id} // Force remount on note switch
                    note={activeNote} 
                    onUpdate={handleUpdateNote} 
                    settings={settings}
                    onShare={() => setIsShareModalOpen(true)}
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
      />

      <CollaborationView 
        note={activeNote} 
        isOpen={false} // Placeholder for future collab feature
        onClose={() => {}}
      />

      {appLoading.isLoading && (
        <LoadingScreen status={appLoading.status} />
      )}
    </div>
  );
}

export default App;
