import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import SettingsModal from "./components/SettingsModal";
import LicenseModal from "./components/LicenseModal";
import ChatModal from "./components/ChatModal";
import AuthModal from "./components/AuthModal";
import LoadingScreen from "./components/LoadingScreen";
import Dexter from "./components/Dexter";
import Titlebar from "./components/Titlebar";
import "./App.css";

import { type } from '@tauri-apps/plugin-os';
import { readFile } from '@tauri-apps/plugin-fs';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { keyAuthService } from "./services/keyauth";
import { soundManager } from "./services/soundManager";
import { calculateTotalUsage } from "./services/fileManager";

// Helper to convert buffer to base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function App() {
  const { t, i18n } = useTranslation();
  const [appLoading, setAppLoading] = useState({ isLoading: true, status: 'Chargement...' });
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
  const [storageUsage, setStorageUsage] = useState({ used: 0, limit: 0, percent: 0 });

  // Update storage info whenever notes change or modal opens
  useEffect(() => {
      const updateStorage = async () => {
          const used = await calculateTotalUsage(notes);
          const limit = keyAuthService.getStorageLimit();
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
            
            setAppLoading({ isLoading: true, status: "Vérification de la licence..." });
            // Force check subscription status
            try {
                // If not authenticated, try to restore session first (handled by init)
                // If still not authenticated and not in trial -> show license modal
                if (!keyAuthService.checkSubscription()) {
                    setIsLicenseModalOpen(true);
                     // If it's a critical license check, you might want to force the modal and prevent closing
                     // until a valid key is provided.
                }

                // Verify specific hardware/session validity if needed
                // E.g. re-login silently if session expired but key is stored?
                // init() handles restoreSession() which calls login().
                
                // If logged in, double check user status just to be sure
                if (keyAuthService.isAuthenticated) {
                     // Check if hwid is mismatch? (Handled by server usually)
                     // Refresh user data is handled during login
                     
                     // Optional: Re-fetch data to ensure up to date license
                     // But we just logged in via init->restoreSession, so it should be fresh.
                }
                
            } catch (e) {
                console.warn("Subscription check invalid", e);
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
  }, []);

  // Cloud Sync Logic
  const handleCloudSync = async () => {
      // Security check: Never sync if disabled in settings
      if (settings.cloudSync === false) {
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
      } catch (_e) { /* ignore */ }

      // Only sync if user is logged in with account (has username)
      if (!keyAuthService.isAuthenticated || !keyAuthService.userData?.username) return;

      // Load existing cloud data first to avoid wiping other fields
      let currentCloudData = {};
      try {
          const res = await keyAuthService.loadUserData();
          if (res.success && res.data) currentCloudData = res.data;
      } catch (_e) { /* ignore */ }
      
      const settingsToSync = { ...settings };
      const prefs = settings.syncPreferences || {};
      
      // Define groups
      const groups = {
        ai: ['aiApiKey', 'aiModel', 'aiEnabled', 'customModels'],
        appearance: ['theme', 'darkMode', 'windowEffect', 'titlebarStyle', 'largeText'],
        general: ['autoSave', 'enableCorrection', 'cloudSync', 'appSound', 'chatSound'],
      };

      // Remove strictly excluded hardware settings
      delete settingsToSync.audioInputId;
      delete settingsToSync.audioOutputId;

      // Filter granularly
      if (prefs.ai === false) groups.ai.forEach(k => delete settingsToSync[k]);
      if (prefs.appearance === false) groups.appearance.forEach(k => delete settingsToSync[k]);
      if (prefs.general === false) groups.general.forEach(k => delete settingsToSync[k]);
      
      // Language special handling
      if (prefs.language !== false) {
           settingsToSync.language = i18n.language; 
      } else {
           delete settingsToSync.language;
      }
      
      const newData = {
          ...currentCloudData,
          settings: settingsToSync
      };
      
      // Sync Notes only if enabled (default true)
      if (settings.cloudSync && prefs.notes !== false) {
          // Deep copy notes to avoid mutating state
          const hydratedNotes = JSON.parse(JSON.stringify(notes));

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
                               
                               // Upload to KeyAuth
                               const uploadRes = await keyAuthService.fileUpload(file, file.name);
                               
                               if (uploadRes.success && uploadRes.url) {
                                   processedAttachments.push({
                                       ...att,
                                       data: uploadRes.url,
                                       // Keep mimeType and type
                                   });
                               } else {
                                   console.warn("Upload failed for " + att.name, uploadRes.message);
                                   // Keep original local path/content so it works locally at least
                                   processedAttachments.push({ ...att, syncError: "Upload failed: " + uploadRes.message });
                               }
                           } catch (e) {
                               console.error("Sync attachment error", e);
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
          newData.notes = hydratedNotes;
      }
      
      await keyAuthService.saveUserData(newData);
  };

  const performCloudSyncDown = async (silent = false) => {
      // Only sync if enabled
      if (settings.cloudSync === false) return;

      // Try to load data
      const res = await keyAuthService.loadUserData();
      if (res.success && res.data) {
          // Sync Notes - Check preference (default true if undefined)
          const syncNotesEnabled = !settings.syncPreferences || settings.syncPreferences.notes !== false;
          
          if (syncNotesEnabled && res.data.notes && Array.isArray(res.data.notes)) {
              const cloudNotes = res.data.notes;
              if (cloudNotes.length > 0) {
                  setNotes(prev => {
                      const newNotes = [...prev];
                      cloudNotes.forEach(cNote => {
                          const idx = newNotes.findIndex(n => n.id === cNote.id);
                          if (idx === -1) {
                              newNotes.push(cNote);
                          } else {
                              // Robust date comparison (handle string vs number timestamps)
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
          
          // Sync Settings
          if (res.data.settings) {
              const cloudSettings = res.data.settings;
              const currentPrefs = settings.syncPreferences || {}; 
              
              setSettings(prev => {
                   const newSettings = { ...prev };
                   const mergeIfEnabled = (category, keys) => {
                       if (currentPrefs[category] !== false) {
                           keys.forEach(k => {
                               if (cloudSettings[k] !== undefined) newSettings[k] = cloudSettings[k];
                           });
                       }
                   };
                   
                   mergeIfEnabled('ai', ['aiApiKey', 'aiModel', 'aiEnabled', 'customModels']);
                   mergeIfEnabled('appearance', ['theme', 'darkMode', 'windowEffect', 'titlebarStyle', 'largeText']);
                   mergeIfEnabled('general', ['autoSave', 'enableCorrection', 'cloudSync', 'appSound', 'chatSound']);
                   
                   // Preserve syncPreferences of THIS device (don't overwrite with cloud's)
                   newSettings.syncPreferences = prev.syncPreferences; 
                   
                   return newSettings;
              });

              // Apply Language
              if (cloudSettings.language && currentPrefs.language !== false) {
                  i18n.changeLanguage(cloudSettings.language);
              }
              
              if (!silent) alert("Données synchronisées avec succès !");
          }
      } else {
         if (!silent) handleCloudSync();
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

  // Persist Notes & Cloud Sync
  useEffect(() => {
    localStorage.setItem("fiip-notes", JSON.stringify(notes));
    // Trigger Cloud Sync (debounced)
    if (settings.cloudSync) {
        const timeoutId = setTimeout(() => {
            handleCloudSync();
        }, 3000); // Sync after 3 seconds of inactivity
        return () => clearTimeout(timeoutId);
    }
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
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateNote = (updatedNote) => {
    setNotes((prevNotes) => prevNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
  };

  const checkStorageLimit = async (additionalBytes = 0) => {
      const limit = keyAuthService.getStorageLimit();
      if (limit === 0) return true; // No limit or not logged in (handled elsewhere) - But wait, if not logged in, usually free tier? Assuming unlimited or restricted elsewhere.
                                    // User said "par abonnement", implying if you have sub you have limit. If no sub, maybe block?
                                    // But license modal blocks usage if no license. So we are always licensed/trial here.
      
      const currentUsage = await calculateTotalUsage(notes);
      
      if (currentUsage + additionalBytes > limit) {
          return false;
      }
      return true;
  };

  const handleDeleteNote = () => {
    if (!selectedNoteId) return;
    const newNotes = notes.filter((n) => n.id !== selectedNoteId);
    setNotes(newNotes);
    setSelectedNoteId(newNotes[0]?.id || null);
  };

  const selectedNote = Array.isArray(notes) ? notes.find((n) => n.id === selectedNoteId) : null;

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden text-gray-100 font-sans transition-colors duration-300 ${settings.largeText ? 'text-lg' : ''} bg-[#1C1C1E]/40`}>
      {appLoading.isLoading && <LoadingScreen status={appLoading.status} />}
      <Titlebar style={settings.titlebarStyle} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          notes={notes}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLicense={() => setIsLicenseModalOpen(true)}
          onToggleDexter={() => setIsDexterOpen(!isDexterOpen)}
          onOpenChat={() => setIsChatModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          settings={settings}
        />
        {selectedNote ? (
          <Editor
            note={selectedNote}
            onUpdateNote={handleUpdateNote}
            onCreateNote={handleCreateNote}
            settings={settings}
            onOpenLicense={() => setIsLicenseModalOpen(true)}
            checkStorageLimit={checkStorageLimit}
          />
        ) : (
            <div className="flex-1 h-full flex items-center justify-center text-gray-500 select-none">
                <div className="flex flex-col items-center gap-4">
                    <FileText className="w-16 h-16 opacity-20" />
                    <p>{t('editor.select_note')}</p>
                </div>
            </div>
        )}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={setSettings}
          storageUsage={storageUsage}
        />
        <LicenseModal
            isOpen={isLicenseModalOpen}
            onClose={() => {
              if (keyAuthService.isAuthenticated || keyAuthService.isTrialActive) {
                setIsLicenseModalOpen(false);
              }
            }}
            onOpenAuth={() => {
                setIsLicenseModalOpen(false);
                setIsAuthModalOpen(true);
            }}
        />
        <ChatModal 
            isOpen={isChatModalOpen}
            onClose={() => setIsChatModalOpen(false)}
        />
        <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => {
              setIsAuthModalOpen(false);
              // If not authenticated and not in trial mode, show license modal again
              if (!keyAuthService.isAuthenticated && !keyAuthService.isTrialActive) {
                setIsLicenseModalOpen(true);
              }
            }}
            onLoginSuccess={handleLoginSuccess}
        />
        <Dexter
          isOpen={isDexterOpen}
          onClose={() => setIsDexterOpen(false)}
          settings={settings}
          onUpdateSettings={setSettings}
          onCreateNote={handleCreateNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          currentNote={selectedNote}
        />
      </div>
    </div>
  );
}

export default App;
