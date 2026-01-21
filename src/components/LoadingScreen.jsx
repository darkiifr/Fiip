import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen({ status }) {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1C1C1E] text-white font-sora select-none animate-fade-in">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
            </div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-2">
                Fiip
            </h2>
            <div className="h-1 w-48 bg-gray-800 rounded-full overflow-hidden mb-3 relative">
                <div className="absolute top-0 left-0 h-full bg-blue-500 w-1/3 animate-loading-bar rounded-full"></div>
            </div>
            <p className="text-xs text-gray-500 font-medium tracking-wide animate-pulse">{status}</p>
        </div>
    );
}
