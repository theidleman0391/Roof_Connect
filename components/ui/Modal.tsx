import React, { useEffect } from 'react';
import Icon from './Icon';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    titleIcon?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children: React.ReactNode;
    footer?: React.ReactNode;
    hideCloseButton?: boolean;
}

const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    titleIcon,
    size = 'md',
    children,
    footer,
    hideCloseButton = false,
}) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = overflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[slideIn_0.1s_ease-out]"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`bg-white dark:bg-[#1a1d21] w-full ${sizeMap[size]} rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]`}
                onClick={(e) => e.stopPropagation()}
            >
                {(title || !hideCloseButton) && (
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        {title && (
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                {titleIcon && <Icon name={titleIcon} className="text-primary" />}
                                {title}
                            </h3>
                        )}
                        {!hideCloseButton && (
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <Icon name="close" />
                            </button>
                        )}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
