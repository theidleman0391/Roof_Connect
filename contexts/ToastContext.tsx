import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import Icon from '../components/ui/Icon';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    kind: ToastKind;
    title?: string;
    message: string;
    duration: number;
}

interface ToastContextType {
    toast: {
        success: (message: string, title?: string) => void;
        error: (message: string, title?: string) => void;
        info: (message: string, title?: string) => void;
        warning: (message: string, title?: string) => void;
    };
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const kindStyles: Record<ToastKind, { bg: string; icon: string; iconColor: string; border: string }> = {
    success: {
        bg: 'bg-white dark:bg-[#1a1d21]',
        icon: 'check_circle',
        iconColor: 'text-emerald-500',
        border: 'border-l-emerald-500',
    },
    error: {
        bg: 'bg-white dark:bg-[#1a1d21]',
        icon: 'error',
        iconColor: 'text-red-500',
        border: 'border-l-red-500',
    },
    info: {
        bg: 'bg-white dark:bg-[#1a1d21]',
        icon: 'info',
        iconColor: 'text-primary',
        border: 'border-l-primary',
    },
    warning: {
        bg: 'bg-white dark:bg-[#1a1d21]',
        icon: 'warning',
        iconColor: 'text-amber-500',
        border: 'border-l-amber-500',
    },
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const push = useCallback((kind: ToastKind, message: string, title?: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const duration = kind === 'error' ? 6000 : 4000;
        setToasts(prev => [...prev, { id, kind, title, message, duration }]);
        setTimeout(() => dismiss(id), duration);
    }, [dismiss]);

    const toast = {
        success: (m: string, t?: string) => push('success', m, t),
        error: (m: string, t?: string) => push('error', m, t),
        info: (m: string, t?: string) => push('info', m, t),
        warning: (m: string, t?: string) => push('warning', m, t),
    };

    return (
        <ToastContext.Provider value={{ toast, dismiss }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] space-y-2 w-[360px] max-w-[calc(100vw-2rem)] pointer-events-none">
                {toasts.map(t => {
                    const s = kindStyles[t.kind];
                    return (
                        <div
                            key={t.id}
                            role="alert"
                            className={`pointer-events-auto ${s.bg} ${s.border} border-l-4 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 flex items-start gap-3 animate-[slideIn_0.2s_ease-out]`}
                        >
                            <Icon name={s.icon} className={s.iconColor} size={20} />
                            <div className="flex-1 min-w-0">
                                {t.title && <p className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</p>}
                                <p className="text-sm text-slate-600 dark:text-slate-300 break-words">{t.message}</p>
                            </div>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
                                aria-label="Dismiss"
                            >
                                <Icon name="close" size={18} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};
