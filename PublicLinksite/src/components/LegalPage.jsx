import { LEGAL_DOCS, LEGAL_NAV_ITEMS, LEGAL_UPDATED_AT } from '../config/legal';

function findLegalDoc(path) {
  return Object.values(LEGAL_DOCS).find((doc) => doc.path === path) || LEGAL_DOCS.legalNotice;
}

export default function LegalPage({ path }) {
  const doc = findLegalDoc(path);

  return (
    <main className="public-shell legal-shell">
      <nav className="site-nav">
        <a href="/" className="brand-mark">Fiip</a>
        <div className="nav-actions">
          <a href="/#licences" className="ghost-link">Licences</a>
          <a href="/account" className="ghost-link">Compte</a>
          <a href="/" className="primary-link">Accueil</a>
        </div>
      </nav>

      <section className="legal-layout">
        <aside className="legal-index public-panel">
          <span className="eyebrow">Documents</span>
          <nav>
            {LEGAL_NAV_ITEMS.map((item) => (
              <a key={item.path} className={item.path === doc.path ? 'active' : ''} href={item.path}>
                {item.label}
              </a>
            ))}
          </nav>
          <p>
            Version du {LEGAL_UPDATED_AT}. Les documents résument les règles d’utilisation,
            de confidentialité, de cookies et de remboursement de Fiip.
          </p>
        </aside>

        <article className="legal-document public-panel">
          <span className="eyebrow">Fiip</span>
          <h1>{doc.title}</h1>
          <p className="legal-intro">{doc.intro}</p>
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>
      </section>
    </main>
  );
}
