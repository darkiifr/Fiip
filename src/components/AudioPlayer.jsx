import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Pencil, Check, X } from 'lucide-react';

export default function AudioPlayer({ src, name, onRename }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(name || "");
    const audioRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        setTempName(name || "");
    }, [name]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const updateDuration = () => {
            setDuration(audio.duration);
        };

        const onEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (e) => {
        const val = parseFloat(e.target.value);
        if (audioRef.current && duration) {
            audioRef.current.currentTime = (val / 100) * duration;
            setProgress(val);
        }
    };

    const startEditing = () => {
        setTempName(name || "Mémo Vocal");
        setIsEditing(true);
    };

    const saveRename = () => {
        if (tempName.trim()) {
            onRename?.(tempName.trim());
        }
        setIsEditing(false);
    };

    const cancelRename = () => {
        setTempName(name || "");
        setIsEditing(false);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full h-full flex flex-col justify-center p-4 bg-white dark:bg-[#27272a] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm transition-all hover:shadow-md hover:border-blue-500/20 group">
            <audio ref={audioRef} src={src} preload="metadata" />

            <div className="flex items-center gap-3 mb-2">
                <button
                    onClick={togglePlay}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 shrink-0"
                >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                ref={inputRef}
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveRename();
                                    if (e.key === 'Escape') cancelRename();
                                }}
                                className="w-full text-xs font-semibold bg-gray-100 dark:bg-black/20 border border-blue-500 rounded px-1 py-0.5 text-gray-900 dark:text-gray-100 outline-none"
                            />
                            <button onClick={saveRename} className="p-0.5 text-green-500 hover:bg-green-500/10 rounded"><Check className="w-3 h-3" /></button>
                            <button onClick={cancelRename} className="p-0.5 text-red-500 hover:bg-red-500/10 rounded"><X className="w-3 h-3" /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 mb-1 group/title">
                            <div
                                onDoubleClick={startEditing}
                                className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate cursor-text"
                                title="Double-clic pour renommer"
                            >
                                {name || "Mémo Vocal"}
                            </div>
                            <button
                                onClick={startEditing}
                                className="opacity-0 group-hover/title:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        <span>{formatTime(audioRef.current?.currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            </div>

            <div className="relative w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden group-hover:h-1.5 transition-all">
                <div
                    className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress || 0}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
        </div>
    );
}
