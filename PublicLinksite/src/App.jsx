import { Icon as IconifyIcon } from '@iconify/react';

import PublicNoteView from './components/PublicNoteView';
import { FIIP_CHROME_EXTENSION_URL } from './config/links';

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
          <h1>
            <span>Vos idées gardent</span>
            <span>leur forme,</span>
            <span>même hors de l’app.</span>
          </h1>
          <p>
            Fiip Public transforme chaque lien partagé en lecture premium: typographie calme,
            exports propres, pièces jointes lisibles et retour direct vers l’application.
          </p>
          <div className="hero-actions">
            <a href="https://fiip.netlify.app/" className="download-link">
              <IconifyIcon icon="mingcute:download-2-fill" />
              Télécharger Fiip
            </a>
            {FIIP_CHROME_EXTENSION_URL ? (
              <a href={FIIP_CHROME_EXTENSION_URL} className="secondary-link">
                <IconifyIcon icon="mingcute:chrome-fill" />
                Extension Chrome
              </a>
            ) : null}
            <a href="https://github.com/darkiifr/Fiip" className="secondary-link">
              <IconifyIcon icon="mingcute:github-fill" />
              Source
            </a>
          </div>
          <p className="install-note">
            Edge reste compatible : téléchargez le ZIP d’extension depuis GitHub, puis chargez le dossier décompressé dans <code>edge://extensions</code>.
          </p>
        </div>

        <article id="note-demo" className="note-preview public-panel">
          <div className="window-dots">
            <span />
            <span />
            <span />
          </div>
          <p className="preview-kicker">Note publique</p>
          <h2>Une note qui respire.</h2>
          <p className="preview-lead">
            Réunion produit du 21 juin.
          </p>
          <p>
            Finaliser les tags, vérifier les pièces jointes, préparer les captures Store et
            publier un lien propre pour l’équipe.
          </p>
          <ul className="demo-note-list">
            <li>Tags visibles dans la liste des notes.</li>
            <li>Exports .fiin, Markdown et PDF disponibles.</li>
            <li>Lecture publique sécurisée via Supabase.</li>
          </ul>
          <div className="preview-toolbar">
            <span>.fiin</span>
            <span>.md</span>
            <span>.pdf</span>
          </div>
        </article>
      </section>

      <section className="story-band">
        <div>
          <span className="eyebrow">Accueil public</span>
          <h2>Partager une note ne doit pas ressembler à un export brut.</h2>
        </div>
        <p>
          La page publique Fiip sert de vitrine de lecture : elle garde les titres, les listes,
          les pièces jointes et les actions d’export dans une interface calme, sans demander au
          lecteur de connaître l’application.
        </p>
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

      <section className="flow-band public-panel">
        <div>
          <IconifyIcon icon="mingcute:edit-2-fill" />
          <h3>Écrire</h3>
          <p>Créer une note riche dans Fiip avec tâches, tags et pièces jointes.</p>
        </div>
        <div>
          <IconifyIcon icon="mingcute:link-fill" />
          <h3>Partager</h3>
          <p>Publier seulement ce qui est public, avec un lien propre et lisible.</p>
        </div>
        <div>
          <IconifyIcon icon="mingcute:file-export-fill" />
          <h3>Exporter</h3>
          <p>Laisser le lecteur garder une copie en PDF, Markdown ou format Fiip.</p>
        </div>
      </section>
    </main>
  );
}

export default App;
