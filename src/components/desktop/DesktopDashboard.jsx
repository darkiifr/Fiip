import { CalendarDays, Clock3, FileText, Search } from 'lucide-react';

const getNoteTimestamp = (note) => note.updatedAt || note.createdAt || 0;

export default function DesktopDashboard({ featuredNote, recentNotes, onSelectNote, onSearchFocus }) {
  return (
    <div className="fiip-workspace-body">
      <button type="button" className="fiip-search-hero" onClick={onSearchFocus}>
        <Search size={18} />
        <span>Rechercher dans vos notes ou tapez une commande...</span>
        <kbd>⌘K</kbd>
      </button>

      {featuredNote && (
        <article className="fiip-feature-card">
          <div className="fiip-feature-main">
            <div className="fiip-note-kind"><FileText size={16} /> Note</div>
            <h2>{featuredNote.title || 'Sans titre'}</h2>
            <div className="fiip-meta">
              <span><CalendarDays size={16} /> Aujourd'hui</span>
              <span className="fiip-chip">Réflexion</span>
            </div>
            <p>{(featuredNote.content || '').replace(/<[^>]+>/g, '').slice(0, 220)}</p>
            <div className="fiip-feature-footer">
              <span>256 mots</span>
              <span><Clock3 size={16} /> 2 min de lecture</span>
            </div>
          </div>
          <div className="fiip-feature-art" aria-hidden />
          <button type="button" className="fiip-card-hit" onClick={() => onSelectNote(featuredNote.id)} aria-label={`Ouvrir ${featuredNote.title || 'Sans titre'}`} />
        </article>
      )}

      <section className="fiip-resume-grid">
        <h3>Reprendre</h3>
        <div>
          {recentNotes.slice(0, 3).map((note) => (
            <button type="button" key={note.id} className="fiip-resume-item" onClick={() => onSelectNote(note.id)}>
              <strong>{note.title || 'Sans titre'}</strong>
              <p>{(note.content || '').replace(/<[^>]+>/g, '').slice(0, 90)}</p>
              <span>{new Date(getNoteTimestamp(note)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
