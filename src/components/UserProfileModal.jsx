import { Icon as IconifyIcon } from '@iconify/react';
import { X, User, Shield, CreditCard, Save, Upload, RefreshCw, Cloud, BadgeCheck } from 'lucide-react';
import { useState, useEffect } from 'react';

import { keyAuthService } from '../services/keyauth';
import { authService, dataService } from '../services/supabase';

const SKILL_OPTIONS = [
  ['javascript', 'skill-icons:javascript', 'JavaScript'],
  ['typescript', 'skill-icons:typescript', 'TypeScript'],
  ['html', 'skill-icons:html', 'HTML'],
  ['css', 'skill-icons:css', 'CSS'],
  ['react', 'skill-icons:react-dark', 'React'],
  ['nodejs', 'skill-icons:nodejs-dark', 'Node.js'],
  ['python', 'skill-icons:python-dark', 'Python'],
  ['rust', 'skill-icons:rust', 'Rust'],
  ['go', 'skill-icons:golang', 'Go'],
  ['java', 'skill-icons:java-dark', 'Java'],
  ['cpp', 'skill-icons:cpp', 'C++'],
  ['csharp', 'skill-icons:cs', 'C#'],
  ['docker', 'skill-icons:docker', 'Docker'],
  ['git', 'skill-icons:git', 'Git'],
  ['github', 'skill-icons:github-dark', 'GitHub'],
  ['postgresql', 'skill-icons:postgresql-dark', 'PostgreSQL'],
  ['mongodb', 'skill-icons:mongodb', 'MongoDB'],
  ['figma', 'skill-icons:figma-dark', 'Figma'],
];

const skillById = new Map(SKILL_OPTIONS.map(([id, icon, label]) => [id, { icon, label }]));

function getDisplayName(user, profile) {
  return (
    profile?.nickname ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.nickname ||
    user?.email?.split('@')[0] ||
    'Utilisateur Fiip'
  );
}

function ProfileAvatar({ user, profile, onUpload }) {
  const name = getDisplayName(user, profile);
  const avatar = profile?.avatar || profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl border border-warm-border-light bg-amber-500/10 dark:border-white/10">
      {avatar ? (
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xl font-black text-amber-700 dark:text-amber-300">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <button
        type="button"
        onClick={onUpload}
        className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity hover:opacity-100"
        aria-label="Changer la photo de profil"
      >
        <Upload size={18} />
      </button>
    </div>
  );
}

export default function UserProfileModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [publicProfile, setPublicProfile] = useState({
    nickname: '',
    bio: '',
    accentColor: '#D97706',
    avatar: '',
    skills: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    const loadProfile = async () => {
      const currentUser = await authService.getUser();
      const { data } = await dataService.fetchProfile();
      if (!mounted) return;
      setUser(currentUser);
      const nextProfile = {
        nickname: getDisplayName(currentUser, data),
        bio: data?.bio || '',
        avatar: data?.avatar_url || data?.avatar || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || '',
        accentColor: data?.accent_color || data?.accentColor || '#D97706',
        skills: Array.isArray(data?.skills) ? data.skills.filter((skill) => skillById.has(skill)) : [],
      };
      setPublicProfile(nextProfile);
    };

    loadProfile().catch(console.error);
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setStatus('');
    const profileToSave = {
      ...publicProfile,
      avatar_url: publicProfile.avatar,
      accent_color: publicProfile.accentColor,
    };

    localStorage.setItem('fiip_public_profile', JSON.stringify(profileToSave));
    window.dispatchEvent(new Event('storage'));

    const { error } = await dataService.saveProfile(profileToSave);
    setIsSaving(false);
    if (error) {
      setStatus("Le profil n'a pas pu être enregistré.");
      return;
    }
    setStatus('Profil enregistré.');
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus("L'image est trop volumineuse. Taille maximale: 2 Mo.");
      return;
    }

    setStatus('');
    const { url, error } = await dataService.uploadAvatar(file);
    if (error) {
      setStatus("L'avatar n'a pas pu être envoyé.");
      return;
    }
    if (url) {
      setPublicProfile((profile) => ({ ...profile, avatar: url }));
    }
  };

  const toggleSkill = (skillId) => {
    setPublicProfile((profile) => {
      const skills = profile.skills || [];
      return {
        ...profile,
        skills: skills.includes(skillId)
          ? skills.filter((skill) => skill !== skillId)
          : [...skills, skillId],
      };
    });
  };

  if (!isOpen) return null;

  const displayName = getDisplayName(user, publicProfile);
  const subscription = keyAuthService.isAuthenticated ? keyAuthService.getCurrentSubscriptionName() : 'Aucune licence active';
  const cloudActive = Boolean(user) && JSON.parse(localStorage.getItem('fiip-settings') || '{}').cloudSync !== false;

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'account', label: 'Compte', icon: CreditCard },
    { id: 'legal', label: 'Sécurité', icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 font-sans backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-warm-border-light bg-warm-bg-light text-warm-text-primary-light shadow-[0_28px_90px_rgba(0,0,0,0.28)] dark:border-white/10 dark:bg-[#1c1c1b] dark:text-warm-text-primary-dark">
        <aside className="w-48 border-r border-warm-border-light bg-warm-sidebar-light/70 p-4 dark:border-white/10 dark:bg-white/[0.035]">
          <p className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-warm-text-muted-light">Compte</p>
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors ${
                  activeTab === id
                    ? 'bg-white text-warm-text-primary-light shadow-sm dark:bg-white/10 dark:text-white'
                    : 'text-warm-text-secondary-light hover:bg-white/60 dark:text-warm-text-secondary-dark dark:hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-warm-border-light px-6 py-4 dark:border-white/10">
            <div>
              <h2 className="fiip-light-profile-heading text-lg font-black tracking-tight">
                {activeTab === 'profile' ? 'Profil public' : activeTab === 'account' ? 'Détails du compte' : 'Sécurité'}
              </h2>
              <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Informations visibles dans Fiip et la collaboration.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-warm-text-muted-light hover:bg-warm-sidebar-item-active dark:hover:bg-white/10">
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <section className="flex gap-4 rounded-3xl border border-warm-border-light bg-warm-card-light p-4 dark:border-white/10 dark:bg-white/[0.045]">
                  <ProfileAvatar user={user} profile={publicProfile} onUpload={() => document.getElementById('avatar-upload')?.click()} />
                  <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  <div className="min-w-0 flex-1 space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-warm-text-muted-light" htmlFor="profile-nickname">
                      Nom affiché
                    </label>
                    <input
                      id="profile-nickname"
                      value={publicProfile.nickname}
                      onChange={(event) => setPublicProfile((profile) => ({ ...profile, nickname: event.target.value }))}
                      className="w-full rounded-2xl border border-warm-border-light bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500/45 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white"
                      placeholder={displayName}
                    />
                    <p className="text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">L’email reste privé. Fiip affiche ce nom et votre photo.</p>
                  </div>
                </section>

                <section className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-warm-text-muted-light" htmlFor="profile-bio">
                    Bio courte
                  </label>
                  <textarea
                    id="profile-bio"
                    value={publicProfile.bio}
                    onChange={(event) => setPublicProfile((profile) => ({ ...profile, bio: event.target.value }))}
                    className="h-24 w-full resize-none rounded-3xl border border-warm-border-light bg-warm-card-light p-4 text-sm outline-none focus:border-amber-500/45 dark:border-white/10 dark:bg-white/[0.045] dark:text-white"
                    placeholder="Quelques mots sur votre espace de travail."
                  />
                </section>

                <section className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-warm-text-muted-light">Compétences</p>
                    <p className="mt-1 text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">Choisissez les technologies affichées sur votre profil. Les icônes non prises en charge sont filtrées.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SKILL_OPTIONS.map(([id, icon, label]) => {
                      const selected = publicProfile.skills?.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleSkill(id)}
                          className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                            selected
                              ? 'border-amber-500/35 bg-amber-500/12 text-amber-800 dark:text-amber-200'
                              : 'border-warm-border-light bg-warm-card-light hover:bg-warm-sidebar-item-active dark:border-white/10 dark:bg-white/[0.045] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          <IconifyIcon icon={icon} className="h-5 w-5 shrink-0" />
                          <span className="truncate">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-4">
                <section className="rounded-3xl border border-warm-border-light bg-warm-card-light p-5 dark:border-white/10 dark:bg-white/[0.045]">
                  <div className="flex items-center gap-4">
                    <ProfileAvatar user={user} profile={publicProfile} onUpload={() => setActiveTab('profile')} />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black">{displayName}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">{subscription}</p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-warm-border-light bg-warm-card-light p-4 dark:border-white/10 dark:bg-white/[0.045]">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                      <Cloud size={17} />
                    </div>
                    <p className="text-sm font-black">Cloud Supabase</p>
                    <p className="mt-1 text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">{cloudActive ? 'Actif pour ce compte.' : 'Désactivé ou non connecté.'}</p>
                  </div>
                  <div className="rounded-3xl border border-warm-border-light bg-warm-card-light p-4 dark:border-white/10 dark:bg-white/[0.045]">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-700 dark:text-amber-300">
                      <BadgeCheck size={17} />
                    </div>
                    <p className="text-sm font-black">Licence actuelle</p>
                    <p className="mt-1 text-xs text-warm-text-muted-light dark:text-warm-text-muted-dark">{subscription}</p>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'legal' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-warm-border-light bg-warm-card-light p-5 dark:border-white/10 dark:bg-white/[0.045]">
                  <Shield className="mb-3 text-emerald-600 dark:text-emerald-300" size={20} />
                  <h3 className="text-sm font-black">Confidentialité</h3>
                  <p className="mt-2 text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">Vos notes restent locales tant que vous ne connectez pas Supabase. Les liens publics sont explicitement activés note par note.</p>
                </div>
                <div className="rounded-3xl border border-warm-border-light bg-warm-card-light p-5 dark:border-white/10 dark:bg-white/[0.045]">
                  <CreditCard className="mb-3 text-blue-600 dark:text-blue-300" size={20} />
                  <h3 className="text-sm font-black">Licence</h3>
                  <p className="mt-2 text-sm leading-6 text-warm-text-secondary-light dark:text-warm-text-secondary-dark">La licence est liée au compte et sert à activer les fonctions Premium sans exposer de clé IA personnelle.</p>
                </div>
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-warm-border-light px-6 py-4 dark:border-white/10">
            <p className={`text-xs font-semibold ${status.includes('pas') || status.includes("n'a") ? 'text-red-500' : 'text-warm-text-muted-light dark:text-warm-text-muted-dark'}`}>
              {status || 'Les changements sont enregistrés quand vous cliquez sur Enregistrer.'}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-2xl border border-warm-border-light px-4 py-2 text-xs font-bold hover:bg-warm-sidebar-item-active dark:border-white/10 dark:hover:bg-white/10">
                Fermer
              </button>
              <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950">
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? 'Mise à jour' : 'Enregistrer'}
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
