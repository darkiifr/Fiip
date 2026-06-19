import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { type } from '@tauri-apps/plugin-os';
import { relaunch } from '@tauri-apps/plugin-process';
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
import { calculateTotalUsage } from "./services/fileManager";
import { initializeFonts } from "./services/fontStore";
import { keyAuthService } from "./services/keyauth";
import { soundManager } from "./services/soundManager";
import { authService, dataService, getStorageLimit, supabase } from './services/supabase';

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
        deleted: false
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

  // --- Refs ---
  const notesRef = useRef(notes);
  const saveTimeoutRef = useRef(null);

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
    } catch (e) {
      console.error("Sync error", e);
    } finally {
      setIsSyncing(false);
    }
  }

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      try {
        console.log("Fiip v" + (await invoke("get_app_version").catch(() => "3.0.0")) + " initializing...");
        
        await initializeFonts();
        
        const setupDeepLink = async () => {
          try {
            const unlisten = await onOpenUrl(async (urls) => {
              console.log('URLs deep link received:', urls);
              for (const url of urls) {
                try {
                    const parsedUrl = new URL(url);
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
        setupDeepLink().then(fn => unlistenFn = fn).catch(console.error);
        
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
                    if (receivedNote.updatedAt > (existing.updatedAt || 0)) {
                        const newNotes = [...prev];
                        newNotes[index] = receivedNote;
                        return newNotes;
                    }
                    return prev;
                }
                return [...prev, receivedNote];
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
    localStorage.setItem("fiip-settings", JSON.stringify(settings));
    
    // Resolve Light/Dark Mode
    const resolveTheme = () => {
      if (settings.theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return settings.theme === 'light' ? 'light' : 'dark';
    };
    const resolvedTheme = resolveTheme();
    document.documentElement.className = resolvedTheme;
    
    soundManager.setAppSoundEnabled(settings.appSound);
    soundManager.setChatSoundEnabled(settings.chatSound);
    
    if (window.__TAURI_INTERNALS__) {
        invoke('set_window_effect', { effect: settings.windowEffect }).catch(console.error);
        if (settings.windowEffect !== 'none') {
            document.documentElement.classList.add('window-effect-active');
        } else {
            document.documentElement.classList.remove('window-effect-active');
        }
    }
  }, [settings]);

  const handleCreateNote = useCallback(async (title = "", content = "") => {
    const now = getCurrentTimestamp();
    const newNote = {
      id: crypto.randomUUID(),
      title: title || t('common.new_note', "Nouvelle Note"),
      content: content || "",
      updatedAt: now,
      createdAt: now,
      favorite: false,
      deleted: false
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

  // Global Keyboard listener for Command Palette (⌘K) & New Note (⌘N)
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
    const actions = [
      {
        id: 'new-note',
        label: 'Nouvelle Note',
        description: 'Créer une nouvelle note',
        shortcut: ['⌘', 'N'],
        group: 'Actions',
        onSelect: () => handleCreateNote()
      },
      {
        id: 'settings',
        label: 'Préférences',
        description: 'Ouvrir les réglages',
        shortcut: ['⌘', ','],
        group: 'Actions',
        onSelect: () => setActiveNav('settings')
      },
      {
        id: 'theme-light',
        label: 'Activer le Thème Clair',
        description: 'Changer l\'apparence',
        group: 'Apparence',
        onSelect: () => setSettings(prev => ({ ...prev, theme: 'light' }))
      },
      {
        id: 'theme-dark',
        label: 'Activer le Thème Sombre',
        description: 'Changer l\'apparence',
        group: 'Apparence',
        onSelect: () => setSettings(prev => ({ ...prev, theme: 'dark' }))
      }
    ];

    const noteItems = notes.filter(n => !n.deleted).map(n => ({
        id: `note-${n.id}`,
        label: n.title || 'Sans titre',
        description: 'Ouvrir cette note',
        group: 'Notes Récentes',
        onSelect: () => {
            setSelectedNoteId(n.id);
            setActiveNav('home');
        }
    }));

    return [...actions, ...noteItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

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
    <div className="h-screen w-screen bg-transparent text-white overflow-hidden flex flex-col font-sans select-none relative">
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
            onEmptyTrash={handleEmptyTrash}
        />

        <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
            {activeNav === 'settings' ? (
                <SettingsView 
                    settings={settings}
                    onUpdateSettings={setSettings}
                    storageUsage={storageUsage}
                    onSync={() => loadDataFromSupabase()}
                    onBack={() => {
                        setActiveNav('home');
                        setSelectedNoteId(null);
                    }}
                />
            ) : activeNav === 'home' && !selectedNoteId ? (
                <HomeDashboard 
                    featuredNote={notes.find(n => !n.deleted)} 
                    recentNotes={notes.filter(n => !n.deleted).slice(0, 6)}
                    onSelectNote={setSelectedNoteId}
                    onSearchClick={() => setIsCommandPaletteOpen(true)}
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
                />
            ) : (
                <HomeDashboard 
                    featuredNote={notes.find(n => !n.deleted)} 
                    recentNotes={notes.filter(n => !n.deleted).slice(0, 6)}
                    onSelectNote={setSelectedNoteId}
                    onSearchClick={() => setIsCommandPaletteOpen(true)}
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
