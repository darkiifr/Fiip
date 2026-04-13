import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';
import { useTranslation } from 'react-i18next';
import { type } from '@tauri-apps/plugin-os';

export default function Titlebar({ style = 'macos' }) {
    let appWindow; try { appWindow = getCurrentWindow(); } catch (e) { console.warn("Tauri API not available", e); }
    const { t } = useTranslation();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const osType = type();

    useEffect(() => {
        let unlisten;
        const checkFullscreen = async () => {
            const isFull = await appWindow.isFullscreen();
            setIsFullscreen(isFull);
        };
        checkFullscreen();

        appWindow.onResized(() => {
            checkFullscreen();
        }).then(u => unlisten = u);

        return () => {
            if (unlisten) unlisten();
        };
    }, [appWindow]);

    const actualStyle = style === 'native' ? (osType === 'macos' ? 'macos' : 'windows') : style;

    if (actualStyle === 'none') return null;

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
        if (actualStyle === 'macos') {
            const isFull = await appWindow.isFullscreen();
            if (isFull) {
                await appWindow.setFullscreen(false);
            } else {
                await appWindow.setFullscreen(true);
            }
        } else {
            await appWindow.toggleMaximize();
        }
    };

    // macOS style: rounded buttons on the left
    if (actualStyle === 'macos') {
        if (isFullscreen) return null;

        return (
            <div
                className="h-[52px] w-full bg-[#1e1e1e]/80 backdrop-blur-md border-b border-white/10 flex items-center select-none transition-colors duration-300"
            >
                {/* Left Drag Region (Padding) */}
                <div className="w-[12px] h-full" data-tauri-drag-region />

                <div className="flex gap-2 z-10 hover:*:brightness-110">
                    <button
                        onClick={handleClose}
                        className="window-btn w-3.5 h-3.5 rounded-full bg-[#FF5F57] border border-black/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                        title={t('settings.close')}
                    />
                    <button
                        onClick={handleMinimize}
                        className="window-btn w-3.5 h-3.5 rounded-full bg-[#FEBC2E] border border-black/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                        title={t('settings.minimize')}
                    />
                    <button
                        onClick={handleMaximize}
                        className="window-btn w-3.5 h-3.5 rounded-full bg-[#28C840] border border-black/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                        title={t('settings.maximize')}
                    />
                </div>

                <div className="flex-1 h-full flex items-center" data-tauri-drag-region />

                {/* Title */}
                <div className="text-sm font-medium text-gray-300 pr-[16px] h-full flex items-center pointer-events-none">Fiip</div>
            </div>
        );
    }

    // Windows style: flat buttons on the right
    if (actualStyle === 'windows') {
        if (isFullscreen) return null;

        return (
            <div
                className="h-8 w-full bg-[#1e1e1e]/80 backdrop-blur-md border-b border-white/10 flex items-center select-none transition-colors duration-300"
            >
                <div className="flex-1 px-4 h-full flex items-center" data-tauri-drag-region>
                    <div className="text-[12px] font-medium text-gray-400 pointer-events-none">Fiip</div>
                </div>
                <div className="flex h-full">
                    <button
                        onClick={handleMinimize}
                        className="window-btn w-12 h-full hover:bg-white/10 flex items-center justify-center transition-none"
                        title={t('settings.minimize')}
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="0" y="4.5" width="10" height="1" fill="#A1A1AA" />
                        </svg>
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="window-btn w-12 h-full hover:bg-white/10 flex items-center justify-center transition-none"
                        title={t('settings.maximize')}
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="0.5" y="0.5" width="9" height="9" stroke="#A1A1AA" />
                        </svg>
                    </button>
                    <button
                        onClick={handleClose}
                        className="window-btn w-12 h-full hover:bg-[#E81123] flex items-center justify-center transition-none group"
                        title={t('settings.close')}
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0.853553 0.146447L9.85355 9.14645C10.0488 9.34171 10.0488 9.65829 9.85355 9.85355C9.65829 10.0488 9.34171 10.0488 9.14645 9.85355L0.146447 0.853553C-0.0488155 0.658291 -0.0488155 0.341709 0.146447 0.146447C0.341709 -0.0488155 0.658291 -0.0488155 0.853553 0.146447Z" fill="#A1A1AA" className="group-hover:fill-white" />
                            <path d="M9.85355 0.146447L0.853553 9.14645C0.658291 9.34171 0.341709 9.34171 0.146447 9.14645C-0.0488155 8.95118 -0.0488155 8.6346 0.146447 8.43934L9.14645 -0.56066C9.34171 -0.755923 9.65829 -0.755923 9.85355 -0.56066C10.0488 -0.365398 10.0488 -0.0488155 9.85355 0.146447Z" fill="#A1A1AA" className="group-hover:fill-white" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
