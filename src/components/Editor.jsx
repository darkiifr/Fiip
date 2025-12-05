import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateText } from '../services/ai';

export default function Editor({ note, onUpdateNote, settings }) {
    const [isGenerating, setIsGenerating] = useState(false);

    if (!note) {
        return (
            <div className="flex-1 h-full flex items-center justify-center text-gray-400 bg-white/50 dark:bg-[#1e1e1e]/90 backdrop-blur-sm transition-all duration-300">
                <p className="animate-pulse font-medium">Sélectionnez ou créez une note</p>
            </div>
        );
    }

    const handleTitleChange = (e) => {
        onUpdateNote({ ...note, title: e.target.value, updatedAt: Date.now() });
    };

    const handleContentChange = (e) => {
        onUpdateNote({ ...note, content: e.target.value, updatedAt: Date.now() });
    };

    const handleAiGenerate = async () => {
        if (!settings?.aiApiKey) {
            alert("Veuillez configurer votre clé API OpenRouter dans les paramètres.");
            return;
        }

        setIsGenerating(true);
        try {
            // Prompt simple : Continue ou Améliore
            const prompt = note.content
                ? "Continue ce texte ou améliore-le si c'est une ébauche : " + note.content.slice(-500)
                : "Écris une courte note sur un sujet intéressant.";

            const generated = await generateText({
                apiKey: settings.aiApiKey,
                model: settings.aiModel,
                prompt: prompt,
                context: note.title
            });

            // Append text
            const newContent = note.content ? note.content + "\n\n" + generated : generated;
            onUpdateNote({ ...note, content: newContent, updatedAt: Date.now() });
        } catch (error) {
            alert("Erreur AI : " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-white dark:bg-[#1e1e1e] relative transition-colors duration-300">
            <div className="pt-12 px-8 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-500 group relative">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mx-auto block text-center mb-4 transition-colors">
                    {new Date(note.updatedAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                </span>

                {/* AI Button - Visible on Hover or when generating */}
                <button
                    onClick={handleAiGenerate}
                    disabled={isGenerating}
                    className={`absolute right-8 top-12 p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-300 ${isGenerating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    title="Assistant AI (Compléter/Améliorer)"
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>

                <input
                    type="text"
                    value={note.title}
                    onChange={handleTitleChange}
                    placeholder="Titre de la note"
                    className="w-full text-3xl font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                />
            </div>
            <div className="flex-1 px-8 pb-8 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-75">
                <textarea
                    value={note.content}
                    onChange={handleContentChange}
                    placeholder="Commencez à écrire..."
                    className="w-full h-full resize-none bg-transparent outline-none text-lg leading-relaxed text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 font-sans transition-colors duration-200 selection:bg-blue-200 dark:selection:bg-blue-900"
                    style={{ minHeight: 'calc(100vh - 200px)' }}
                />
            </div>
        </div>
    );
}
