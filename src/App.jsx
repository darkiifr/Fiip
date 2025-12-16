import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import SettingsModal from "./components/SettingsModal";
import Dexter from "./components/Dexter";
import Titlebar from "./components/Titlebar";
import "./App.css";

import { type } from '@tauri-apps/plugin-os';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

function App() {
  const { t } = useTranslation();
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDexterOpen, setIsDexterOpen] = useState(false);

  // Settings State with Persistence
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("fiip-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return { darkMode: true, largeText: false, windowEffect: 'mica', titlebarStyle: 'macos' };
  });

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

  // Persist Notes
  useEffect(() => {
    localStorage.setItem("fiip-notes", JSON.stringify(notes));
  }, [notes]);

  // Close Dexter if AI is disabled
  useEffect(() => {
    if (settings.aiEnabled === false && isDexterOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleDeleteNote = () => {
    if (!selectedNoteId) return;
    const newNotes = notes.filter((n) => n.id !== selectedNoteId);
    setNotes(newNotes);
    setSelectedNoteId(newNotes[0]?.id || null);
  };

  const selectedNote = Array.isArray(notes) ? notes.find((n) => n.id === selectedNoteId) : null;

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden text-gray-100 font-sans transition-colors duration-300 ${settings.largeText ? 'text-lg' : ''} bg-[#1C1C1E]/40`}>
      <Titlebar style={settings.titlebarStyle} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          notes={notes}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleDexter={() => setIsDexterOpen(!isDexterOpen)}
          settings={settings}
        />
        {selectedNote ? (
          <Editor
            note={selectedNote}
            onUpdateNote={handleUpdateNote}
            settings={settings}
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
