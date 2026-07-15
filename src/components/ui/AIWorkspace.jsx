import { motion } from 'framer-motion';
import { useState } from 'react';

import IconCheck from '~icons/mingcute/check-fill';
import IconClose from '~icons/mingcute/close-fill';
import IconPen from '~icons/mingcute/pen-fill';
import IconSend from '~icons/mingcute/send-plane-fill';
import IconStop from '~icons/mingcute/stop-fill';
import IconTrash from '~icons/mingcute/delete-2-fill';

import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { ScrollArea } from './scroll-area';
import { Textarea } from './textarea';

function AILight({ className = 'h-8 w-8', active = false, shouldReduceMotion = false }) {
  return (
    <motion.span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full border border-white/18 bg-[#111827] shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_10px_24px_rgba(0,0,0,.22)] ${className}`}
      animate={shouldReduceMotion ? undefined : { rotate: active ? 360 : 0 }}
      transition={shouldReduceMotion ? undefined : { duration: active ? 12 : 0.2, ease: 'linear', repeat: active ? Infinity : 0 }}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,.82),transparent_20%),radial-gradient(circle_at_70%_70%,rgba(110,116,255,.88),transparent_34%),radial-gradient(circle_at_25%_80%,rgba(71,184,129,.72),transparent_26%),linear-gradient(135deg,rgba(255,255,255,.16),rgba(110,116,255,.24))]" />
      <span className="absolute inset-[3px] rounded-full bg-black/12 backdrop-blur-[1px]" />
    </motion.span>
  );
}

export function AIFloatingAssistant({
  onOpen,
  onSubmit,
  disabled = false,
  avoidBottomToolbar = false,
  shouldReduceMotion = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');

  const handleSubmit = (event) => {
    event?.preventDefault();
    const prompt = value.trim();
    if (!prompt) {
      onOpen?.();
      return;
    }
    onSubmit?.(prompt);
    setValue('');
    setExpanded(false);
  };

  return (
    <motion.div
      className={`fixed right-4 z-40 max-w-[calc(100vw-2rem)] sm:right-5 ${avoidBottomToolbar ? 'bottom-24' : 'bottom-5'}`}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: disabled ? 0.62 : 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
    >
      <motion.form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-[28px] border border-white/14 bg-[#10131a]/88 text-[color:var(--text-primary)] shadow-[0_22px_70px_rgba(0,0,0,.38)] backdrop-blur-3xl"
        initial={false}
        animate={{
          width: expanded ? 'min(380px, calc(100vw - 2rem))' : 'min(184px, calc(100vw - 2rem))',
          height: expanded ? 196 : 56,
        }}
        transition={shouldReduceMotion ? { duration: 0.12 } : { type: 'spring', stiffness: 430, damping: 38, mass: 0.8 }}
      >
        <div className="flex h-14 items-center gap-3 px-3">
          <AILight active={expanded} shouldReduceMotion={shouldReduceMotion} className="h-8 w-8" />
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (expanded) {
                onOpen?.();
              } else {
                setExpanded(true);
              }
            }}
            className="min-w-0 flex-1 text-left text-sm font-bold text-[color:var(--text-primary)] outline-none disabled:text-[color:var(--text-secondary)]"
          >
            <span className="block truncate">{expanded ? 'Dexter' : 'Demander a Dexter'}</span>
            {!expanded && <span className="block truncate text-[11px] font-bold text-[color:var(--text-secondary)]">Ouvre ou ecrit une demande</span>}
          </button>
          {expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Fermer le champ Dexter"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-[color:var(--text-primary)]"
            >
              <IconClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {expanded && (
          <div className="px-3 pb-3">
            <Textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setExpanded(false);
                }
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  handleSubmit(event);
                }
              }}
              placeholder="Resume, corrige ou cree une note..."
              aria-label="Demande rapide a Dexter"
              rows={3}
              className="min-h-[92px] rounded-[22px] border-white/10 bg-black/22 text-sm"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <kbd className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-[11px] font-bold text-[color:var(--text-secondary)]">Ctrl Enter</kbd>
              <Button type="submit" size="sm" disabled={disabled || !value.trim()}>
                Envoyer
              </Button>
            </div>
          </div>
        )}
      </motion.form>
    </motion.div>
  );
}

export function AIWorkspaceFrame({ children, shouldReduceMotion, _onClose }) {
  const windowTransition = shouldReduceMotion
    ? { duration: 0.12 }
    : { type: 'spring', stiffness: 420, damping: 38, mass: 0.85 };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/24 px-5 py-7">
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label="Dexter"
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(18px) scale(0.98)' }}
        animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(10px) scale(0.985)' }}
        transition={windowTransition}
        className="relative isolate flex h-[min(760px,calc(100vh-56px))] w-[min(1120px,calc(100vw-48px))] overflow-hidden rounded-[30px] border border-white/14 bg-[#090b10]/94 font-sans text-[color:var(--text-primary)] shadow-[0_30px_90px_rgba(0,0,0,.44)] backdrop-blur-3xl"
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_0%,rgba(10,132,255,.18),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(90,200,250,.08),transparent_26%),linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.015)_45%,rgba(10,132,255,.04))]"
          animate={shouldReduceMotion ? undefined : { backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
          transition={shouldReduceMotion ? undefined : { duration: 22, repeat: Infinity, ease: 'linear' }}
          style={{ backgroundSize: '180% 180%' }}
        />
        <div className="relative z-10 flex h-full w-full min-w-0">
          {children}
        </div>
      </motion.section>
    </div>
  );
}

export function AIWorkspaceSidebar({
  title,
  noteTitle,
  noteWordCount,
  attachmentsCount,
  notePreview,
  actions,
  activeAction,
  isThinking,
  onAction,
  onClose,
}) {
  return (
    <aside className="hidden w-[286px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-white/[0.045] p-4 lg:flex">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--accent)]">{title}</p>
          <h2 className="mt-2 text-[25px] font-extrabold tracking-[-0.015em]">Assistant</h2>
        </div>
        <Button
          type="button"
          onClick={onClose}
          aria-label="Fermer Dexter"
          title="Fermer Dexter"
          variant="outline"
          size="icon"
          className="titlebar-no-drag h-8 w-8 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
        >
          <IconClose className="h-4 w-4" />
        </Button>
      </div>

      <AIContextCard
        noteTitle={noteTitle}
        noteWordCount={noteWordCount}
        attachmentsCount={attachmentsCount}
        notePreview={notePreview}
      />

      <div className="mt-4 space-y-2">
        <p className="px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--text-secondary)]">Actions</p>
        {actions.map(action => (
          <AIQuickActionButton
            key={action.id}
            action={action}
            active={activeAction === action.id}
            disabled={isThinking || (action.requiresNote && !noteTitle)}
            onClick={() => onAction(action)}
          />
        ))}
      </div>
    </aside>
  );
}

export function AIContextCard({ noteTitle, noteWordCount, attachmentsCount, notePreview }) {
  return (
    <Card className="mt-5 rounded-[24px] bg-black/16">
      <CardHeader className="p-4 pb-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--text-secondary)]">Note active</p>
        <CardTitle className="mt-3 line-clamp-2 text-base font-extrabold">
          {noteTitle || 'Aucune note ouverte'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-[20px] bg-white/[0.075] p-3">
          <p className="text-[13px] font-semibold text-[color:var(--text-secondary)]">Mots</p>
          <p className="mt-1 font-extrabold">{noteWordCount}</p>
        </div>
        <div className="rounded-[20px] bg-white/[0.075] p-3">
          <p className="text-[13px] font-semibold text-[color:var(--text-secondary)]">Pieces</p>
          <p className="mt-1 font-extrabold">{attachmentsCount}</p>
        </div>
        </div>
        <p className="mt-4 line-clamp-6 text-[13px] font-medium leading-6 text-[color:var(--text-secondary)]">
          {notePreview || 'Dexter peut aussi creer une note depuis une demande libre.'}
        </p>
      </CardContent>
    </Card>
  );
}

export function AIQuickActionButton({ action, active, disabled, onClick }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      className="group h-auto w-full justify-between rounded-[20px] px-4 py-3 text-left disabled:cursor-not-allowed"
    >
      <span>
        <span className="block text-sm font-extrabold">{action.label}</span>
        <span className="mt-0.5 block text-xs text-[color:var(--text-secondary)]">{action.description}</span>
      </span>
      {active ? (
        <IconStop className="h-4 w-4 text-[color:var(--accent)]" />
      ) : (
        <IconPen className="h-4 w-4 text-[color:var(--text-secondary)] transition group-hover:text-[color:var(--accent)]" />
      )}
    </Button>
  );
}

export function AIWorkspaceHeader({ isThinking, onStop, onClose }) {
  return (
    <header className="flex min-h-[66px] items-center justify-between border-b border-white/10 px-5 sm:px-6">
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--accent)] lg:hidden">Assistant</p>
        <h2 className="truncate text-xl font-extrabold tracking-[-0.015em] sm:text-[23px]">
          Espace Dexter
        </h2>
      </div>
      <div className="flex items-center gap-2">
        {isThinking && (
          <Button
            type="button"
            onClick={onStop}
            variant="outline"
            className="border-red-400/20 bg-red-500/12 text-red-200 hover:bg-red-500/18"
          >
            Arreter
          </Button>
        )}
        <Button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fenetre Dexter"
          title="Fermer Dexter"
          variant="outline"
          size="icon"
          className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] lg:hidden"
        >
          <IconClose className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

export function AIConversationViewport({ children }) {
  return (
    <ScrollArea className="flex-1 px-5 py-5 sm:px-6">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
        {children}
      </div>
    </ScrollArea>
  );
}

export function AIMessageRow({ children, role, shouldReduceMotion, itemKey }) {
  return (
    <motion.div
      key={itemKey}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
      animate={{ opacity: 1, transform: 'translateY(0)' }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {children}
    </motion.div>
  );
}

export function AIStarterPrompts({ prompts, onPrompt }) {
  if (!prompts?.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {prompts.map(prompt => (
        <Button
          key={prompt.id}
          type="button"
          onClick={() => onPrompt(prompt)}
          variant="outline"
          className="h-auto min-h-[92px] flex-col items-start justify-start whitespace-normal rounded-[22px] p-4 text-left"
        >
          <span className="block w-full truncate text-sm font-extrabold text-[color:var(--text-primary)]">{prompt.title}</span>
          <span className="mt-2 block text-xs font-semibold leading-5 text-[color:var(--text-secondary)]">
            {prompt.description}
          </span>
        </Button>
      ))}
    </div>
  );
}

export function AIMessageBubble({ message, html }) {
  if (message.type === 'action_create') {
    return <AIStatusBubble tone="success" text={`Note "${message.data?.title || 'Nouvelle note'}" creee.`} />;
  }

  if (message.type === 'action_update') {
    return <AIStatusBubble tone="success" text="Note mise a jour." />;
  }

  if (message.type === 'action_delete_done') {
    return <AIStatusBubble tone="danger" text="Note supprimee." />;
  }

  if (message.type === 'action_denied') {
    return <AIStatusBubble text="Action ignoree." />;
  }

  const isUser = message.role === 'user';

  return (
    <div className={`max-w-[min(640px,88%)] rounded-[24px] border px-4 py-3 text-[14px] font-medium leading-6 shadow-sm ${
      isUser
        ? 'border-transparent bg-[color:var(--accent)] text-white shadow-[0_12px_30px_rgba(10,132,255,.22)]'
        : 'border-white/10 bg-white/[0.08] text-[color:var(--text-primary)] backdrop-blur-xl'
    }`}>
      <div
        className="dexter-markdown space-y-2"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export function AIStatusBubble({ text, tone = 'neutral' }) {
  const toneClass = tone === 'success'
    ? 'border-green-400/20 bg-green-500/10 text-green-200'
    : tone === 'danger'
      ? 'border-red-400/20 bg-red-500/10 text-red-200'
      : 'border-white/10 bg-white/[0.07] text-[color:var(--text-secondary)]';

  return (
    <div className={`rounded-[20px] border px-4 py-3 text-sm font-extrabold ${toneClass}`}>
      {text}
    </div>
  );
}

export function AIActionCard({ message, index, onAccept, onDeny, onChange }) {
  const data = message.data || {};
  const isCreate = data.action === 'create' || data.action === 'create_note';
  const isUpdate = data.action === 'update';
  const isDelete = data.action === 'delete';

  return (
    <Card className="w-full border-[color:var(--accent)]/28 bg-[color:var(--accent)]/9 shadow-[0_18px_55px_rgba(0,0,0,.22)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          {isDelete ? <IconTrash className="h-4 w-4 text-red-300" /> : <IconPen className="h-4 w-4 text-[color:var(--accent)]" />}
          <span className="text-sm font-extrabold">
            {isCreate ? 'Nouvelle note' : isUpdate ? 'Modification de note' : 'Suppression'}
          </span>
        </div>
        <Badge variant="secondary" className="text-[11px] text-[color:var(--text-secondary)]">
          validation requise
        </Badge>
      </div>

      <div className="space-y-4 p-4">
        {(isCreate || isUpdate) && (
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[color:var(--text-secondary)]">Titre</span>
            <input
              type="text"
              value={data.title || ''}
              onChange={(event) => onChange(index, { title: event.target.value })}
              className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/24 px-4 py-3 text-sm font-extrabold text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]/60"
            />
          </label>
        )}

        {isDelete ? (
          <p className="text-sm font-semibold leading-6 text-[color:var(--text-secondary)]">
            Supprimer la note <span className="font-extrabold text-[color:var(--text-primary)]">"{data.title || 'active'}"</span> ?
          </p>
        ) : (
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[color:var(--text-secondary)]">Contenu</span>
            <Textarea
              value={data.content || ''}
              onChange={(event) => onChange(index, { content: event.target.value })}
              rows={10}
              className="mt-2 w-full resize-y rounded-[18px] border border-white/10 bg-black/24 px-4 py-3 font-mono text-xs leading-5 text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]/60"
            />
          </label>
        )}
      </div>

      <div className="flex gap-3 border-t border-white/10 p-4">
        <Button
          type="button"
          onClick={() => onDeny(index)}
          variant="outline"
          className="flex-1 text-[color:var(--text-secondary)]"
        >
          Ignorer
        </Button>
        <Button
          type="button"
          onClick={() => onAccept(index, message)}
          className="flex-1"
        >
          Appliquer
        </Button>
      </div>
    </Card>
  );
}

export function AIThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-[color:var(--text-secondary)]">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--accent)]" />
      Dexter travaille...
    </div>
  );
}

export function AIComposer({ inputRef, value, isThinking, onChange, onSend, onStop }) {
  return (
    <footer className="border-t border-white/10 bg-white/[0.035] px-4 py-3 sm:px-5">
      <div className="mx-auto flex w-full max-w-[760px] items-center gap-2.5 rounded-[22px] border border-white/14 bg-[#0d1016]/86 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_10px_28px_rgba(0,0,0,.16)] backdrop-blur-2xl">
        <AILight active={isThinking} className="ml-1 hidden h-7 w-7 sm:inline-flex" />
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Posez une question ou demandez une correction..."
          aria-label="Message pour Dexter"
          rows={1}
          className="min-h-[38px] flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-sm leading-5 shadow-none focus:border-0"
        />
        <Button
          type="button"
          onClick={isThinking ? onStop : onSend}
          disabled={!isThinking && !value.trim()}
          aria-label={isThinking ? 'Arreter Dexter' : 'Envoyer a Dexter'}
          size="icon"
          className="h-9 w-9"
        >
          {isThinking ? <IconStop className="h-4 w-4" /> : <IconSend className="h-4 w-4" />}
        </Button>
      </div>
    </footer>
  );
}

export function AIFunctionsPanel() {
  return (
    <aside className="hidden w-[320px] shrink-0 border-l border-white/10 bg-white/[0.035] p-5 xl:block">
      <h3 className="text-base font-extrabold">Sortie applicable</h3>
      <p className="mt-2 text-[13px] font-medium leading-6 text-[color:var(--text-secondary)]">
        Les cartes de modification restent modifiables avant validation. Rien n'est applique sans clic sur Appliquer.
      </p>

      <Card className="mt-5 rounded-[24px] bg-black/18 p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--text-secondary)]">Fonctions</p>
        <ul className="mt-4 space-y-3 text-sm font-semibold text-[color:var(--text-secondary)]">
          <li className="flex items-center gap-2"><IconCheck className="h-4 w-4 text-[color:var(--success)]" /> Corriger et remplacer la note</li>
          <li className="flex items-center gap-2"><IconCheck className="h-4 w-4 text-[color:var(--success)]" /> Creer une nouvelle note</li>
          <li className="flex items-center gap-2"><IconCheck className="h-4 w-4 text-[color:var(--success)]" /> Extraire un resume ou des taches</li>
          <li className="flex items-center gap-2"><IconCheck className="h-4 w-4 text-[color:var(--success)]" /> Annuler une generation en cours</li>
        </ul>
      </Card>
    </aside>
  );
}
