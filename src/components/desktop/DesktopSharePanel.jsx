import { Globe, Link2, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { buildPublicNoteUrl } from '../../config/links';
import { dataService } from '../../services/supabase';

export default function DesktopSharePanel({ note, onClose, onUpdateNote }) {
  const [isPublic, setIsPublic] = useState(Boolean(note?.public_slug));
  const [publicUrl, setPublicUrl] = useState(note?.public_slug ? buildPublicNoteUrl(note.public_slug) : '');
  const [status, setStatus] = useState('');
  const [username, setUsername] = useState('');
  const [collaborators, setCollaborators] = useState([]);

  async function loadCollaborators() {
    if (!note?.id) {return;}
    const { data } = await dataService.getCollaborators(note.id);
    setCollaborators(data || []);
  }

  useEffect(() => {
    loadCollaborators();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  async function togglePublic() {
    if (!note?.id) {return;}
    if (isPublic) {
      const { error } = await dataService.unpublishNote(note.id);
      if (!error) {
        setIsPublic(false);
        setPublicUrl('');
        setStatus('Note rendue privée.');
        onUpdateNote({ ...note, public_slug: null, shared: false });
      }
      return;
    }

    const { data, error } = await dataService.publishNote(note.id);
    if (!error && data?.public_slug) {
      const url = buildPublicNoteUrl(data.public_slug);
      setIsPublic(true);
      setPublicUrl(url);
      setStatus('Note publiée avec succès.');
      onUpdateNote({ ...note, public_slug: data.public_slug, shared: true });
    }
  }

  async function addCollaborator() {
    if (!username.trim() || !note?.id) {return;}
    const { error } = await dataService.addCollaborator(note.id, username.trim());
    setStatus(error || 'Collaborateur ajouté.');
    setUsername('');
    loadCollaborators();
  }

  async function removeCollaborator(userId) {
    if (!note?.id) {return;}
    await dataService.removeCollaborator(note.id, userId);
    loadCollaborators();
  }

  return (
    <div className="fiip-overlay" role="dialog" aria-modal="true">
      <div className="fiip-share-panel">
        <header>
          <h3>Partager la note</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>

        <section>
          <h4><Globe size={16} /> Lien public</h4>
          <div className="fiip-share-row">
            <p>{isPublic ? 'Accessible via le lien public.' : 'La note est privée.'}</p>
            <button type="button" onClick={togglePublic}>{isPublic ? 'Arrêter le partage' : 'Publier'}</button>
          </div>
          {publicUrl && (
            <div className="fiip-share-url">
              <span>{publicUrl}</span>
              <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl)}><Link2 size={14} /> Copier</button>
            </div>
          )}
        </section>

        <section>
          <h4><Users size={16} /> Collaborateurs</h4>
          <div className="fiip-share-add">
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nom d'utilisateur" />
            <button type="button" onClick={addCollaborator}>Ajouter</button>
          </div>
          <div className="fiip-share-collabs">
            {collaborators.map((c) => (
              <div key={c.user_id}>
                <span>{c.profiles?.username || 'Utilisateur'}</span>
                <button type="button" onClick={() => removeCollaborator(c.user_id)}>Retirer</button>
              </div>
            ))}
          </div>
        </section>

        {status && <p className="fiip-status">{status}</p>}
      </div>
    </div>
  );
}
