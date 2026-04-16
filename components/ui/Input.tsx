import React, { forwardRef, useState } from 'react';
import Icon from './Icon';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: string;
    error?: string;
    hint?: string;
    toggleVisibility?: boolean;
    containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    icon,
    error,
    hint,
    toggleVisibility,
    containerClassName = '',
    className = '',
    type = 'text',
    id,
    ...rest
}, ref) => {
    const [show, setShow] = useState(false);
    const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    const effectiveType = toggleVisibility ? (show ? 'text' : 'password') : type;

    return (
        <div className={`space-y-1 ${containerClassName}`}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon name={icon} className="text-slate-400" size={20} />
                    </div>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    type={effectiveType}
                    className={[
                        'block w-full py-2.5 rounded-lg text-sm transition-all',
                        'border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400',
                        error
                            ? 'border-red-400 focus:ring-2 focus:ring-red-400 focus:border-red-400'
                            : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-primary focus:border-primary',
                        icon ? 'pl-10' : 'pl-3',
                        toggleVisibility ? 'pr-10' : 'pr-3',
                        className,
                    ].filter(Boolean).join(' ')}
                    {...rest}
                />
                {toggleVisibility && (
                    <button
                        type="button"
                        onClick={() => setShow(s => !s)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        tabIndex={-1}
                        aria-label={show ? 'Hide password' : 'Show password'}
                    >
                        <Icon name={show ? 'visibility_off' : 'visibility'} size={20} />
                    </button>
                )}
            </div>
            {error ? (
                <p className="text-xs text-red-500">{error}</p>
            ) : hint ? (
                <p className="text-xs text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;
