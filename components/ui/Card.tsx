import React from 'react';
import Icon from './Icon';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    interactive?: boolean;
    onClick?: () => void;
}

const paddingMap = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    padding = 'md',
    interactive,
    onClick,
}) => (
    <div
        onClick={onClick}
        className={[
            'bg-white dark:bg-[#1a1d21] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm',
            paddingMap[padding],
            interactive ? 'cursor-pointer hover:shadow-md hover:border-primary/40 transition-all' : '',
            className,
        ].filter(Boolean).join(' ')}
    >
        {children}
    </div>
);

interface CardHeaderProps {
    title: string;
    icon?: string;
    iconColor?: string;
    actions?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, icon, iconColor = 'text-primary', actions }) => (
    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {icon && <Icon name={icon} className={iconColor} />}
            {title}
        </h2>
        {actions}
    </div>
);

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: string;
    iconColor?: string;
    trend?: { value: string; positive?: boolean };
    hint?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, iconColor = 'text-primary', trend, hint }) => (
    <Card className="relative overflow-hidden group" padding="md">
        {icon && (
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon name={icon} size={40} className={iconColor} />
            </div>
        )}
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
        {trend && (
            <div className={`mt-2 text-xs font-bold flex items-center gap-1 ${trend.positive ? 'text-green-600' : 'text-slate-400'}`}>
                {trend.positive && <Icon name="trending_up" size={16} />}
                {trend.value}
            </div>
        )}
        {hint && !trend && <p className="mt-2 text-xs font-medium text-slate-400">{hint}</p>}
    </Card>
);

export default Card;
