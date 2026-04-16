import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger';
    icon?: string;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface PendingConfirm extends ConfirmOptions {
    resolve: (v: boolean) => void;
}

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise(resolve => {
            setPending({ ...options, resolve });
        });
    }, []);

    const handleClose = (result: boolean) => {
        pending?.resolve(result);
        setPending(null);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {pending && (
                <div
                    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[slideIn_0.1s_ease-out]"
                    onClick={() => handleClose(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="bg-white dark:bg-[#1a1d21] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 flex gap-4">
                            <div
                                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                                    pending.variant === 'danger'
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                        : 'bg-primary/10 text-primary'
                                }`}
                            >
                                <Icon name={pending.icon || (pending.variant === 'danger' ? 'warning' : 'help')} size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                    {pending.title || 'Are you sure?'}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{pending.message}</p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => handleClose(false)}>
                                {pending.cancelText || 'Cancel'}
                            </Button>
                            <Button
                                variant={pending.variant === 'danger' ? 'danger' : 'primary'}
                                onClick={() => handleClose(true)}
                            >
                                {pending.confirmText || 'Confirm'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx.confirm;
};
