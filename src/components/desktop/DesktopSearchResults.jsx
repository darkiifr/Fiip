import { FileText, Search } from 'lucide-react';

function snippet(content, query) {
  const plain = (content || '').replace(/<[^>]+>/g, ' ');
  if (!query) {return plain.slice(0, 150);}
  const idx = plain.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) {return plain.slice(0, 150);}
  const start = Math.max(0, idx - 50);
  return `... ${plain.slice(start, start + 160)} ...`;
}

export default function DesktopSearchResults({ query, results, onSelectNote, onClear }) {
  return (
    <div className="fiip-workspace-body">
      <div className="fiip-search-header">
        <div className="fiip-search-input">
          <Search size={18} />
          <input value={query} readOnly />
          <button type="button" onClick={onClear}>×</button>
        </div>
        <p>{results.length} résultats trouvés</p>
      </div>
      <div className="fiip-search-list">
        {results.map((note) => (
          <button type="button" key={note.id} className="fiip-search-item" onClick={() => onSelectNote(note.id)}>
            <div className="fiip-note-kind"><FileText size={15} /> {note.favorite ? 'Favori' : 'Note'}</div>
            <strong>{note.title || 'Sans titre'}</strong>
            <p>{snippet(note.content, query)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
