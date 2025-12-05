import React, { useState } from 'react';
import { Search, Plus, Trash2, Settings } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function Sidebar({ notes, onSelectNote, selectedNoteId, onCreateNote, onDeleteNote, onOpenSettings }) {
    const [searchTerm, setSearchTerm] = useState('');
    const appWindow = getCurrentWindow();

    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-80 h-full bg-sidebar/80 dark:bg-sidebar-dark/80 backdrop-blur-2xl border-r border-gray-200 dark:border-white/10 flex flex-col transition-colors duration-300">
            {/* Header : Window Controls & Search */}
            <div className="relative p-4 pt-4 flex flex-col gap-4">
                {/* Background Drag Region */}
                <div className="absolute inset-0 z-0" data-tauri-drag-region />

                {/* Traffic Lights - Z-Index Higher so clickable */}
                <div className="relative z-10 flex gap-2 group mb-1 pl-1">
                    <button onClick={() => appWindow.close()} className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF4A42] border border-black/10 flex items-center justify-center text-[8px] transition-all active:scale-95 shadow-sm"></button>
                    <button onClick={() => appWindow.minimize()} className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEAE1C] border border-black/10 flex items-center justify-center text-[8px] transition-all active:scale-95 shadow-sm"></button>
                    <button onClick={() => appWindow.toggleMaximize()} className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#1EB332] border border-black/10 flex items-center justify-center text-[8px] transition-all active:scale-95 shadow-sm"></button>
                </div>

                <div className="relative z-10 flex-1 group">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors duration-200" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-[#2C2C2E] border border-transparent focus:border-blue-500/50 pl-9 pr-3 py-1.5 rounded-md text-sm outline-none shadow-sm transition-all duration-200 font-medium placeholder-gray-500 text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>

            {/* Note List */}
            <div className="flex-1 overflow-y-auto px-3 space-y-2 py-2">
                {filteredNotes.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-10 text-sm font-medium">No notes found</div>
                ) : (
                    filteredNotes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => onSelectNote(note.id)}
                            className={`
                group p-3 rounded-lg cursor-pointer transition-all duration-200 ease-out
                flex flex-col gap-1 border border-transparent
                ${selectedNoteId === note.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'hover:bg-white dark:hover:bg-white/10 text-gray-900 dark:text-white dark:border-white/5 bg-transparent'}
              `}
                        >
                            <h3 className={`font-bold text-[15px] truncate transition-colors ${selectedNoteId === note.id ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {note.title || 'Nouvelle note'}
                            </h3>
                            <div className="flex justify-between items-baseline opacity-95">
                                <span className={`text-xs truncate max-w-[70%] font-medium transition-colors ${selectedNoteId === note.id ? 'text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {note.content?.slice(0, 40) || 'Pas de contenu...'}
                                </span>
                                <span className={`text-[11px] whitespace-nowrap font-medium ${selectedNoteId === note.id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50/80 dark:bg-black/40 backdrop-blur-md">
                <button
                    onClick={onOpenSettings}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 rounded-md hover:bg-gray-200/50 dark:hover:bg-white/10 active:scale-95"
                    title="Settings"
                >
                    <Settings className="w-4 h-4" />
                </button>

                <button
                    onClick={onDeleteNote}
                    className="p-2 text-gray-500 hover:text-red-600 transition-all duration-200 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 group"
                    title="Delete Note"
                >
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>

                <button
                    onClick={onCreateNote}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-all duration-200 rounded-md hover:bg-blue-100/50 dark:hover:bg-blue-900/30 active:scale-95"
                    title="New note"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
