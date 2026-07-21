import { Plus, Settings, Star, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

const getNoteTimestamp = (note) => note.updatedAt || note.createdAt || 0;

function groupNotes(notes = []) {
  const alive = notes.filter((n) => !n.deleted);
  const today = [];
  const yesterday = [];
  const older = [];
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);

  alive.forEach((note) => {
    const d = new Date(getNoteTimestamp(note));
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = d.toDateString() === y.toDateString();
    if (isToday) {today.push(note);}
    else if (isYesterday) {yesterday.push(note);}
    else {older.push(note);}
  });

  const sortDesc = (a, b) => getNoteTimestamp(b) - getNoteTimestamp(a);
  return {
    today: today.sort(sortDesc),
    yesterday: yesterday.sort(sortDesc),
    older: older.sort(sortDesc),
  };
}

function NoteRow({ note, isActive, onSelect }) {
  const when = new Date(getNoteTimestamp(note));
  const hhmm = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      type="button"
      onClick={() => onSelect(note.id)}
      className={`fiip-note-row ${isActive ? 'is-active' : ''}`}
    >
      <span className="fiip-note-title">{note.title || 'Sans titre'}</span>
      <span className="fiip-note-time">{hhmm}</span>
    </button>
  );
}

function Group({ title, notes, selectedNoteId, onSelect }) {
  if (!notes.length) {return null;}
  return (
    <section className="fiip-note-group">
      <h4>{title}</h4>
      <div>
        {notes.map((note) => (
          <NoteRow key={note.id} note={note} isActive={selectedNoteId === note.id} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

export default function DesktopSidebar({
  notes,
  selectedNoteId,
  onSelectNote,
  activeNav,
  onNavigate,
  onCreateNote,
  onOpenSettings,
}) {
  const grouped = useMemo(() => groupNotes(notes), [notes]);
  const favoritesCount = useMemo(() => notes.filter((n) => n.favorite && !n.deleted).length, [notes]);
  const trashCount = useMemo(() => notes.filter((n) => n.deleted).length, [notes]);

  return (
    <aside className="fiip-sidebar">
      <header className="fiip-sidebar-head">
        <div className="fiip-traffic" aria-hidden>
          <span className="red" />
          <span className="yellow" />
          <span className="green" />
        </div>
        <strong>Fiip</strong>
      </header>

      <nav className="fiip-sidebar-nav">
        <button type="button" className={activeNav === 'home' ? 'is-active' : ''} onClick={() => onNavigate('home')}>
          <span>Accueil</span>
          <span>{notes.filter((n) => !n.deleted).length}</span>
        </button>
        <button type="button" className={activeNav === 'favorites' ? 'is-active' : ''} onClick={() => onNavigate('favorites')}>
          <span><Star size={14} /> Favoris</span>
          <span>{favoritesCount}</span>
        </button>
        <button type="button" className={activeNav === 'trash' ? 'is-active' : ''} onClick={() => onNavigate('trash')}>
          <span><Trash2 size={14} /> Corbeille</span>
          <span>{trashCount}</span>
        </button>
      </nav>

      <div className="fiip-sidebar-list">
        <Group title="AUJOURD'HUI" notes={grouped.today} selectedNoteId={selectedNoteId} onSelect={onSelectNote} />
        <Group title="HIER" notes={grouped.yesterday} selectedNoteId={selectedNoteId} onSelect={onSelectNote} />
        <Group title="PLUS TÔT" notes={grouped.older} selectedNoteId={selectedNoteId} onSelect={onSelectNote} />
      </div>

      <footer className="fiip-sidebar-foot">
        <div className="fiip-cloud-block">
          <p><strong>Fiip sur tous vos appareils</strong></p>
          <p>Vos notes, toujours avec vous.</p>
          <button type="button">Découvrir Fiip Cloud →</button>
        </div>
        <div className="fiip-foot-actions">
          <button type="button" onClick={onCreateNote}><Plus size={14} /> Nouvelle note</button>
          <button type="button" onClick={onOpenSettings}><Settings size={14} /> Paramètres</button>
        </div>
      </footer>
    </aside>
  );
}
