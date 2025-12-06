import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import SettingsModal from "./components/SettingsModal";
import Dexter from "./components/Dexter";
import Titlebar from "./components/Titlebar";
import "./App.css";

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
    return saved ? JSON.parse(saved) : { darkMode: false, largeText: false, windowEffect: 'mica', titlebarStyle: 'none' };
  });

  // Persist Notes
  useEffect(() => {
    localStorage.setItem("fiip-notes", JSON.stringify(notes));
  }, [notes]);

  // Handle Theme & Settings Persistence
  useEffect(() => {
    localStorage.setItem("fiip-settings", JSON.stringify(settings));

    // Apply Dark Mode
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply Font Size
    if (settings.largeText) {
      document.documentElement.classList.add('text-lg');
    } else {
      document.documentElement.classList.remove('text-lg');
    }

    // Apply Window Effect
    invoke('set_window_effect', { effect: settings.windowEffect || 'none' })
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

  // Determine background class based on settings
  const getBackgroundClass = () => {
    if (settings.windowEffect && settings.windowEffect !== 'none') {
      return 'bg-transparent'; // Let Mica/Acrylic show through
    }
    return 'bg-white dark:bg-[#1e1e1e]'; // Opaque background
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden text-gray-900 font-sans transition-colors duration-300 ${settings.largeText ? 'text-lg' : ''} ${getBackgroundClass()}`}>
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
