import React from 'react';
import Icon from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    icon?: string;
    iconRight?: string;
    isLoading?: boolean;
    fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
    primary: 'bg-primary hover:bg-primary-dark text-white focus:ring-primary/30 shadow-sm',
    secondary: 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 focus:ring-slate-400/30',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-slate-400/30',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/30 shadow-sm',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500/30 shadow-sm',
};

const sizeStyles: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
};

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    isLoading,
    fullWidth,
    disabled,
    children,
    className = '',
    ...rest
}) => {
    return (
        <button
            disabled={disabled || isLoading}
            className={[
                'inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-all',
                'focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed',
                'active:scale-[0.98]',
                variantStyles[variant],
                sizeStyles[size],
                fullWidth ? 'w-full' : '',
                className,
            ].filter(Boolean).join(' ')}
            {...rest}
        >
            {isLoading ? (
                <Icon name="refresh" className="animate-spin" size={18} />
            ) : icon ? (
                <Icon name={icon} size={18} />
            ) : null}
            {children && <span>{children}</span>}
            {!isLoading && iconRight && <Icon name={iconRight} size={18} />}
        </button>
    );
};

export default Button;
