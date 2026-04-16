import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SidebarProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import Icon from './ui/Icon';

interface NavLinkProps {
    to: string;
    icon: string;
    label: string;
    active: boolean;
    badge?: number | null;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, label, active, badge }) => (
    <Link
        to={to}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
            active
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
        }`}
    >
        <Icon name={icon} size={20} />
        <span className="text-sm">{label}</span>
        {!active && badge && badge > 0 ? (
            <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
        ) : null}
    </Link>
);

const Sidebar: React.FC<SidebarProps> = ({ active }) => {
    const { t } = useLanguage();
    const { user, isAdmin, logout } = useAuth();
    const { theme, toggle } = useTheme();
    const confirm = useConfirm();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [callbackCount, setCallbackCount] = useState(0);

    const fetchCallbackCount = useCallback(async () => {
        if (!user) return;
        let query = supabase
            .from('callbacks')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'Pending');
        if (!isAdmin) query = query.eq('user_id', user.id);
        const { count, error } = await query;
        if (!error && count !== null) setCallbackCount(count);
    }, [user, isAdmin]);

    useEffect(() => {
        fetchCallbackCount();
        if (!user) return;
        const channel = supabase
            .channel(`sidebar-callbacks-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'callbacks' }, () => fetchCallbackCount())
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isAdmin, fetchCallbackCount]);

    const handleLogout = async () => {
        const ok = await confirm({
            title: 'Log out?',
            message: 'You will need to sign in again to access the CRM.',
            confirmText: 'Log out',
            variant: 'danger',
            icon: 'logout',
        });
        if (!ok) return;
        await logout();
        toast.info('You have been signed out.');
        navigate('/');
    };

    return (
        <aside className="w-64 bg-white dark:bg-[#1a1d21] border-r border-slate-200 dark:border-slate-700 flex-shrink-0 flex flex-col h-full z-20 hidden lg:flex">
            <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                    <Icon name="roofing" />
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">{t('app.name')}</h1>
                    <p className="text-xs text-slate-500 font-medium">{t('app.subtitle')}</p>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
                <NavLink to="/dashboard" icon="dashboard" label={t('nav.dashboard')} active={active === 'dashboard'} />
                <NavLink to="/script" icon="description" label={t('nav.script')} active={active === 'script'} />
                <NavLink to="/appointment" icon="calendar_add_on" label={t('nav.appt')} active={active === 'appt'} />
                <NavLink to="/schedule" icon="calendar_month" label={t('nav.calendar')} active={active === 'schedule'} />
                <NavLink to="/callbacks" icon="phone_callback" label={t('nav.callbacks')} active={active === 'callbacks'} badge={callbackCount} />
                <NavLink to="/registry" icon="groups" label={t('nav.registry')} active={active === 'registry'} />

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('nav.system')}</p>
                    <NavLink to="/settings" icon="settings" label={t('nav.settings')} active={active === 'settings'} />
                    <button
                        type="button"
                        onClick={toggle}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
                        <span className="text-sm">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                        <Icon name="logout" size={20} />
                        <span className="text-sm">{t('nav.logout')}</span>
                    </button>
                </div>
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <Link
                    to="/profile"
                    className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors group"
                >
                    <div className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-white dark:border-slate-600 shadow-sm overflow-hidden bg-slate-200">
                        <img
                            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}`}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                            {user?.name || 'User'}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <p className="text-xs text-slate-500 truncate">{t('user.online')}</p>
                        </div>
                    </div>
                </Link>
            </div>
        </aside>
    );
};

export default Sidebar;
