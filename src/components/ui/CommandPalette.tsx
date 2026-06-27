import React, { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useButton, useFocusRing } from 'react-aria';
import { Search, CircleDot, Sparkles, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  group?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  items: CommandItem[];
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
}

// ─── Shortcut display ────────────────────────────────────────────────────────
function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[9px] font-bold font-mono bg-black/[0.035] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-warm-text-muted-light dark:text-warm-text-muted-dark">
      {children}
    </kbd>
  );
}

// ─── Command Item Row ─────────────────────────────────────────────────────────
function CommandRow({
  item,
  isActive,
  onSelect,
}: {
  item: CommandItem;
  isActive: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton({ onPress: onSelect }, ref);
  const { focusProps } = useFocusRing();

  useEffect(() => {
    if (isActive && ref.current?.scrollIntoView) {
      ref.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isActive]);

  return (
    <button
      ref={ref}
      {...buttonProps}
      {...focusProps}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-150',
        'text-left outline-none cursor-default',
        isActive
          ? 'bg-white/90 dark:bg-white/[0.10] shadow-sm border border-amber-500/24'
          : 'hover:bg-black/[0.035] dark:hover:bg-white/[0.07] border border-transparent'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-2xl shrink-0 transition-colors',
        'bg-black/[0.035] dark:bg-white/[0.06] border border-black/10 dark:border-white/10',
        isActive && 'bg-amber-500/12 border-amber-500/25 text-amber-700 dark:text-amber-300'
      )}>
        {item.icon ?? <CircleDot size={14} className="text-warm-text-muted-light" />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-[13px] font-semibold leading-tight truncate text-warm-text-primary-light dark:text-warm-text-primary-dark',
          isActive && 'font-bold'
        )}>
          {item.label}
        </div>
        {item.description && (
          <div className="text-[11px] text-warm-text-muted-light dark:text-warm-text-muted-dark mt-0.5 truncate">{item.description}</div>
        )}
      </div>

      {/* Shortcut */}
      {item.shortcut && (
        <div className="flex items-center gap-1 shrink-0">
          {item.shortcut.map((k, i) => <Key key={i}>{k}</Key>)}
        </div>
      )}
    </button>
  );
}

// ─── Main CommandPalette ──────────────────────────────────────────────────────
export function CommandPalette({
  items,
  isOpen,
  onClose,
  placeholder = 'Rechercher une action…',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Group items
  const filtered = items.filter(
    (i) =>
      i.label.toLowerCase().includes(query.toLowerCase()) ||
      i.description?.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    const g = item.group ?? 'Actions';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const flat = Object.values(grouped).flat();

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flat[activeIndex]) {
          flat[activeIndex].onSelect();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [flat, activeIndex, onClose]
  );

  if (!isOpen) return null;

  let flatIndex = -1;

  const content = (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[13vh]"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Palette de commandes"
    >
      {/* Background Dim */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-md animate-in fade-in duration-200" />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full max-w-[620px] mx-4 rounded-[28px] overflow-hidden transition-all select-none',
          /* Warm Editorial Glass */
          'bg-[#fbfaf6]/92 dark:bg-[#171715]/90 backdrop-blur-3xl text-warm-text-primary-light dark:text-warm-text-primary-dark',
          'border border-black/10 dark:border-white/10',
          'shadow-[0_28px_90px_rgba(0,0,0,0.24)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.55)]',
          'animate-in fade-in-0 zoom-in-[0.98] slide-in-from-top-4 duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/10 dark:border-white/10 bg-white/45 dark:bg-white/[0.035]">
          <Search size={16} className="text-amber-600 dark:text-amber-300 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[14px] text-warm-text-primary-light placeholder:text-warm-text-muted-light/60 outline-none font-semibold dark:text-warm-text-primary-dark dark:placeholder:text-warm-text-muted-dark/60"
            aria-label="Recherche"
            aria-autocomplete="list"
            aria-activedescendant={flat[activeIndex] ? `cmd-item-${flat[activeIndex].id}` : undefined}
          />
          <button type="button" onClick={onClose} className="rounded-full border border-black/10 dark:border-white/10 px-2 py-1 text-[10px] font-bold text-warm-text-muted-light dark:text-warm-text-muted-dark hover:bg-black/[0.04] dark:hover:bg-white/[0.07]">
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto p-2.5 scrollbar-hide" role="listbox">
          {flat.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles size={20} className="mx-auto text-warm-text-muted-light/40 mb-3" />
              <p className="text-xs text-warm-text-muted-light">Aucun résultat pour "{query}"</p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group} className="mb-3 last:mb-0">
                <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-warm-text-muted-light/65 dark:text-warm-text-muted-dark/55 mb-1">
                  {group}
                </div>
                {groupItems.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <CommandRow
                      key={item.id}
                      item={item}
                      isActive={activeIndex === idx}
                      onSelect={() => { item.onSelect(); onClose(); }}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        {flat.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-black/10 dark:border-white/10 bg-white/25 dark:bg-white/[0.025] text-[10px] text-warm-text-muted-light dark:text-warm-text-muted-dark font-bold">
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5"><Key><ArrowUp size={8} /></Key><Key><ArrowDown size={8} /></Key></div>
              Naviguer
            </div>
            <div className="flex items-center gap-1">
              <Key><CornerDownLeft size={8} /></Key>
              Ouvrir
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Key>Ctrl</Key><Key>K</Key>
              Rechercher
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── Hook helper ─────────────────────────────────────────────────────────────
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}
