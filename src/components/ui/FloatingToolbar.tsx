import React, { useEffect, useRef, useState } from 'react';
import { useButton, useFocusRing } from 'react-aria';
import { Bold, Italic, Underline, Strikethrough, Link, AlignLeft, AlignCenter, AlignRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FloatingToolbarAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  onPress: () => void;
  separator?: boolean; // insert a separator BEFORE this item
}

interface FloatingToolbarProps {
  actions?: FloatingToolbarAction[];
  position?: { x: number; y: number } | null;
  isVisible: boolean;
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolbarButton({
  action,
}: {
  action: FloatingToolbarAction;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps, isPressed } = useButton(
    { onPress: action.onPress, 'aria-label': action.label },
    ref
  );
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <button
      ref={ref}
      {...buttonProps}
      {...focusProps}
      title={action.label}
      className={cn(
        'relative flex items-center justify-center w-7 h-7 rounded-lg',
        'text-[13px] font-medium outline-none cursor-default',
        'transition-all duration-100',
        action.isActive
          ? 'text-blue-400 bg-blue-500/15'
          : 'text-white/70 hover:text-white hover:bg-white/[0.10]',
        isPressed && 'scale-90 opacity-80',
        isFocusVisible && 'ring-1 ring-blue-500'
      )}
    >
      {action.icon}
    </button>
  );
}

// ─── Default actions ──────────────────────────────────────────────────────────
export const defaultFloatingActions: FloatingToolbarAction[] = [
  { id: 'bold', icon: <Bold size={13} strokeWidth={2.5} />, label: 'Gras', shortcut: '⌘B', onPress: () => document.execCommand('bold') },
  { id: 'italic', icon: <Italic size={13} />, label: 'Italique', shortcut: '⌘I', onPress: () => document.execCommand('italic') },
  { id: 'underline', icon: <Underline size={13} />, label: 'Souligné', shortcut: '⌘U', onPress: () => document.execCommand('underline') },
  { id: 'strike', icon: <Strikethrough size={13} />, label: 'Barré', onPress: () => document.execCommand('strikeThrough') },
  { id: 'link', icon: <Link size={13} />, label: 'Lien', separator: true, onPress: () => {} },
  { id: 'left', icon: <AlignLeft size={13} />, label: 'Aligner à gauche', separator: true, onPress: () => document.execCommand('justifyLeft') },
  { id: 'center', icon: <AlignCenter size={13} />, label: 'Centrer', onPress: () => document.execCommand('justifyCenter') },
  { id: 'right', icon: <AlignRight size={13} />, label: 'Aligner à droite', onPress: () => document.execCommand('justifyRight') },
  { id: 'ai', icon: <Sparkles size={13} />, label: 'Action IA', separator: true, onPress: () => {} },
];

// ─── FloatingToolbar ──────────────────────────────────────────────────────────
/**
 * Floating formatting toolbar that appears on text selection.
 * Position is controlled by the parent (use useFloatingToolbar hook).
 * macOS 26 Liquid Glass design with specular highlight.
 */
export function FloatingToolbar({
  actions = defaultFloatingActions,
  position,
  isVisible,
}: FloatingToolbarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isVisible) requestAnimationFrame(() => setMounted(true));
    else setMounted(false);
  }, [isVisible]);

  if (!isVisible || !position) return null;

  return (
    <div
      role="toolbar"
      aria-label="Barre d'outils de formatage"
      style={{ left: position.x, top: position.y - 48 }}
      className={cn(
        'fixed z-[9000] pointer-events-auto',
        'flex items-center gap-0.5 px-2 py-1.5 rounded-2xl',
        /* Liquid Glass */
        'bg-[rgba(28,28,30,0.82)] backdrop-blur-2xl',
        'border border-white/[0.09]',
        'shadow-[0_0_0_0.5px_rgba(255,255,255,0.13)_inset,0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)]',
        /* Entrance spring */
        'transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-1'
      )}
    >
      {/* Top specular line */}
      <div className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.18] to-transparent rounded-full pointer-events-none" />

      {actions.map((action) => (
        <React.Fragment key={action.id}>
          {action.separator && (
            <div className="w-px h-4 bg-white/[0.10] mx-0.5" aria-hidden="true" />
          )}
          <ToolbarButton action={action} />
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useFloatingToolbar — tracks text selection and returns toolbar position.
 *
 * @example
 * const { toolbarProps } = useFloatingToolbar(editorRef);
 * return <FloatingToolbar {...toolbarProps} />;
 */
export function useFloatingToolbar(containerRef: React.RefObject<HTMLElement>) {
  const [state, setState] = useState<{ isVisible: boolean; position: { x: number; y: number } | null }>({
    isVisible: false,
    position: null,
  });

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !containerRef.current) {
        setState({ isVisible: false, position: null });
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Only show if selection is inside the container
      const containerRect = containerRef.current.getBoundingClientRect();
      if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
        setState({ isVisible: false, position: null });
        return;
      }

      setState({
        isVisible: true,
        position: {
          x: rect.left + rect.width / 2 - 120, // ~half toolbar width
          y: rect.top + window.scrollY,
        },
      });
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [containerRef]);

  return { toolbarProps: state };
}
