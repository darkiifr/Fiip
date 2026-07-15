import { PenLine, X, ThumbsDown, ThumbsUp, Clipboard, ArrowRightCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { generateText, getLastAIUsageStats } from '../../services/ai';

const SUGGESTIONS = [
  'Résumer',
  'Réécrire plus clairement',
  'Extraire les points clés',
  'Trouver un titre',
];

export default function DesktopAssistantPanel({ note, onApplyText, onClose }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [modelUsed, setModelUsed] = useState(() => getLastAIUsageStats()?.model || 'auto');

  const selectedText = useMemo(() => {
    const plain = (note?.content || '').replace(/<[^>]+>/g, ' ');
    return plain.slice(0, 180);
  }, [note]);

  async function runPrompt(prompt) {
    if (!note) return;
    setLoading(true);
    try {
      const messages = [
        { role: 'system', content: 'Tu es Assistant Fiip. Réponds de façon concise, claire et actionnable.' },
        { role: 'user', content: `${prompt}\n\nTexte:\n${(note.content || '').replace(/<[^>]+>/g, ' ')}` },
      ];
      const res = await generateText({ messages });
      setAnswer(res || 'Aucune réponse.');
      setModelUsed(getLastAIUsageStats()?.model || 'auto');
    } catch (e) {
      setAnswer(e.message || 'Action impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="fiip-assistant-panel">
      <header>
        <div><PenLine size={16} /> Dexter</div>
        <button type="button" onClick={onClose}><X size={18} /></button>
      </header>

      <section>
        <h4>SUGGESTIONS</h4>
        <div className="fiip-assistant-suggestions">
          {SUGGESTIONS.map((label) => (
            <button key={label} type="button" onClick={() => runPrompt(label)}>{label}</button>
          ))}
        </div>
      </section>

      <section className="fiip-assistant-response">
        <h4>PROPOSITION</h4>
        <span className="status-pill">{modelUsed ? 'Prêt' : 'En attente'}</span>
        <p>Texte proposé :</p>
        <blockquote>{answer || selectedText || 'Choisissez une suggestion pour commencer.'}</blockquote>
        <div className="fiip-assistant-actions">
          <button type="button" onClick={() => onApplyText(answer || selectedText)}><ArrowRightCircle size={14} /> Remplacer</button>
          <button type="button" onClick={() => onApplyText(`\n${answer || selectedText}`)}><Clipboard size={14} /> Insérer après</button>
          <button type="button"><ThumbsUp size={14} /></button>
          <button type="button"><ThumbsDown size={14} /></button>
        </div>
      </section>

      <footer>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Corriger, résumer, structurer..."
        />
        <button type="button" disabled={loading || !input.trim()} onClick={() => runPrompt(input)}>{loading ? '...' : '↗'}</button>
      </footer>
    </aside>
  );
}
