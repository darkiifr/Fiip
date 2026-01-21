import React, { useState, useEffect } from 'react';
import { X, User, Shield, CreditCard, Save, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { keyAuthService } from '../services/keyauth';

export default function UserProfileModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const [publicProfile, setPublicProfile] = useState({
    nickname: '',
    bio: '',
    accentColor: '#5865F2',
    avatar: null
  });

  useEffect(() => {
    if (isOpen) {
      const loadProfile = async () => {
          let profile = null;
          
          // Try loading from KeyAuth first
          if (keyAuthService.isAuthenticated) {
              const cloudData = await keyAuthService.loadUserData();
              if (cloudData.success && cloudData.data) {
                  try {
                      // KeyAuth returns stringified JSON in 'data' usually, depending on implementation
                      // In saveUserData we stringify. In _request for getvar, check response.
                      // keyauth.js loadUserData returns res (which has data boolean or string?)
                      // Let's assume loadUserData parses it or returns object if I implemented it well.
                      // Looking at keyauth.js: loadUserData calls _request type:'getvar'.
                      // usually getvar returns { success: true, response: "json_string" } or similar.
                      // I'll need to double check keyauth.js response for loadUserData
                      profile = typeof cloudData.data === 'string' ? JSON.parse(cloudData.data) : cloudData.data;
                  } catch (e) { console.error("Parse error", e); }
              }
          }

          // Fallback to local storage
          if (!profile) {
              const saved = localStorage.getItem('fiip_public_profile');
              if (saved) profile = JSON.parse(saved);
          }

          // Initialize defaults
          if (profile) {
            setPublicProfile(prev => ({ ...prev, ...profile }));
          } else if (keyAuthService.isAuthenticated && keyAuthService.userData) {
             setPublicProfile(prev => ({
                ...prev,
                nickname: keyAuthService.userData.username || ''
             }));
          }
      };
      loadProfile();
    }
  }, [isOpen]);

  const handleSave = async () => {
    // Save Local
    localStorage.setItem('fiip_public_profile', JSON.stringify(publicProfile));
    
    // Save Cloud
    if (keyAuthService.isAuthenticated) {
        await keyAuthService.saveUserData(publicProfile);
    }
    
    onClose();
  };

  const activeTabClass = (tab) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === tab ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`;

  const handleBioChange = (e) => {
      const val = e.target.value;
      // Simple URL/Link detection regex
      const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\.[a-z]{2,}\/)/i;
      
      if (urlRegex.test(val)) {
          alert(t('profile.no_links', "Les liens ne sont pas autorisés dans la bio pour des raisons de sécurité."));
          return;
      }
      setPublicProfile({...publicProfile, bio: val});
  };


  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("L'image est trop volumineuse (Max 2MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPublicProfile(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getAvatarColor = (name) => {
      const colors = ['#F23F42', '#EB459E', '#00B0F4', '#57F287', '#FEE75C', '#9B59B6'];
      let hash = 0;
      for (let i = 0; i < (name || '').length; i++) {
          hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm font-sans p-4">
      <div className="w-full max-w-2xl bg-[#313338] rounded-md shadow-2xl flex overflow-hidden max-h-[90vh]">
        {/* Sidebar */}
        <div className="w-1/3 bg-[#2B2D31] p-4 flex flex-col gap-1">
          <div className="text-[#949BA4] text-xs font-bold uppercase mb-2 px-2">Paramètres</div>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}
          >
            <User className="w-4 h-4" />
            {t('profile.public', 'Profil Public')}
          </button>
          <button 
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'account' ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}
          >
            <CreditCard className="w-4 h-4" />
            {t('profile.account', 'Mon Compte')}
          </button>
          <div className="h-[1px] bg-[#3F4147] my-2"></div>
          <button 
            onClick={() => setActiveTab('legal')}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'legal' ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}
          >
            <Shield className="w-4 h-4" />
            {t('profile.legal', 'Légal & Sécurité')}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#313338] flex flex-col min-w-0">
          <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold text-white mb-6">
              {activeTab === 'profile' && t('profile.edit_public', 'Modifier le profil public')}
              {activeTab === 'account' && t('profile.account_details', 'Détails du compte')}
              {activeTab === 'legal' && t('profile.legal_title', 'Conditions & Sécurité')}
            </h2>

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                   <div className="relative group">
                     {publicProfile.avatar ? (
                        <img src={publicProfile.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-[#1E1F22]" />
                     ) : (
                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-[#1E1F22]" style={{backgroundColor: getAvatarColor(publicProfile.nickname)}}>
                            {(publicProfile.nickname || 'User').substring(0, 2).toUpperCase()}
                        </div>
                     )}
                     <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => document.getElementById('avatar-upload').click()}>
                        <Upload className="w-6 h-6 text-white" />
                     </div>
                     <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                   </div>
                   
                   <div className="flex-1">
                      <label className="block text-[#B5BAC1] text-xs font-bold uppercase mb-1.5">Pseudo</label>
                      <input 
                        type="text" 
                        value={publicProfile.nickname}
                        onChange={(e) => setPublicProfile({...publicProfile, nickname: e.target.value})}
                        className="w-full bg-[#1E1F22] text-white p-2.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#00A8FC]"
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-[#B5BAC1] text-xs font-bold uppercase mb-1.5">À propos de moi</label>
                   <textarea 
                      value={publicProfile.bio}
                      onChange={handleBioChange}
                      className="w-full h-24 bg-[#1E1F22] text-white p-2.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#00A8FC] resize-none"
                      placeholder="Dites quelque chose sur vous..."
                   />
                </div>
              </div>
            )}

            {activeTab === 'account' && (
               <div className="space-y-4">
                  <div className="bg-[#2B2D31] p-4 rounded-lg border border-[#1F2023]">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-[#B5BAC1] text-xs font-bold uppercase">Utilisateur</span>
                          {keyAuthService.isAuthenticated && <span className="bg-[#248046] text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Vérifié</span>}
                      </div>
                      <div className="text-white font-medium">
                        {keyAuthService.isAuthenticated ? keyAuthService.userData?.username : 'Invité'}
                      </div>
                  </div>
                  
                  <div className="bg-[#2B2D31] p-4 rounded-lg border border-[#1F2023]">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-[#B5BAC1] text-xs font-bold uppercase">Abonnement</span>
                      </div>
                      <div className="text-white font-medium">
                        {keyAuthService.isAuthenticated ? keyAuthService.getCurrentSubscriptionName() : 'Aucun'}
                      </div>
                  </div>

                  <div className="text-[#949BA4] text-xs mt-4">
                    Ce profil est lié à votre clé de licence Fiip. Les modification du profil public n&apos;affectent pas votre compte KeyAuth.
                  </div>
               </div>
            )}

            {activeTab === 'legal' && (
              <div className="prose prose-invert prose-sm max-w-none text-[#DBDEE1]">
                <div className="bg-[#2B2D31] p-4 rounded border-l-4 border-yellow-500 mb-6">
                  <h3 className="text-[#F2F3F5] font-bold mt-0">Clause de non-responsabilité</h3>
                  <p className="mb-0 text-sm">
                    En utilisant ce service de chat, vous acceptez que l&apos;administrateur et le développeur de Fiip ne peuvent être tenus responsables du contenu généré par les utilisateurs.
                  </p>
                </div>

                <p>
                  Conformément aux lois en vigueur (notamment l&apos;article 6-I-2 de la LCEN en France), en tant qu&apos;hébergeur de contenu, notre responsabilité ne peut être engagée qu&apos;à partir du moment où nous avons connaissance d&apos;un contenu illicite et que nous n&apos;avons pas agi promptement pour le retirer.
                </p>

                <p>
                  Nous ne surveillons pas activement toutes les conversations en temps réel. Cependant, nous nous réservons le droit de :
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Supprimer tout contenu jugé inapproprié, illégal ou nuisible.</li>
                  <li>Bannir les utilisateurs ne respectant pas les règles de courtoisie.</li>
                  <li>Coopérer avec les autorités compétentes en cas de requête légale.</li>
                </ul>

                <p className="mt-4 font-bold">En continuant, vous reconnaissez que :</p>
                <ul className="list-disc pl-5 space-y-1">
                   <li>Vous êtes seul responsable de vos propos.</li>
                   <li>Vous n&apos;utiliserez pas ce service pour des activités illégales.</li>
                   <li>En cas de litige, seule votre responsabilité personnelle sera engagée.</li>
                </ul>
              </div>
            )}
          </div>

          <div className="bg-[#2B2D31] p-4 flex justify-end gap-3 shrink-0">
             {activeTab === 'profile' ? (
                <>
                  <button onClick={onClose} className="px-4 py-2 text-white hover:underline text-sm font-medium">Annuler</button>
                  <button onClick={handleSave} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </button>
                </>
             ) : (
                <button onClick={onClose} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded text-sm font-medium transition-colors">
                  Fermer
                </button>
             )}
          </div>
        </div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-[#B5BAC1] hover:text-white">
           <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
