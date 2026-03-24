import { useState, useRef, useEffect } from 'react';
import IconPlay from '~icons/mingcute/play-fill';
import IconPause from '~icons/mingcute/pause-fill';
import IconEdit from '~icons/mingcute/edit-2-fill';
import IconCheck from '~icons/mingcute/check-fill';
import IconClose from '~icons/mingcute/close-fill';
import { useTranslation } from 'react-i18next';

export default function AudioPlayer({ src, name, onRename, onError }) {
    const { t } = useTranslation();
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(name || "");
    const [prevName, setPrevName] = useState(name);

    if (name !== prevName) {
        setPrevName(name);
        setTempName(name || "");
    }

    const audioRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        let isFixingDuration = false;

        const updateProgress = () => {
            if (isFixingDuration) return;
            if (audio.duration && isFinite(audio.duration)) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const updateDuration = () => {
            if (audio.duration && isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        const onLoadedMetadata = () => {
            if (audio.duration === Infinity) {
                isFixingDuration = true;
                audio.currentTime = 1e101;
                
                const onTimeUpdateTemp = () => {
                    audio.removeEventListener('timeupdate', onTimeUpdateTemp);
                    audio.currentTime = 0;
                    isFixingDuration = false;
                    if (isFinite(audio.duration)) {
                        setDuration(audio.duration);
                    }
                };
                audio.addEventListener('timeupdate', onTimeUpdateTemp);
            } else {
                setDuration(audio.duration);
            }
        };

        const onEnded = () => {
            if (isFixingDuration) return;
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
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
        setTempName(name || t('editor.voice_memo'));
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
        if (isNaN(time) || !isFinite(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full h-full flex flex-col justify-center p-4 bg-[#2B2D31] rounded-xl border border-[#1E1F22] shadow-sm transition-all hover:shadow-md hover:border-[#5865F2]/50 group">
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                    console.error("Audio Load Error in Player:", e);
                    if (onError) onError(e);
                }}
            />

            <div className="flex items-center gap-3 mb-2">
                <button
                    onClick={togglePlay}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 shrink-0"
                >
                    {isPlaying ? <IconPause className="w-4 h-4 fill-current" /> : <IconPlay className="w-4 h-4 fill-current ml-0.5" />}
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
                                className="w-full text-xs font-semibold bg-[#1E1F22] border border-[#5865F2] rounded px-1 py-0.5 text-white outline-none"
                            />
                            <div className="flex items-center gap-1">
                                <button onClick={saveRename} className="p-0.5 text-green-500 hover:bg-green-500/10 rounded"><IconCheck className="w-3 h-3" /></button>
                                <button onClick={cancelRename} className="p-0.5 text-red-500 hover:bg-red-500/10 rounded"><IconClose className="w-3 h-3" /></button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 mb-1 group/title">
                            <div
                                onDoubleClick={startEditing}
                                className="text-xs font-semibold text-[#F2F3F5] truncate cursor-text"
                                title={t('editor.double_click_rename')}
                            >
                                {name || t('editor.voice_memo')}
                            </div>
                            <button
                                onClick={startEditing}
                                className="opacity-0 group-hover/title:opacity-100 text-[#949BA4] hover:text-[#DBDEE1] transition-opacity"
                            >
                                <IconEdit className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-[#949BA4] font-mono">
                        <span>{formatTime((progress / 100) * duration)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            </div>

            <div className="relative w-full h-1 bg-[#1E1F22] rounded-full overflow-hidden group-hover:h-1.5 transition-all">
                <div
                    className="absolute top-0 left-0 h-full bg-[#5865F2] rounded-full transition-all duration-100"
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