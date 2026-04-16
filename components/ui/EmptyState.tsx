import React from 'react';
import Icon from './Icon';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'inbox', title, description, action, className = '' }) => (
    <div className={`text-center text-slate-400 py-16 px-4 ${className}`.trim()}>
        <Icon name={icon} size={72} className="opacity-20 mb-4" />
        <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-1">{title}</h3>
        {description && <p className="text-sm max-w-sm mx-auto mb-6">{description}</p>}
        {action && <div className="mt-2 inline-flex">{action}</div>}
    </div>
);

export default EmptyState;
