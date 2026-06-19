import React, { useCallback, useEffect, useRef, useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { useFocusRing } from 'react-aria';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Tag {
  id: string;
  label: string;
  color?: string; // Tailwind bg class e.g. 'bg-blue-500/20'
}

interface TagInputProps {
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

// ─── Tag Pill ─────────────────────────────────────────────────────────────────
function TagPill({
  tag,
  onRemove,
  disabled,
}: {
  tag: Tag;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { isFocusVisible, focusProps } = useFocusRing();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 rounded-lg',
        'text-[12px] font-medium text-white/80',
        tag.color ?? 'bg-white/[0.10] border border-white/[0.08]',
        'transition-all duration-100',
        /* Liquid Glass pill */
        'backdrop-blur-sm shadow-[0_0_0_0.5px_rgba(255,255,255,0.06)_inset]',
      )}
    >
      {tag.label}
      {!disabled && (
        <button
          onClick={onRemove}
          {...focusProps}
          aria-label={`Supprimer le tag ${tag.label}`}
          className={cn(
            'flex items-center justify-center w-4 h-4 rounded-md',
            'text-white/30 hover:text-white hover:bg-white/10',
            'transition-all duration-100 outline-none',
            isFocusVisible && 'ring-1 ring-blue-500'
          )}
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}
    </span>
  );
}

// ─── Suggestion Dropdown ──────────────────────────────────────────────────────
function Suggestions({
  items,
  activeIndex,
  onSelect,
}: {
  items: string[];
  activeIndex: number;
  onSelect: (s: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className={cn(
      'absolute left-0 right-0 top-full mt-2 z-50',
      'rounded-xl overflow-hidden p-1',
      'bg-[rgba(28,28,30,0.85)] backdrop-blur-2xl',
      'border border-white/[0.08]',
      'shadow-[0_0_0_0.5px_rgba(255,255,255,0.10)_inset,0_16px_48px_rgba(0,0,0,0.5)]',
      'animate-in fade-in-0 zoom-in-[0.98] duration-150'
    )}>
      {items.map((s, i) => (
        <button
          key={s}
          onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
          className={cn(
            'w-full text-left px-3 py-2 rounded-[8px] text-[13px] font-medium',
            'outline-none transition-colors duration-75',
            i === activeIndex
              ? 'bg-white/[0.12] text-white'
              : 'text-white/60 hover:bg-white/[0.07] hover:text-white/90'
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Main TagInput ────────────────────────────────────────────────────────────
export function TagInput({
  tags,
  onTagsChange,
  suggestions = [],
  placeholder = 'Ajouter un tag…',
  maxTags,
  disabled = false,
  className,
  'aria-label': ariaLabel = 'Saisie de tags',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.some((t) => t.label.toLowerCase() === s.toLowerCase())
  );

  const addTag = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      if (tags.some((t) => t.label.toLowerCase() === trimmed.toLowerCase())) return;
      if (maxTags && tags.length >= maxTags) return;

      onTagsChange([...tags, { id: `tag-${Date.now()}`, label: trimmed }]);
      setInputValue('');
      setSuggestionIndex(-1);
    },
    [tags, onTagsChange, maxTags]
  );

  const removeTag = useCallback(
    (id: string) => {
      onTagsChange(tags.filter((t) => t.id !== id));
    },
    [tags, onTagsChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (suggestionIndex >= 0 && filteredSuggestions[suggestionIndex]) {
        addTag(filteredSuggestions[suggestionIndex]);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1].id);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex((i) => Math.min(i + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setSuggestionIndex(-1);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const atMax = maxTags !== undefined && tags.length >= maxTags;

  return (
    <div className={cn('relative', className)}>
      <div
        role="group"
        aria-label={ariaLabel}
        onClick={() => !disabled && inputRef.current?.focus()}
        className={cn(
          'flex flex-wrap gap-1.5 items-center min-h-[40px] w-full',
          'px-3 py-2 rounded-xl cursor-text',
          /* Liquid Glass input */
          'bg-white/[0.05] border border-white/[0.08]',
          'backdrop-blur-sm',
          'shadow-[0_0_0_0.5px_rgba(255,255,255,0.05)_inset]',
          'transition-all duration-150',
          isFocused && 'border-blue-500/50 bg-white/[0.07]',
          isFocused && 'shadow-[0_0_0_0.5px_rgba(255,255,255,0.05)_inset,0_0_0_3px_rgba(59,130,246,0.2)]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {tags.map((tag) => (
          <TagPill key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} disabled={disabled} />
        ))}

        {!atMax && !disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setSuggestionIndex(-1); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setTimeout(() => setIsFocused(false), 150); }}
            placeholder={tags.length === 0 ? placeholder : ''}
            aria-label="Saisir un tag"
            aria-autocomplete="list"
            className="flex-1 min-w-[80px] bg-transparent text-[13px] text-white placeholder:text-white/20 outline-none"
          />
        )}

        {atMax && (
          <span className="text-[11px] text-white/25 ml-1">Max {maxTags} tags</span>
        )}
      </div>

      {/* Suggestions */}
      {isFocused && inputValue.length > 0 && (
        <Suggestions
          items={filteredSuggestions}
          activeIndex={suggestionIndex}
          onSelect={addTag}
        />
      )}
    </div>
  );
}
