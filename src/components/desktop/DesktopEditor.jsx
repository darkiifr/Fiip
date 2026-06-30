import { CalendarDays, Clock3, FileText, MoreHorizontal, Share2, Sparkles } from 'lucide-react';

import { stripNoteText } from '../../utils/notePresentation';

const getCurrentTimestamp = () => new Date().getTime();
const getNoteTimestamp = (note) => note.updatedAt || note.createdAt || 0;

export default function DesktopEditor({ note, onUpdateNote, onOpenAssistant, onOpenShare }) {
  if (!note) {
    return <div className="fiip-empty">Sélectionnez une note pour commencer.</div>;
  }

  const plain = stripNoteText(note.content);
  const updatedAt = getNoteTimestamp(note);

  return (
    <div className="fiip-workspace-body">
      <header className="fiip-editor-head">
        <button type="button" onClick={onOpenShare}><Share2 size={16} /> Partager</button>
        <button type="button" onClick={onOpenAssistant}><Sparkles size={16} /> Assistant</button>
        <button type="button"><MoreHorizontal size={16} /></button>
      </header>

      <section className="fiip-editor-card">
        <div className="fiip-note-kind"><FileText size={16} /> Note</div>
        <input
          className="fiip-editor-title"
          value={note.title || ''}
          onChange={(e) => onUpdateNote({ ...note, title: e.target.value, updatedAt: getCurrentTimestamp() })}
          placeholder="Sans titre"
        />
        <div className="fiip-meta">
          <span><CalendarDays size={16} /> {new Date(updatedAt).toLocaleString()}</span>
          <span className="fiip-chip">Réflexion</span>
          <span className="fiip-chip">Principes</span>
        </div>
        <textarea
          className="fiip-editor-text"
          value={plain}
          onChange={(e) => onUpdateNote({ ...note, content: e.target.value, updatedAt: getCurrentTimestamp() })}
          placeholder="Commencez à écrire..."
        />
        <footer className="fiip-editor-foot">
          <span>256 mots</span>
          <span><Clock3 size={16} /> 2 min de lecture</span>
          <span>Modifié aujourd'hui à {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </footer>
      </section>
    </div>
  );
}
