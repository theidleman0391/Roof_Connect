import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';

const NotFound: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-6">
        <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-6">
                <Icon name="explore_off" size={44} />
            </div>
            <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-2">404</h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-1">Page not found</p>
            <p className="text-sm text-slate-500 mb-8">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors"
            >
                <Icon name="home" size={18} />
                Back to Dashboard
            </Link>
        </div>
    </div>
);

export default NotFound;
