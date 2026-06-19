import { getCurrentWindow } from '@tauri-apps/api/window';
import { type } from '@tauri-apps/plugin-os';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUI } from '../providers/UIProvider';
import { keyAuthService } from '../services/keyauth';

// Icons Import (Pim's Edition)
import { authService, dataService } from '../services/supabase';

import IconTrash from '~icons/mingcute/delete-2-fill';
import IconLogout from '~icons/mingcute/exit-fill';
import IconShared from '~icons/mingcute/group-3-fill';
import IconHome from '~icons/mingcute/home-4-fill';
import IconPanelLeft from '~icons/mingcute/menu-fill';
import IconBot from '~icons/mingcute/robot-fill';
import IconSettings from '~icons/mingcute/settings-3-fill';
import IconStar from '~icons/mingcute/star-fill';
import IconUser from '~icons/mingcute/user-4-fill';

import { LiquidGlassPrimitive } from './ui/LiquidGlassPrimitive';

export default function Sidebar({ 
    onOpenSettings, 
    onToggleDexter, 
    onOpenAuth, 
    onOpenProfile,
    settings,
    activeNav = 'home',
    onNavigate
}) {
    const { t } = useTranslation();
    const { theme } = useUI();
    const appWindow = getCurrentWindow();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [localProfile, setLocalProfile] = useState(null);
    const [supabaseUser, setSupabaseUser] = useState(null);
    const osType = type();

    const getSafeUsername = () => {
        const candidates = [
            localProfile?.nickname,
            supabaseUser?.user_metadata?.nickname,
            supabaseUser?.user_metadata?.username,
            supabaseUser?.user_metadata?.full_name,
            keyAuthService.userData?.username
        ];

        for (const candidate of candidates) {
            if (candidate && typeof candidate === 'string' && !candidate.match(/^[A-Za-z0-9-]{20,}$/)) {
                return candidate;
            }
        }
        
        return t('sidebar.guest_user') || 'Utilisateur';
    };

    React.useEffect(() => {
        const loadProfile = () => {
            const saved = localStorage.getItem('fiip_public_profile');
            if (saved) {
                try {
                    setLocalProfile(JSON.parse(saved));
                } catch (e) { console.error(e); }
            }
        };
        loadProfile();
        window.addEventListener('storage', loadProfile);
        
        const fetchUser = async () => {
            try {
                const user = await authService.getUser();
                if (user) {
                    setSupabaseUser(user);
                    // Fetch real profile to get nickname instead of relying only on what was cached
                    const { data: profile } = await dataService.fetchProfile();
                    if (profile) {
                        setLocalProfile(profile);
                        localStorage.setItem('fiip_public_profile', JSON.stringify(profile));
                    }
                }
            } catch (e) {
                console.error('Failed to fetch supabase user', e);
            }
        };
        fetchUser();

        return () => window.removeEventListener('storage', loadProfile);
    }, []);

    const navItems = [
        { id: 'home', icon: IconHome, label: t('sidebar.all_notes') },
        { id: 'favorites', icon: IconStar, label: t('sidebar.favorites') },
        { id: 'shared', icon: IconShared, label: t('sidebar.shared') },
        { id: 'trash', icon: IconTrash, label: t('sidebar.trash') },
    ];

    return (
        <LiquidGlassPrimitive 
            className="h-full border-r border-white/10 flex flex-col transition-all duration-250 ease-in-out" 
            variant={theme === 'liquid-glass' ? 'default' : 'subtle'}
            style={{ 
                width: isCollapsed ? '72px' : '240px', 
                minWidth: isCollapsed ? '72px' : '240px',
                borderRadius: 0,
                background: theme === 'liquid-glass' ? undefined : '#1C1C1E'
            }}
        >
            {/* Header : User Profile & Traffic Lights */}
            <div className={`flex flex-col ${isCollapsed ? 'items-center px-0' : 'px-3'} pt-3 pb-2 select-none transition-all duration-250`}>
                
                {/* Traffic Lights Spacer for macOS native or 'none' layout */}
                {osType === 'macos' && (!settings?.titlebarStyle || settings.titlebarStyle === 'none' || settings.titlebarStyle === 'native') && (
                     <div className="w-[60px] h-8 mb-2" data-tauri-drag-region />
                )}

                {osType !== 'macos' && (!settings?.titlebarStyle || settings.titlebarStyle === 'none') && (
                    <div className={`flex gap-2 mb-4 ${isCollapsed ? 'flex-col items-center gap-2 mb-2' : 'px-1'}`}>
                        <button onClick={() => appWindow.close()} className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF4A42] border border-black/10 transition-colors duration-150 ease-out" />
                        <button onClick={() => appWindow.minimize()} className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEAE1C] border border-black/10 transition-colors duration-150 ease-out" />
                        <button onClick={() => appWindow.toggleMaximize()} className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#1EB332] border border-black/10 transition-colors duration-150 ease-out" />
                    </div>
                )}

                <div className={`flex items-center justify-between ${isCollapsed ? 'flex-col gap-2' : 'flex-row'} w-full`}>
                    {/* Profile */}
                    <button 
                        onClick={keyAuthService.isAuthenticated ? onOpenProfile : onOpenAuth} 
                        className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10 p-0' : 'gap-3 p-2 w-full text-left'} rounded-lg hover:bg-white/5 transition-all duration-150 ease-out group`}
                        title={isCollapsed ? (keyAuthService.isAuthenticated ? getSafeUsername() : 'Guest') : ''}
                    >
                        <div className="relative shrink-0">
                            {keyAuthService.isAuthenticated ? (
                                <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 p-0.5 shadow-sm group-hover:shadow-blue-500/20 transition-all duration-250">
                                      {localProfile?.avatar || localProfile?.avatar_url || supabaseUser?.user_metadata?.avatar_url || settings?.avatarUrl ? (
                                          <img src={localProfile?.avatar || localProfile?.avatar_url || supabaseUser?.user_metadata?.avatar_url || settings?.avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                     ) : (
                                        <div className="w-full h-full rounded-full bg-[#2C2C2E] flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                            {(getSafeUsername() || 'U').substring(0, 2)}
                                        </div>
                                     )}
                                 </div>
                             ) : (
                                 <div className="w-8 h-8 rounded-full bg-[#2C2C2E] flex items-center justify-center border border-white/5">
                                     <IconUser className="w-5 h-5 text-gray-400" />
                                 </div>
                             )}
                             <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar-dark transition-opacity ${keyAuthService.isAuthenticated ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                        </div>
                        
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 transition-opacity duration-200">
                                <div className="text-[13px] font-semibold text-white leading-tight truncate">
                                    {keyAuthService.isAuthenticated ? getSafeUsername() : 'Guest'}
                                </div>
                                <div className="text-[11px] text-gray-400 truncate">
                                     {keyAuthService.isAuthenticated ? (keyAuthService.getCurrentSubscriptionName() || 'Member') : 'Not connected'}
                                </div>
                            </div>
                        )}
                    </button>

                    {/* Collapse Button */}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`p-2 hover:bg-white/5 text-white/50 hover:text-white rounded-lg transition-all duration-250 ease-out shrink-0 ${isCollapsed ? 'mt-2' : ''}`}
                        title={isCollapsed ? t('sidebar.expand') || "Agrandir la barre latérale" : t('sidebar.collapse') || "Réduire la barre latérale"}
                    >
                        <IconPanelLeft className={`w-4 h-4 transition-transform duration-250 ${isCollapsed ? 'rotate-180 text-blue-400 bg-blue-500/10 rounded p-0.5 w-5 h-5' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-4 overflow-y-auto overflow-x-hidden space-y-4`}>
                {/* Section Group */}
                <div className="space-y-1">
                    {!isCollapsed && (
                        <div className="h-6 px-3 py-1 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center select-none whitespace-nowrap">
                            Main
                        </div>
                    )}
                    
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate && onNavigate(item.id)}
                            title={isCollapsed ? item.label : ''}
                            className={`
                                w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-1.5 rounded-xl text-[13px] font-semibold transition-all duration-250 ease-out group
                                ${activeNav === item.id 
                                    ? (theme === 'liquid-glass' ? 'bg-blue-600 shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'bg-blue-600') + ' text-white' 
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'}
                            `}
                            style={{ height: '36px' }}
                        >
                            <item.icon className={`w-4 h-4 shrink-0 transition-transform duration-250 ${activeNav === item.id ? 'scale-110' : 'opacity-80 group-hover:scale-110'}`} />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </button>
                    ))}
                </div>

                {/* Section Tools */}
                <div className="space-y-1 pt-2">
                    {!isCollapsed && (
                        <div className="h-6 px-3 py-1 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center select-none whitespace-nowrap">
                            Intelligence
                        </div>
                    )}
                    
                    <button
                        onClick={onToggleDexter}
                        title={isCollapsed ? "Dexter AI" : ''}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-1.5 rounded-xl text-[13px] font-semibold text-white/60 hover:bg-white/5 hover:text-white transition-all duration-250 ease-out h-9 group`}
                    >
                        <IconBot className="w-4 h-4 opacity-80 shrink-0 group-hover:scale-110 transition-transform" />
                        {!isCollapsed && <span className="truncate">Dexter AI</span>}
                        {!isCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>}
                    </button>
                </div>
            </div>

            {/* Footer Actions */}
            <div className={`p-3 border-t border-white/5 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                <button
                    onClick={onOpenSettings}
                    title={isCollapsed ? (t('sidebar.settings') || "Settings") : ''}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-1.5 rounded-xl text-[13px] font-semibold text-white/60 hover:bg-white/5 hover:text-white transition-all duration-250 ease-out h-9 group`}
                >
                    <IconSettings className="w-4 h-4 opacity-80 shrink-0 group-hover:rotate-45 transition-transform" />
                    {!isCollapsed && <span className="truncate">{t('sidebar.settings') || "Settings"}</span>}
                </button>
                 {keyAuthService.isAuthenticated && (
                    <button
                        onClick={() => {
                            keyAuthService.logout();
                            window.location.reload();
                        }}
                        title={isCollapsed ? (t('sidebar.logout') || "Logout") : ''}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-1.5 rounded-xl text-[13px] font-semibold text-red-400 hover:bg-red-500/10 transition-all duration-250 ease-out h-9 group`}
                    >
                        <IconLogout className="w-4 h-4 opacity-80 shrink-0 group-hover:translate-x-1 transition-transform" />
                        {!isCollapsed && <span className="truncate">{t('sidebar.logout') || "Logout"}</span>}
                    </button>
                )}
            </div>
        </LiquidGlassPrimitive>
    );
}