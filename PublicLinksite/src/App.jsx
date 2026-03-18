import PublicNoteView from './components/PublicNoteView';
import { Icon as IconifyIcon } from '@iconify/react';

function App() {
  const path = window.location.pathname;

  // Supabase Auth Redirection Callback
  if (path && (path.toLowerCase().startsWith('/auth/callback') || path.toLowerCase() === '/auth/callback')) {
      const hash = window.location.hash;
      const search = window.location.search;
      setTimeout(() => {
          window.location.replace(`fiip://login-callback${hash || search}`);
      }, 500);

      return (
        <div className="min-h-screen bg-[#1C1C1E] text-white flex flex-col items-center justify-center font-sora">
            <h2 className="text-3xl font-bold mb-4">Authentification en cours !</h2>
            <p className="text-gray-400">Redirection vers l&apos;application Fiip...</p>
            <p className="text-gray-500 mt-8 text-sm">Vous pouvez fermer cette page une fois l&apos;application ouverte.</p>
        </div>
      );
  }

  // Case-insensitive check for note path
  if (path && (path.toLowerCase().startsWith('/n/') || path.toLowerCase() === '/n')) {
      return <PublicNoteView />;
  }
  
  return (
    <div className="min-h-screen bg-[#1C1C1E] text-white font-sora">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg tracking-tight">Fiip</span>
                </div>
                <a 
                    href="https://fiip.netlify.app" 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                >
                    Télécharger
                </a>
            </div>
        </header>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Partagez vos idées.<br/>Instantanément.
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Fiip Viewer vous permet de consulter les notes partagées par les utilisateurs de Fiip, l&apos;application de prise de notes rapide et sécurisée.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a 
                    href="https://fiip.netlify.app" 
                    className="w-full sm:w-auto px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                    <IconifyIcon icon="mingcute:download-fill" className="text-xl" />
                    Obtenir Fiip pour Windows
                </a>
                <a 
                    href="https://github.com/darkiifr/Fiip" 
                    className="w-full sm:w-auto px-8 py-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                >
                    <IconifyIcon icon="mingcute:github-fill" className="text-xl" />
                    Voir sur GitHub
                </a>
            </div>
        </div>

        {/* How it works */}
        <div className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
            <h2 className="text-3xl font-bold text-center mb-16">Comment partager une note ?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Step 1 */}
                <div className="bg-white/5 p-8 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-8xl transition-transform group-hover:scale-110">1</div>
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6">
                        <IconifyIcon icon="mingcute:edit-2-fill" className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Créez votre note</h3>
                    <p className="text-gray-400">
                        Ouvrez Fiip et rédigez votre contenu. Utilisez le Markdown, ajoutez des images, des fichiers ou même des dessins.
                    </p>
                </div>

                {/* Step 2 */}
                <div className="bg-white/5 p-8 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-8xl transition-transform group-hover:scale-110">2</div>
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-6">
                        <IconifyIcon icon="mingcute:share-2-fill" className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Cliquez sur Partager</h3>
                    <p className="text-gray-400">
                        Dans la barre d&apos;outils, cliquez sur l&apos;icône de partage. Activez le partage public pour générer un lien unique.
                    </p>
                </div>

                {/* Step 3 */}
                <div className="bg-white/5 p-8 rounded-2xl border border-white/5 hover:border-green-500/30 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-8xl transition-transform group-hover:scale-110">3</div>
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 mb-6">
                        <IconifyIcon icon="mingcute:link-fill" className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Envoyez le lien</h3>
                    <p className="text-gray-400">
                        Copiez le lien généré et envoyez-le à vos amis ou collègues. Ils pourront consulter votre note instantanément dans ce visualiseur.
                    </p>
                </div>
            </div>
        </div>

        {/* Feature Highlights */}
        <div className="bg-white/2 py-20 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold mb-6">Pourquoi utiliser Fiip ?</h2>
                        <ul className="space-y-4">
                            {[
                                { icon: 'mingcute:lightning-fill', text: 'Ultra rapide et léger' },
                                { icon: 'mingcute:markdown-fill', text: 'Support complet du Markdown' },
                                { icon: 'mingcute:cloud-fill', text: 'Synchronisation Cloud sécurisée' },
                                { icon: 'mingcute:file-fill', text: 'Partage de fichiers intégré' },
                                { icon: 'mingcute:lock-fill', text: 'Chiffrement de bout en bout' },
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-gray-300">
                                    <IconifyIcon icon={item.icon} className="text-blue-500 text-xl" />
                                    {item.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-3xl rounded-full"></div>
                        <div className="relative bg-[#2C2C2E] border border-white/10 rounded-xl p-6 shadow-2xl">
                             {/* Mockup UI */}
                             <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                             </div>
                             <div className="space-y-3">
                                <div className="h-8 w-3/4 bg-white/10 rounded"></div>
                                <div className="h-4 w-full bg-white/5 rounded"></div>
                                <div className="h-4 w-5/6 bg-white/5 rounded"></div>
                                <div className="h-4 w-4/6 bg-white/5 rounded"></div>
                                <div className="h-32 w-full bg-blue-500/10 border border-blue-500/20 rounded mt-4 flex items-center justify-center text-blue-400">
                                    <IconifyIcon icon="mingcute:pic-fill" className="text-3xl" />
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12 bg-[#161618]">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-gray-500 text-sm">
                <p>&copy; 2026 Fiip. Tous droits réservés.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <a href="https://github.com/darkiifr/Fiip/blob/main/PRIVACY.md" className="hover:text-white transition-colors">Confidentialité</a>
                    <a href="https://github.com/darkiifr/Fiip/blob/main/LICENSE" className="hover:text-white transition-colors">Licence</a>
                    <a href="https://github.com/darkiifr/Fiip" className="hover:text-white transition-colors">GitHub</a>
                </div>
            </div>
        </footer>
    </div>
  );
}

export default App;

