import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastType = 'info' | 'success' | 'error' | 'loading';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  message: string;
  duration?: number; // ms, ignored for loading until updated/dismissed
}

interface Toast extends Required<Omit<ToastOptions, 'duration'>> {
  duration: number;
}

interface ToastContextValue {
  show: (opts: ToastOptions) => string; // returns id
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  loading: (message: string) => string; // persists until update/dismiss
  update: (id: string, opts: Partial<ToastOptions>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const genId = () => Math.random().toString(36).slice(2);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((opts: ToastOptions) => {
    const id = opts.id || genId();
    const type = opts.type || 'info';
    const duration = opts.duration ?? (type === 'loading' ? 0 : 2500);
    const toast: Toast = { id, type, message: opts.message, duration };
    setToasts((prev) => [...prev, toast]);
    if (duration > 0) {
      window.setTimeout(() => remove(id), duration);
    }
    return id;
  }, [remove]);

  const update = useCallback((id: string, opts: Partial<ToastOptions>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...opts, type: (opts.type || t.type) as ToastType, message: opts.message ?? t.message, duration: opts.duration ?? t.duration } : t)));
    // If duration transitioned from 0 to >0, schedule removal
    if (opts.duration && opts.duration > 0) {
      window.setTimeout(() => remove(id), opts.duration);
    }
  }, [remove]);

  const dismiss = useCallback((id: string) => remove(id), [remove]);

  const value = useMemo<ToastContextValue>(() => ({
    show,
    success: (message: string, duration?: number) => show({ type: 'success', message, duration }),
    error: (message: string, duration?: number) => show({ type: 'error', message, duration }),
    info: (message: string, duration?: number) => show({ type: 'info', message, duration }),
    loading: (message: string) => show({ type: 'loading', message, duration: 0 }),
    update,
    dismiss,
  }), [show, update, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

const iconFor = (type: ToastType) => {
  if (type === 'success') return '✓';
  if (type === 'error') return '✕';
  if (type === 'loading') return '⏳';
  return 'ℹ';
};

export const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          minWidth: 280,
          maxWidth: 360,
          padding: '10px 12px',
          borderRadius: 8,
          color: '#0f172a',
          background: t.type === 'success' ? '#dcfce7' : t.type === 'error' ? '#fee2e2' : t.type === 'loading' ? '#e0e7ff' : '#f1f5f9',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 4px 14px rgba(15,23,42,0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{iconFor(t.type)}</span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t.message}</div>
            <button onClick={() => onDismiss(t.id)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569' }}>✖</button>
          </div>
        </div>
      ))}
    </div>
  );
};
