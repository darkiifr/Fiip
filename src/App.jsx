import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import SettingsModal from "./components/SettingsModal";
import Dexter from "./components/Dexter";
import Titlebar from "./components/Titlebar";
import "./App.css";

import { type } from '@tauri-apps/plugin-os';

function App() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("fiip-notes");
    if (saved) {
      try {
        return JSON.parse(saved);
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

  const [selectedNoteId, setSelectedNoteId] = useState(notes[0]?.id || null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDexterOpen, setIsDexterOpen] = useState(false);

  // Settings State with Persistence
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("fiip-settings");
    if (saved) {
        return JSON.parse(saved);
    }
    
    // Default logic based on OS
    let defaultStyle = 'macos';
    try {
        const osType = type();
        if (osType === 'windows' || osType === 'linux') {
            defaultStyle = 'windows';
        }
    } catch (e) {
        console.error("Failed to detect OS", e);
    }

    return { darkMode: true, largeText: false, windowEffect: 'mica', titlebarStyle: defaultStyle };
  });

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
    setNotes(notes.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
  };

  const handleDeleteNote = () => {
    if (!selectedNoteId) return;
    const newNotes = notes.filter((n) => n.id !== selectedNoteId);
    setNotes(newNotes);
    setSelectedNoteId(newNotes[0]?.id || null);
  };

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden text-gray-100 font-sans transition-colors duration-300 ${settings.largeText ? 'text-lg' : ''}`}>
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
        <Editor
          note={selectedNote}
          onUpdateNote={handleUpdateNote}
          settings={settings}
        />
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
