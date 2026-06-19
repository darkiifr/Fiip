import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface ToastContextValue {
  toast: (opts: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ─── Config per variant ───────────────────────────────────────────────────────
const variantConfig: Record<ToastVariant, { icon: React.ReactNode; accent: string }> = {
  default: {
    icon: null,
    accent: 'border-white/[0.08]',
  },
  success: {
    icon: <CheckCircle2 size={16} className="text-green-400 shrink-0" />,
    accent: 'border-green-500/20',
  },
  error: {
    icon: <XCircle size={16} className="text-red-400 shrink-0" />,
    accent: 'border-red-500/20',
  },
  warning: {
    icon: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
    accent: 'border-amber-500/20',
  },
  info: {
    icon: <Info size={16} className="text-blue-400 shrink-0" />,
    accent: 'border-blue-500/20',
  },
};

// ─── Single Toast ─────────────────────────────────────────────────────────────
function Toast({ toast: t, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 350);
  }, [onDismiss]);

  useEffect(() => {
    // Enter
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss
    const duration = t.duration ?? 4500;
    timerRef.current = setTimeout(dismiss, duration);
    return () => clearTimeout(timerRef.current);
  }, [dismiss, t.duration]);

  const config = variantConfig[t.variant ?? 'default'];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'relative w-full max-w-sm overflow-hidden rounded-2xl',
        /* Liquid Glass */
        'bg-[rgba(28,28,30,0.80)] backdrop-blur-2xl',
        'border',
        config.accent,
        'shadow-[0_0_0_0.5px_rgba(255,255,255,0.10)_inset,0_12px_40px_-8px_rgba(0,0,0,0.6)]',
        'transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        visible && !exiting
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-3 opacity-0 scale-[0.97]'
      )}
    >
      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />

      <div className="flex items-start gap-3 p-4 pr-10">
        {config.icon}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white leading-tight">{t.title}</div>
          {t.description && (
            <div className="text-[12px] text-white/50 mt-0.5 leading-relaxed">{t.description}</div>
          )}
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); dismiss(); }}
              className="mt-2 text-[12px] font-semibold text-blue-400 hover:text-blue-300 transition-colors outline-none focus-visible:underline"
            >
              {t.action.label}
            </button>
          )}
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Fermer la notification"
        className="absolute right-3 top-3 p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-all outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
      >
        <X size={13} />
      </button>

      {/* Progress bar */}
      <div className="h-[2px] bg-white/[0.04] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500/60 to-blue-400/40"
          style={{ animation: `toast-progress ${t.duration ?? 4500}ms linear forwards` }}
        />
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((opts: Omit<ToastItem, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...opts, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {createPortal(
        <div
          className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
          aria-label="Notifications"
        >
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast toast={t} onDismiss={() => dismiss(t.id)} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
