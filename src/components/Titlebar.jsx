import React from 'react';
import { X, Minus, Square } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';

export default function Titlebar({ style = 'macos' }) {
    const appWindow = getCurrentWindow();

    if (style === 'none') return null;

    const handleClose = async (e) => {
        e.stopPropagation();
        await exit(0);
    };

    const handleMinimize = async (e) => {
        e.stopPropagation();
        await appWindow.minimize();
    };

    const handleMaximize = async (e) => {
        e.stopPropagation();
        await appWindow.toggleMaximize();
    };

    // macOS style: rounded buttons on the left
    if (style === 'macos') {
        return (
            <div
                className="h-8 w-full bg-[#1e1e1e]/80 backdrop-blur-md border-b border-white/10 flex items-center select-none transition-colors duration-300"
            >
                {/* Left Drag Region (Padding) */}
                <div className="w-4 h-full" data-tauri-drag-region />

                <div className="flex gap-2.5 z-10">
                    <button
                        onClick={handleClose}
                        className="w-3.5 h-3.5 rounded-full bg-[#FF5F57] hover:bg-[#FF4A42] border border-black/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                        title="Close"
                    />
                    <button
                        onClick={handleMinimize}
                        className="w-3.5 h-3.5 rounded-full bg-[#FEBC2E] hover:bg-[#FEAE1C] border border-black/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                        title="Minimize"
                    />
                    <button
                        onClick={handleMaximize}
                        className="w-3.5 h-3.5 rounded-full bg-[#28C840] hover:bg-[#1EB332] border border-black/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                        title="Maximize"
                    />
                </div>
                
                {/* Middle Drag Region */}
                <div className="flex-1 h-full" data-tauri-drag-region />
                
                {/* Title Drag Region (with Right Padding) */}
                <div className="text-sm font-medium text-gray-300 pr-4 h-full flex items-center" data-tauri-drag-region>Fiip</div>
            </div>
        );
    }

    // Windows style: flat buttons on the right
    if (style === 'windows') {
        return (
            <div
                className="h-8 w-full bg-[#1e1e1e]/80 backdrop-blur-md border-b border-white/10 flex items-center select-none transition-colors duration-300"
            >
                <div className="flex-1 px-4 h-full flex items-center" data-tauri-drag-region>
                    <div className="text-sm font-medium text-gray-300">Fiip</div>
                </div>
                <div className="flex h-full">
                    <button
                        onClick={handleMinimize}
                        className="w-12 h-full hover:bg-white/10 flex items-center justify-center transition-colors"
                        title="Minimize"
                    >
                        <Minus className="w-4 h-4 text-gray-300" />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="w-12 h-full hover:bg-white/10 flex items-center justify-center transition-colors"
                        title="Maximize"
                    >
                        <Square className="w-3.5 h-3.5 text-gray-300" />
                    </button>
                    <button
                        onClick={handleClose}
                        className="w-12 h-full hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4 text-gray-300 group-hover:text-white" />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
