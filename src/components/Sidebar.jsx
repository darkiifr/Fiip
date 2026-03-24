import React, { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import { keyAuthService } from '../services/keyauth';

// Icons Import (Pim's Edition)
import IconHome from '~icons/mingcute/home-4-fill';
import IconStar from '~icons/mingcute/star-fill';
import IconShared from '~icons/mingcute/group-3-fill';
import IconTrash from '~icons/mingcute/delete-2-fill';
import IconSettings from '~icons/mingcute/settings-3-fill';
import IconBot from '~icons/mingcute/robot-fill';
import IconUser from '~icons/mingcute/user-4-fill';
import IconLogout from '~icons/mingcute/exit-fill';
import IconPanelLeft from '~icons/mingcute/menu-fill';

import { authService } from '../services/supabase';

export default function Sidebar({ 
    onOpenSettings, 
    onToggleDexter, 
    onOpenAuth, 
    settings,
    activeNav = 'home',
    onNavigate
}) {
    const { t } = useTranslation();
    const appWindow = getCurrentWindow();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [localProfile, setLocalProfile] = useState(null);
    const [supabaseUser, setSupabaseUser] = useState(null);

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
        { id: 'home', icon: IconHome, label: t('sidebar.all_notes') || "All Notes" },
        { id: 'favorites', icon: IconStar, label: t('sidebar.favorites') || "Favorites" },
        { id: 'shared', icon: IconShared, label: t('sidebar.shared') || "Shared" },
        { id: 'trash', icon: IconTrash, label: t('sidebar.trash') || "Trash" },
    ];

    return (
        <div 
            className="h-full bg-[#1C1C1E]/40 backdrop-blur-md border-r border-white/10 flex flex-col transition-all duration-[250ms] ease-in-out" 
            style={{ 
                width: isCollapsed ? '72px' : '240px', 
                minWidth: isCollapsed ? '72px' : '240px' 
            }}
        >
            {/* Header : User Profile & Traffic Lights */}
            <div className={`flex flex-col ${isCollapsed ? 'items-center px-0' : 'px-3'} pt-3 pb-2 select-none transition-all duration-250`}>
                {/* Traffic Lights (if integrated) */}
                {(!settings?.titlebarStyle || settings.titlebarStyle === 'none') && (
                    <div className={`flex gap-2 mb-4 ${isCollapsed ? 'flex-col items-center gap-2 mb-2' : 'px-1'}`}>
                        <button onClick={() => appWindow.close()} className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF4A42] border border-black/10 transition-colors duration-[150ms] ease-out" />
                        <button onClick={() => appWindow.minimize()} className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEAE1C] border border-black/10 transition-colors duration-[150ms] ease-out" />
                        <button onClick={() => appWindow.toggleMaximize()} className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#1EB332] border border-black/10 transition-colors duration-[150ms] ease-out" />
                    </div>
                )}

                {/* Profile */}
                <button 
                    onClick={onOpenAuth} 
                    className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10 p-0' : 'gap-3 p-2 w-full text-left'} rounded-lg hover:bg-white/5 transition-all duration-[150ms] ease-out group`}
                    title={isCollapsed ? (keyAuthService.isAuthenticated ? (supabaseUser?.user_metadata?.full_name || supabaseUser?.user_metadata?.name || localProfile?.nickname || keyAuthService.userData?.username) : 'Guest') : ''}
                >
                    <div className="relative shrink-0">
                        {keyAuthService.isAuthenticated && (keyAuthService.userData?.username || supabaseUser) ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 shadow-sm group-hover:shadow-blue-500/20 transition-all duration-[250ms]">
                                 {localProfile?.avatar || supabaseUser?.user_metadata?.avatar_url || settings?.avatarUrl ? (
                                     <img src={localProfile?.avatar || supabaseUser?.user_metadata?.avatar_url || settings?.avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full rounded-full bg-[#2C2C2E] flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                        {((supabaseUser?.user_metadata?.full_name || supabaseUser?.user_metadata?.name || localProfile?.nickname || keyAuthService.userData?.username) || 'U').substring(0, 2)}
                                    </div>
                                 )}
                             </div>
                         ) : (
                             <div className="w-8 h-8 rounded-full bg-[#2C2C2E] flex items-center justify-center border border-white/5">
                                 <IconUser className="w-5 h-5 text-gray-400" />
                             </div>
                         )}
                         <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1C1C1E] transition-opacity ${keyAuthService.isAuthenticated ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    </div>
                    
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0 transition-opacity duration-200">
                            <div className="text-[13px] font-semibold text-white leading-tight truncate">
                                {keyAuthService.isAuthenticated ? (supabaseUser?.user_metadata?.full_name || supabaseUser?.user_metadata?.name || localProfile?.nickname || keyAuthService.userData?.username) : 'Guest'}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate">
                                 {keyAuthService.isAuthenticated ? (keyAuthService.getCurrentSubscriptionName() || 'Member') : 'Not connected'}
                            </div>
                        </div>
                    )}
                </button>
            </div>

            {/* Navigation */}
            <div className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-4 overflow-y-auto overflow-x-hidden`}>
                {/* Section Header */}
                {!isCollapsed && (
                    <div className="h-[28px] px-[12px] py-[6px] text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center select-none mb-1 whitespace-nowrap">
                        Menu
                    </div>
                )}
                
                <div className="space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate && onNavigate(item.id)}
                            title={isCollapsed ? item.label : ''}
                            className={`
                                w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-[12px] px-3'} py-1.5 rounded-md text-[13px] font-medium transition-all duration-[150ms] ease-out
                                ${activeNav === item.id 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'}
                            `}
                            style={{ height: '32px' }}
                        >
                            <item.icon className="w-4 h-4 opacity-80 shrink-0" />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </button>
                    ))}
                </div>

                {/* Section Divider */}
                <div className={`mt-6 border-t border-white/10 ${isCollapsed ? 'mx-1' : 'mx-3'}`}></div>

                {!isCollapsed && (
                    <div className="h-[28px] px-[12px] py-[6px] text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center whitespace-nowrap">
                        Tools
                    </div>
                )}
                
                <button
                    onClick={onToggleDexter}
                    title={isCollapsed ? "Dexter AI" : ''}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-[12px] px-3'} py-1.5 rounded-md text-[13px] font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-[150ms] ease-out h-[32px] mt-1`}
                >
                    <IconBot className="w-4 h-4 opacity-80 shrink-0" />
                    {!isCollapsed && <span className="truncate">Dexter AI</span>}
                </button>
            </div>

            {/* Footer Actions */}
            <div className={`p-2 border-t border-white/10 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                <button
                    onClick={onOpenSettings}
                    title={isCollapsed ? (t('sidebar.settings') || "Settings") : ''}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-[12px] px-3'} py-1.5 rounded-md text-[13px] font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-[150ms] ease-out h-[32px]`}
                >
                    <IconSettings className="w-4 h-4 opacity-80 shrink-0" />
                    {!isCollapsed && <span className="truncate">{t('sidebar.settings') || "Settings"}</span>}
                </button>
                 {keyAuthService.isAuthenticated && (
                    <button
                        onClick={() => {
                            keyAuthService.logout();
                            window.location.reload();
                        }}
                        title={isCollapsed ? (t('sidebar.logout') || "Logout") : ''}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-[12px] px-3'} py-1.5 rounded-md text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-all duration-[150ms] ease-out h-[32px]`}
                    >
                        <IconLogout className="w-4 h-4 opacity-80 shrink-0" />
                        {!isCollapsed && <span className="truncate">{t('sidebar.logout') || "Logout"}</span>}
                    </button>
                )}
                
                {/* Toggle Collapse Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-end px-3'} py-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-[150ms] ease-out h-[32px] mt-1`}
                >
                    <IconPanelLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );
}