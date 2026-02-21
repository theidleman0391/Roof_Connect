import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SidebarProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const Sidebar: React.FC<SidebarProps> = ({ active }) => {
    const { t } = useLanguage();
    const { user, isAdmin } = useAuth();
    const [callbackCount, setCallbackCount] = useState(0);

    useEffect(() => {
        const fetchCallbackCount = async () => {
            if (!user) return;

            let query = supabase
                .from('callbacks')
                .select('id', { count: 'exact', head: true });

            if (!isAdmin) {
                query = query.eq('user_id', user.id);
            }

            const { count, error } = await query;

            if (!error && count !== null) {
                setCallbackCount(count);
            }
        };

        fetchCallbackCount();
    }, [user, isAdmin]);

    return (
        <aside className="w-64 bg-white dark:bg-[#1a1d21] border-r border-slate-200 dark:border-slate-700 flex-shrink-0 flex flex-col h-full z-20 hidden lg:flex">
            <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                    <span className="material-symbols-outlined">roofing</span>
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">{t('app.name')}</h1>
                    <p className="text-xs text-slate-500 font-medium">{t('app.subtitle')}</p>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                <Link to="/script" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${active === 'script' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
                    <span className={`material-symbols-outlined text-[20px] ${active === 'script' ? 'font-semibold' : ''}`}>description</span>
                    <span className="text-sm">{t('nav.script')}</span>
                </Link>
                <Link to="/appointment" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${active === 'appt' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                    <span className="text-sm">{t('nav.appt')}</span>
                </Link>
                <Link to="/schedule" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${active === 'schedule' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                    <span className="text-sm">{t('nav.calendar')}</span>
                </Link>
                <Link to="/callbacks" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${active === 'callbacks' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">phone_callback</span>
                    <span className="text-sm">{t('nav.callbacks')}</span>
                    {active !== 'callbacks' && callbackCount > 0 && <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{callbackCount}</span>}
                </Link>
                <Link to="/registry" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${active === 'registry' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
                    <span className="material-symbols-outlined text-[20px]">groups</span>
                    <span className="text-sm">Registry</span>
                </Link>
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('nav.system')}</p>
                    <Link to="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${active === 'settings' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                        <span className="text-sm">{t('nav.settings')}</span>
                    </Link>
                </div>
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <Link to="/profile" className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-white dark:border-slate-600 shadow-sm overflow-hidden bg-slate-200">
                        <img
                            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}`}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{user?.name || 'User'}</p>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <p className="text-xs text-slate-500 truncate">{t('user.online')}</p>
                        </div>
                    </div>
                </Link>
            </div>
        </aside>
    );
};

export default Sidebar;