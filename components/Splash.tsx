import React from 'react';
import Icon from './ui/Icon';

const Splash: React.FC<{ label?: string }> = ({ label = 'Loading RoofConnect...' }) => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="relative">
            <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
                <Icon name="roofing" className="text-primary" size={48} />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary animate-ping" />
        </div>
        <p className="mt-8 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
);

export default Splash;
