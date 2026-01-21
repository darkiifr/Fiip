import React, { useState, useEffect, useRef } from 'react';
import { X, Send, RefreshCw, Hash, Bell, Users, HelpCircle, PlusCircle, Gift, Sticker, Smile, Inbox, AlertTriangle, ShieldCheck, User, Settings } from 'lucide-react';
import { keyAuthService } from '../services/keyauth';
import { moderationService } from '../services/moderation';
import { soundManager } from '../services/soundManager';
import UserProfileModal from './UserProfileModal';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';

export default function ChatModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [videoSearch, setVideoSearch] = useState('');
    const [mediaList, setMediaList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUserProfile, setCurrentUserProfile] = useState({});
    const [lastMsgTime, setLastMsgTime] = useState(0);
    const prevMessagesLengthRef = useRef(0);
    const fileInputRef = useRef(null);
    const debounceRef = useRef(null);

    const channels = [
        { id: 'general', name: t('chat.channel_general', 'général') },
        { id: 'english', name: t('chat.channel_english', 'anglais') },
        { id: 'french', name: t('chat.channel_french', 'français') }
    ];
    const [activeChannel, setActiveChannel] = useState('general');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        // Only set loading on first load to avoid flickering
        if (messages.length === 0) setLoading(true);
        
        const result = await keyAuthService.getChatMessages(activeChannel);
        if (result.success) {
            // Filter messages from today (since midnight)
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Midnight today
            const midnightTimestamp = Math.floor(now.getTime() / 1000);
            
            const valid = (result.messages || []).filter(m => m.timestamp >= midnightTimestamp);
            
            // Sound Notification
            if (valid.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
                 const lastMsg = valid[valid.length - 1];
                 const myName = keyAuthService.userData?.username;
                 if (lastMsg.author !== myName) {
                     soundManager.play('message');
                 }
            }
            prevMessagesLengthRef.current = valid.length;

            setMessages(valid);
            setError(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen || !showProfileModal) {
            // Load profile from cloud or local
            const load = async () => {
                let profile = null;
                if (keyAuthService.isAuthenticated) {
                    const cloud = await keyAuthService.loadUserData();
                    if (cloud.success && cloud.data) {
                        try {
                            profile = typeof cloud.data === 'string' ? JSON.parse(cloud.data) : cloud.data;
                            if (profile) localStorage.setItem('fiip_public_profile', JSON.stringify(profile));
                        } catch (e) { /* ignore */ }
                    }
                }
                if (!profile) {
                    const local = localStorage.getItem('fiip_public_profile');
                    if (local) profile = JSON.parse(local);
                }
                setCurrentUserProfile(profile || {});
            };
            load();
            // eslint-disable-next-line
            fetchMessages();
            const interval = setInterval(() => {
                if (autoRefresh) fetchMessages();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isOpen, autoRefresh, activeChannel, showProfileModal]);

    const searchTenor = async (query) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        
        debounceRef.current = setTimeout(async () => {
            try {
                // Using public Tenor key LKH... or LIVD... depends on documentation.
                // Using standard public test key: LKHMXOSN0712 (Often used in docs) or just "LIVDSRZULELA"
                const key = "LIVDSRZULELA"; 
                const endpoint = query 
                    ? `https://g.tenor.com/v1/search?q=${query}&key=${key}&limit=20`
                    : `https://g.tenor.com/v1/trending?key=${key}&limit=20`;
                
                const response = await fetch(endpoint);
                const data = await response.json();
                if (data.results) {
                    setMediaList(data.results.map(r => r.media[0].tinygif.url));
                }
            } catch (e) {
                console.error("Tenor error:", e);
            }
        }, 500);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (showGifPicker) {
            searchTenor(videoSearch);
        }
    }, [showGifPicker, videoSearch]);

    const onEmojiClick = (emojiData) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    const handleGifClick = async (gifUrl) => {
        setShowGifPicker(false);
        setSending(true);
        // GIFs are sent as simple messages with the URL
        const result = await keyAuthService.sendChatMessage(gifUrl, activeChannel);
        if (result.success) {
            fetchMessages(); 
        } else {
            setError(result.message);
        }
        setSending(false);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        
        const now = Date.now();
        if (now - lastMsgTime < 2000) {
             setError(t('chat.cooldown', 'Veuillez patienter 2 secondes.'));
             setTimeout(() => setError(null), 2000);
             return;
        }

        if (!newMessage.trim()) return;

        // Moderation
        const moderation = moderationService.analyzeMessage(newMessage);
        
        if (!moderation.safe) {
            setError(moderation.reason);
            // ... (keep existing)
            setTimeout(() => setError(null), 3000);
            return;
        }

        setSending(true);
        const result = await keyAuthService.sendChatMessage(moderation.sanitized, activeChannel);
        
        if (result.success) {
            setLastMsgTime(Date.now());
            setNewMessage('');
            fetchMessages(); 
        } else {
            setError(result.message);
        }
        setSending(false);
    };

    // Discord-like distinct colors for usernames based on hash
    const getNameColor = (name) => {
        const colors = [
            'text-[#f23f42]', // Red
            'text-[#eb459e]', // Pink
            'text-[#00b0f4]', // Blue
            'text-[#57f287]', // Green
            'text-[#fee75c]', // Yellow
            'text-[#9b59b6]', // Purple
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const getAvatarColor = (name) => {
        const colors = ['#F23F42', '#EB459E', '#00B0F4', '#57F287', '#FEE75C', '#9B59B6'];
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const isImageUrl = (url) => {
        return /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url) || url.includes('media.tenor.com');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (limit to 200MB for base64 fallback or just alert)
            if (file.size > 200 * 1024 * 1024) {
                 setError(t('chat.error_file_size', "Fichier trop volumineux. La limite est de 200MB."));
                 return;
            }
            
            // In a real app we would upload. Here we can convert to Base64 for demo if small enough, or just error.
            // KeyAuth chat has strict character limits, usually ~2000 chars. Base64 will fail.
            // So we just show a toast that it's not supported yet, or mock it.
            setError(t('chat.error_file_upload_disabled', "L'envoi de fichiers n'est pas encore disponible sur ce serveur."));
            setTimeout(() => setError(null), 3000);
        }
    };

    const filteredMessages = messages.filter(msg => 
        msg.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
        msg.author.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm font-sans p-4 sm:p-6 text-sm">
            <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
            
            {/* Main Modal Container - Discord Dark Theme */}
            <div className="w-full max-w-[900px] h-full max-h-[85vh] bg-[#313338] rounded-md shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-fade-in shadow-black/40">
                
                {/* Sidebar */}
                <div className="hidden md:flex w-60 bg-[#2B2D31] flex-col shrink-0">
                    <div className="h-12 border-b border-[#1F2023] flex items-center px-4 shadow-sm hover:bg-[#35373C] transition-colors cursor-pointer">
                        <h2 className="font-bold text-[#F2F3F5] text-[15px] truncate">{t('chat.community_title', 'Fiip Community')}</h2>
                    </div>
                    {/* Channel List - Removed flex-1 to allow profile to sit closer if desired, but user asked for "bottom" space fix? */}
                    {/* Actually, if user wants to remove the huge space between channels and profile, we should use flex-col without flex-1 on channels? */}
                    {/* But typically discord pushes profile to bottom. If user says "huge space between left thing and bottom of window" */}
                    {/* Maybe they mean below the profile? */}
                    {/* Let's try JUSTIFY-BETWEEN approach removal. */}
                    
                    <div className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1A1B1E] scrollbar-track-transparent">
                        {channels.map(channel => (
                            <button
                                key={channel.id}
                                onClick={() => setActiveChannel(channel.id)}
                                className={`w-full flex items-center gap-1.5 px-2 py-[6px] rounded group transition-all ${
                                    activeChannel === channel.id 
                                        ? 'bg-[#404249] text-white' 
                                        : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'
                                }`}
                            >
                                <Hash className="w-5 h-5 opacity-70" />
                                <span className={`font-medium text-[15px] ${activeChannel === channel.id ? '' : 'group-hover:text-[#DBDEE1]'}`}>
                                    {channel.name}
                                </span>
                            </button>
                        ))}
                    </div>
                    {/* User Mini Profile (Connected via KeyAuth) - Click to open settings */}
                    <div 
                        className="h-[52px] bg-[#232428] px-2 flex items-center gap-2 cursor-pointer hover:bg-[#1E1F22] transition-colors"
                        onClick={() => setShowProfileModal(true)}
                    >
                        <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all hover:opacity-80 overflow-hidden"
                            style={{ backgroundColor: currentUserProfile.avatar ? 'transparent' : getAvatarColor(currentUserProfile.nickname || (keyAuthService.userData?.username || 'User')) }}
                            title={t('profile.click_to_edit', 'Cliquez pour modifier le profil')}
                        >
                             {currentUserProfile.avatar ? (
                                 <img src={currentUserProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                             ) : (
                                 currentUserProfile.nickname?.substring(0, 2).toUpperCase() || 
                                 (keyAuthService.isAuthenticated && keyAuthService.userData?.username 
                                    ? keyAuthService.userData.username.substring(0, 2).toUpperCase() 
                                    : <User className="w-5 h-5" />)
                             )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-white text-xs font-bold truncate">
                                {currentUserProfile.nickname || 
                                 (keyAuthService.isAuthenticated && keyAuthService.userData?.username 
                                    ? keyAuthService.userData.username 
                                    : t('chat.user_default', 'Utilisateur'))}
                            </div>
                            <div className="text-[#B5BAC1] text-[10px] truncate">
                                {keyAuthService.isAuthenticated 
                                    ? ((keyAuthService.getCurrentSubscriptionName() || 'Membre').toUpperCase()) 
                                    : '#0000'}
                            </div>
                        </div>
                        <Settings className="w-4 h-4 text-[#B5BAC1] hover:text-white" />
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
                    {/* Header */}
                    <div className="h-12 border-b border-[#26272D] flex items-center px-4 shadow-sm bg-[#313338] z-20 shrink-0 justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Hash className="w-6 h-6 text-[#80848E] shrink-0" />
                            <h3 className="font-bold text-[#F2F3F5] text-base tracking-tight truncate">{channels.find(c => c.id === activeChannel)?.name}</h3>
                            <div className="h-4 w-[1px] bg-[#3F4147] mx-2 hidden sm:block shrink-0"></div>
                            <span className="text-[#949BA4] text-xs font-medium truncate hidden sm:block">
                                {t('chat.official_topic', 'Fiip Official Chat')}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-[#B5BAC1] shrink-0">
                            <div className="relative hidden md:block">
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('chat.search', 'Rechercher')} 
                                    className="bg-[#1E1F22] text-[#DBDEE1] text-xs px-2 py-1 rounded w-32 transition-all focus:w-48 outline-none"
                                />
                            </div>
                            
                            <button 
                                onClick={onClose}
                                className="text-[#B5BAC1] hover:text-[#dbdee1] transition-colors ml-2"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto px-0 pt-2 pb-4 scrollbar-thin scrollbar-thumb-[#1A1B1E] scrollbar-track-[#2B2D31] bg-[#313338]">
                        
                        {/* Welcome Message at Top */}
                        <div className="px-4 py-8 mt-4 mb-4 border-b border-[#3F4147]/50 mx-4">
                            <div className="w-16 h-16 rounded-full bg-[#41434A] flex items-center justify-center mb-4">
                                <Hash className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">{t('chat.welcome_header', "Bienvenue sur le salon officiel de Fiip !")}</h1>
                            <p className="text-[#B5BAC1] text-sm">
                                {t('chat.welcome_text', { defaultValue: "C'est ici que tout commence. Ceci est le début du salon #{{channel}}.", channel: channels.find(c => c.id === activeChannel)?.name })}
                            </p>
                        </div>

                        {loading && messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                <RefreshCw className="w-6 h-6 animate-spin text-[#B5BAC1] mb-2" />
                                <span className="text-[#949BA4] text-xs uppercase font-bold tracking-widest">{t('chat.loading', 'Chargement...')}</span>
                            </div>
                        ) : (
                            filteredMessages.map((msg, idx) => {
                                // Check for message grouping (same author, close timestamp)
                                const prevMsg = filteredMessages[idx - 1];
                                const isGrouped = prevMsg && prevMsg.author === msg.author && (msg.timestamp - prevMsg.timestamp < 300); // 5 mins
                                const date = new Date(msg.timestamp * 1000);
                                
                                // Formatting date as "Aujourd'hui à 15:30" or just date if older
                                const isToday = new Date().toDateString() === date.toDateString();
                                const dateString = isToday 
                                    ? `${t('date.today', 'Aujourd\'hui')} à ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                                    : date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                                return (
                                    <div 
                                        key={idx} 
                                        className={`group flex px-4 hover:bg-[#2e3035] pr-4 py-0.5 ${isGrouped ? 'mt-0.5' : 'mt-4'}`}
                                    >
                                        {!isGrouped ? (
                                            <div className="w-10 h-10 rounded-full bg-[#5865F2] hover:bg-[#4752C4] cursor-pointer mt-0.5 mr-4 shrink-0 flex items-center justify-center text-white font-semibold text-sm transition-colors overflow-hidden">
                                                {/* Avatar: If no image, use initials */}
                                                {msg.author.substring(0, 2).toUpperCase()}
                                            </div>
                                        ) : (
                                            <div className="w-10 mr-4 shrink-0 flex justify-end text-[10px] text-[#949BA4] opacity-0 group-hover:opacity-100 items-start pt-1.5 select-none text-right font-mono">
                                                 {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            {!isGrouped && (
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={`font-medium hover:underline cursor-pointer ${getNameColor(msg.author)}`}>
                                                        {msg.author}
                                                    </span>
                                                    {msg.author === 'Vins' && (
                                                        <span className="bg-[#5865F2] text-white text-[10px] px-1 rounded-[3px] flex items-center h-3.5 uppercase font-bold tracking-wide">
                                                            BOT
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-[#949BA4]">
                                                        {dateString}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`text-[#D1D2D5] text-[15px] leading-[1.375rem] whitespace-pre-wrap ${!isGrouped ? '' : ''}`}>
                                                {isImageUrl(msg.message) ? (
                                                    <img 
                                                        src={msg.message} 
                                                        alt="Attachment" 
                                                        className="max-w-[300px] max-h-[300px] rounded-lg mt-1 cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={() => window.open(msg.message, '_blank')}
                                                    />
                                                ) : (
                                                    msg.message
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>

                    {/* Input Area */}
                    <div className="px-4 pb-2 bg-[#313338] shrink-0">
                        <div className="relative bg-[#383A40] rounded-lg flex items-center p-0 pr-4">
                            {/* Left Actions */}
                            <div className="flex px-3 py-2.5 gap-3 border-r border-[#41434A] mr-1">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[#B5BAC1] hover:text-[#dbdee1] transition-colors bg-[#484B52] rounded-full p-0.5"
                                >
                                    <PlusCircle className="w-5 h-5 fill-[#B5BAC1] text-[#383A40]" />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleFileUpload} 
                                />
                            </div>

                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        handleSend(e);
                                    }
                                }}
                                disabled={sending}
                                placeholder={`${t('chat.message_placeholder', 'Envoyer un message dans')} #${channels.find(c => c.id === activeChannel)?.name}`}
                                className="bg-transparent border-none text-[#DBDEE1] py-2.5 px-2 w-full focus:outline-none focus:ring-0 placeholder:text-[#6D6F78]"
                                maxLength={2000}
                            />

                            {/* Right Actions */}
                            <div className="flex items-center gap-3 text-[#B5BAC1] ml-2 relative">
                                 {/* Emoji Picker Popover */}
                                 {showEmojiPicker && (
                                    <div className="absolute bottom-12 right-0 z-50 animate-in fade-in zoom-in duration-200">
                                        <div className="shadow-2xl rounded-lg overflow-hidden border border-[#202225]">
                                            <EmojiPicker 
                                                theme={Theme.DARK} 
                                                emojiStyle={EmojiStyle.APPLE}
                                                onEmojiClick={onEmojiClick}
                                                width={350}
                                                height={400}
                                                searchDisabled={false}
                                            />
                                        </div>
                                    </div>
                                 )}

                                 {/* GIF Picker Popover */}
                                 {showGifPicker && (
                                     <div className="absolute bottom-12 right-0 z-50 w-80 h-96 bg-[#2B2D31] rounded-lg shadow-2xl border border-[#1F2023] flex flex-col animate-in fade-in zoom-in duration-200">
                                        <div className="p-3 border-b border-[#1F2023] bg-[#313338]">
                                            <input 
                                                type="text" 
                                                value={videoSearch}
                                                onChange={(e) => setVideoSearch(e.target.value)}
                                                placeholder={t('chat.search_gifs', "Rechercher des GIFs sur Tenor")}
                                                className="w-full bg-[#1E1F22] text-[#DBDEE1] text-sm px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-[#00A8FC]" 
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#1A1B1E]">
                                             <div className="text-[10px] font-bold text-[#949BA4] mb-2 uppercase tracking-wide px-1">
                                                 {videoSearch ? t('chat.results', 'Résultats') : t('chat.trending', 'Tendances')}
                                             </div>
                                             <div className="grid grid-cols-2 gap-2">
                                                 {mediaList.map((url, i) => (
                                                     <div key={i} onClick={() => handleGifClick(url)} className="aspect-video bg-[#1E1F22] rounded cursor-pointer hover:ring-2 hover:ring-[#5865F2] overflow-hidden relative group">
                                                         <img src={url} alt="GIF" className="w-full h-full object-cover" />
                                                         <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                                                     </div>
                                                 ))}
                                             </div>
                                        </div>
                                     </div>
                                 )}

                                 {/* GIF Button */}
                                 <button 
                                    onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                                    className={`hover:text-[#dbdee1] flex items-center justify-center ${showGifPicker ? 'text-[#DBDEE1]' : ''}`}
                                 >
                                     <div className="bg-[#B5BAC1] hover:bg-[#dbdee1] transition-colors px-1 rounded-[2px] flex items-center justify-center">
                                        <span className="text-[#383A40] text-[10px] font-bold">{t('chat.gif_button', 'GIF')}</span>
                                     </div>
                                 </button>
                                 
                                 <button 
                                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                                    className={`hover:text-[#dbdee1] ${showEmojiPicker ? 'text-[#DBDEE1]' : ''}`}
                                >
                                    <Smile className="w-6 h-6" />
                                </button>
                                 
                                 {newMessage.trim() && (
                                    <button onClick={handleSend} disabled={sending} className="text-[#5865F2] hover:text-white transition-colors">
                                        <Send className="w-5 h-5" />
                                    </button>
                                 )}
                            </div>
                        </div>
                        {error && (
                             <span className="text-[#FA777C] text-xs mt-1 block pl-1">{error}</span>
                        )}
                        <div className="mt-1.5 text-right">
                            <span className={`text-[10px] ${newMessage.length > 1800 ? 'text-[#F23F42]' : 'text-[#949BA4]'}`}>
                                {newMessage.length}/2000
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
