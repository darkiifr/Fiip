import { Icon as IconifyIcon } from '@iconify/react';

import PublicNoteView from './components/PublicNoteView';

function App() {
  const path = window.location.pathname;

  if (path && path.toLowerCase().startsWith('/auth/callback')) {
    const hash = window.location.hash;
    const search = window.location.search;
    setTimeout(() => {
      window.location.replace(`fiip://login-callback${hash || search}`);
    }, 500);

    return (
      <main className="public-shell public-center">
        <section className="public-panel auth-panel">
          <IconifyIcon icon="mingcute:loading-fill" className="spin-icon" />
          <h1>Connexion à Fiip</h1>
          <p>Redirection sécurisée vers l’application.</p>
        </section>
      </main>
    );
  }

  if (path && (path.toLowerCase().startsWith('/n/') || path.toLowerCase() === '/n')) {
    return <PublicNoteView />;
  }

  return (
    <main className="public-shell">
      <nav className="site-nav">
        <a href="/" className="brand-mark">Fiip</a>
        <div className="nav-actions">
          <a href="/n/demo" className="ghost-link">Voir une note</a>
          <a href="https://github.com/darkiifr/Fiip" className="primary-link">GitHub</a>
        </div>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Notes partageables, propres, rapides</span>
          <h1>Vos idées gardent leur forme, même hors de l’app.</h1>
          <p>
            Fiip Public transforme chaque lien partagé en lecture premium: typographie calme,
            exports propres, pièces jointes lisibles et retour direct vers l’application.
          </p>
          <div className="hero-actions">
            <a href="https://fiip.netlify.app/" className="download-link">
              <IconifyIcon icon="mingcute:download-2-fill" />
              Télécharger Fiip
            </a>
            <a href="https://github.com/darkiifr/Fiip" className="secondary-link">
              <IconifyIcon icon="mingcute:github-fill" />
              Source
            </a>
          </div>
        </div>

        <div className="note-preview public-panel">
          <div className="window-dots">
            <span />
            <span />
            <span />
          </div>
          <p className="preview-kicker">Note publique</p>
          <h2>Clarté avant vitesse</h2>
          <p>
            Une interface de lecture qui privilégie la concentration, la confiance et le partage
            sans friction.
          </p>
          <div className="preview-toolbar">
            <span>.fiin</span>
            <span>.md</span>
            <span>.pdf</span>
          </div>
        </div>
      </section>

      <section className="feature-band">
        {[
          ['mingcute:shield-fill', 'Lecture sécurisée', 'Les notes publiques restent servies depuis Supabase avec RLS côté projet.'],
          ['mingcute:sparkles-fill', 'Design cohérent', 'Même direction Liquid Glass et typographie que l’application principale.'],
          ['mingcute:file-export-fill', 'Exports utiles', 'Téléchargement .fiin, Markdown et PDF depuis la visionneuse.'],
        ].map(([icon, title, text]) => (
          <article key={title} className="feature-card public-panel">
            <IconifyIcon icon={icon} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
