import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Icon as IconifyIcon } from '@iconify/react';
import { marked } from 'marked';

import { DEMO_PUBLIC_NOTE } from '../demoNote';
import { dataService } from '../services/supabase';

const renderMarkdown = (text) => {
  if (!text) {
    return { __html: '' };
  }

  const rawHtml = marked.parse(text);
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_ATTR: ['style', 'class', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'align'],
  });
  return { __html: sanitizedHtml };
};

const SAFE_DATA_MEDIA_PATTERN = /^data:(image|audio|video)\/[a-z0-9.+-]+;base64,/i;

const getSafePublicUrl = (value, { allowDataMedia = false } = {}) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (allowDataMedia && SAFE_DATA_MEDIA_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    return ['http:', 'https:', 'blob:'].includes(parsed.protocol) ? trimmed : '';
  } catch {
    return '';
  }
};

export default function PublicNoteView() {
  const [note, setNote] = useState(null);
  const [slug] = useState(() => {
    const match = window.location.pathname.match(/^\/n\/(.+)$/i);
    return match ? match[1] : '';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchNote() {
      if (!slug) {
        setError('Lien invalide.');
        setLoading(false);
        return;
      }

      if (slug.toLowerCase() === 'demo') {
        setNote(DEMO_PUBLIC_NOTE);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await dataService.getPublicNote(slug);
        if (fetchError) {
          throw fetchError;
        }
        setNote(data);
      } catch (err) {
        if (err === 'Configuration missing') {
          setError('Configuration du service public manquante.');
        } else if (err?.code === 'PGRST116') {
          setError('Note introuvable ou privée.');
        } else {
          setError(err?.message || 'Note introuvable ou privée.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchNote();
  }, [slug]);

  const safeTitle = (note?.title || 'note').replace(/[\\/:*?"<>|]/g, '_');

  const downloadBlob = (content, type, extension) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeTitle}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleDownloadFiin = () => {
    if (!note) {
      return;
    }
    downloadBlob(JSON.stringify(note, null, 2), 'application/json', 'fiin');
  };

  if (loading) {
    return (
      <main className="note-shell public-center">
        <section className="note-loading public-panel">
          <IconifyIcon icon="mingcute:loading-fill" className="spin-icon" />
          <h1>Chargement</h1>
          <p>Récupération de la note publique depuis Fiip.</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="note-shell public-center">
        <section className="note-error public-panel">
          <IconifyIcon icon="mingcute:warning-fill" className="spin-icon" />
          <h1>Note indisponible</h1>
          <p>{error}</p>
          <a href="/" className="open-app-link">Retour à l’accueil</a>
        </section>
      </main>
    );
  }

  if (!note) {
    return null;
  }

  const mediaAttachments = (note.attachments || []).filter((att) => ['image', 'video', 'audio'].includes(att.type));

  return (
    <main className="note-shell">
      <nav className="note-nav">
        <a href="/" className="brand-mark">Fiip</a>
        <a href={`fiip://note/${slug}`} className="open-app-link">
          <IconifyIcon icon="mingcute:external-link-line" />
          Ouvrir dans l’app
        </a>
      </nav>

      <section className="note-layout">
        <article id="note-print-area" className="note-document public-panel">
          <span className="note-kicker">Note publique</span>
          <h1>{note.title || 'Sans titre'}</h1>
          <div className="note-meta">
            {note.author_username && <span className="meta-pill">{note.author_username}</span>}
            <span className="meta-pill">{new Date(note.updatedAt || note.created_at).toLocaleDateString()}</span>
            {(note.badges || []).slice(0, 4).map((badge, index) => (
              <span key={`${badge.name || badge}-${index}`} className="meta-pill">{badge.name || badge}</span>
            ))}
          </div>

          <div className="markdown-body" dangerouslySetInnerHTML={renderMarkdown(note.content)} />

          {mediaAttachments.length > 0 && (
            <div className="attachments">
              {mediaAttachments.map((attachment, index) => {
                const src = getSafePublicUrl(attachment.url || attachment.data, { allowDataMedia: true });
                if (!src) {
                  return null;
                }

                return (
                  <div key={`${attachment.name || attachment.type}-${index}`} className="media-card">
                    {attachment.type === 'image' && <img src={src} alt={attachment.name || 'Pièce jointe'} loading="lazy" />}
                    {attachment.type === 'video' && (
                      <video src={src} controls aria-label={attachment.name || 'Vidéo jointe'}>
                        <track kind="captions" />
                      </video>
                    )}
                    {attachment.type === 'audio' && (
                      <audio src={src} controls aria-label={attachment.name || 'Audio joint'}>
                        <track kind="captions" />
                      </audio>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(note.attachments || []).length > 0 && (
            <div className="attachments">
              {(note.attachments || []).map((attachment, index) => {
                const href = getSafePublicUrl(attachment.url || attachment.data);
                if (!href) {
                  return null;
                }

                return (
                  <a
                    key={`${attachment.name || 'file'}-${index}`}
                    href={href}
                    download={attachment.name || 'Fichier'}
                    className="attachment-card"
                  >
                    <IconifyIcon icon="mingcute:attachment-fill" />
                    <span>{attachment.name || 'Fichier joint'}</span>
                  </a>
                );
              })}
            </div>
          )}
        </article>

        <aside className="download-panel public-panel">
          <h2>Exporter</h2>
          <p>Conservez une copie portable ou ouvrez la note dans Fiip.</p>
          <div className="download-actions">
            <button type="button" onClick={handleDownloadFiin}>.fiin</button>
          </div>
        </aside>
      </section>
    </main>
  );
}
