import { getCurrentWindow } from '@tauri-apps/api/window';
import { type } from '@tauri-apps/plugin-os';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useUI } from '../providers/UIProvider';
import { LiquidGlassPrimitive } from './ui/LiquidGlassPrimitive';

export default function Titlebar({ style = 'macos' }) {
    const { theme } = useUI();
    const isTauri = Boolean(window.__TAURI_INTERNALS__);
    const appWindow = useMemo(() => {
        if (!isTauri) {
            return null;
        }
        try {
            return getCurrentWindow();
        } catch (e) {
            console.warn("Tauri API not available", e);
            return null;
        }
    }, [isTauri]);
    const { t } = useTranslation();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [osType, setOsType] = useState('unknown');

    useEffect(() => {
        if (!isTauri) {
            return undefined;
        }
        try {
            setOsType(type());
        } catch (error) {
            console.warn('OS type unavailable:', error);
        }
        return undefined;
    }, [isTauri]);

    useEffect(() => {
        if (!appWindow) {
            return undefined;
        }
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
            if (unlisten) {unlisten();}
        };
    }, [appWindow]);

    const actualStyle = style === 'native' ? (osType === 'macos' ? 'macos' : 'windows') : style;

    if (actualStyle === 'none') {return null;}

    const runWindowAction = async (action) => {
        try {
            await action();
        } catch (error) {
            console.warn('Window control action failed:', error);
        }
    };

    const handleClose = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!appWindow) {
            return;
        }
        await runWindowAction(() => appWindow.close());
    };

    const handleMinimize = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!appWindow) {
            return;
        }
        await runWindowAction(() => appWindow.minimize());
    };

    const handleMaximize = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!appWindow) {
            return;
        }
        await runWindowAction(async () => {
            await appWindow.toggleMaximize();
        });
    };

    // macOS style: rounded buttons on the left
    if (actualStyle === 'macos') {
        if (isFullscreen) {return null;}

        return (
            <LiquidGlassPrimitive
                className="h-8 w-full border-b border-white/20 flex items-center select-none transition-all duration-300 backdrop-blur-3xl saturate-200"
                variant={theme === 'liquid-glass' ? 'default' : 'subtle'}
                style={{ 
                    borderRadius: 0,
                    background: theme === 'liquid-glass' ? undefined : 'rgba(28, 28, 30, 0.4)'
                }}
            >
                <div className="w-3 h-full" data-tauri-drag-region />

                <div className="flex gap-1.5 z-10 hover:*:brightness-110 titlebar-no-drag">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="window-btn titlebar-no-drag w-3 h-3 rounded-full bg-[#FF5F57] border border-black/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                        title={t('settings.close')}
                        aria-label={t('settings.close')}
                    />
                    <button
                        type="button"
                        onClick={handleMinimize}
                        className="window-btn titlebar-no-drag w-3 h-3 rounded-full bg-[#FEBC2E] border border-black/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                        title={t('settings.minimize')}
                        aria-label={t('settings.minimize')}
                    />
                    <button
                        type="button"
                        onClick={handleMaximize}
                        className="window-btn titlebar-no-drag w-3 h-3 rounded-full bg-[#28C840] border border-black/10 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                        title={t('settings.maximize')}
                        aria-label={t('settings.maximize')}
                    />
                </div>

                {/* Title */}
                <div className="absolute left-20 right-20 top-0 bottom-0 text-[11px] font-semibold text-white/35 tracking-[0.05em] uppercase flex items-center justify-center pointer-events-auto" data-tauri-drag-region>
                    Fiip
                </div>
                <div className="flex-1 h-full" data-tauri-drag-region />
            </LiquidGlassPrimitive>
        );
    }

    // Windows style: flat buttons on the right
    if (actualStyle === 'windows') {
        if (isFullscreen) {return null;}

        return (
            <LiquidGlassPrimitive
                className="h-8 w-full border-b border-white/10 flex items-center select-none transition-all duration-300"
                variant={theme === 'liquid-glass' ? 'default' : 'subtle'}
                style={{ 
                    borderRadius: 0,
                    background: theme === 'liquid-glass' ? undefined : '#1e1e1eCC'
                }}
            >
                <div className="flex-1 px-4 h-full flex items-center" data-tauri-drag-region>
                    <div className="text-[12px] font-medium text-gray-400 pointer-events-none">Fiip</div>
                </div>
                <div className="flex h-full">
                    <button
                        type="button"
                        onClick={handleMinimize}
                        className="window-btn titlebar-no-drag w-12 h-full hover:bg-white/10 flex items-center justify-center transition-none"
                        title={t('settings.minimize')}
                        aria-label={t('settings.minimize')}
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="0" y="4.5" width="10" height="1" fill="#A1A1AA" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={handleMaximize}
                        className="window-btn titlebar-no-drag w-12 h-full hover:bg-white/10 flex items-center justify-center transition-none"
                        title={t('settings.maximize')}
                        aria-label={t('settings.maximize')}
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="0.5" y="0.5" width="9" height="9" stroke="#A1A1AA" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="window-btn titlebar-no-drag w-12 h-full hover:bg-[#E81123] flex items-center justify-center transition-none group"
                        title={t('settings.close')}
                        aria-label={t('settings.close')}
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0.853553 0.146447L9.85355 9.14645C10.0488 9.34171 10.0488 9.65829 9.85355 9.85355C9.65829 10.0488 9.34171 10.0488 9.14645 9.85355L0.146447 0.853553C-0.0488155 0.658291 -0.0488155 0.341709 0.146447 0.146447C0.341709 -0.0488155 0.658291 -0.0488155 0.853553 0.146447Z" fill="#A1A1AA" className="group-hover:fill-white" />
                            <path d="M9.85355 0.146447L0.853553 9.14645C0.658291 9.34171 0.341709 9.34171 0.146447 9.14645C-0.0488155 8.95118 -0.0488155 8.6346 0.146447 8.43934L9.14645 -0.56066C9.34171 -0.755923 9.65829 -0.755923 9.85355 -0.56066C10.0488 -0.365398 10.0488 -0.0488155 9.85355 0.146447Z" fill="#A1A1AA" className="group-hover:fill-white" />
                        </svg>
                    </button>
                </div>
            </LiquidGlassPrimitive>
        );
    }

    return null;
}
