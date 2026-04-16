import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Icon from './ui/Icon';

interface SearchResult {
    id: string;
    title: string;
    subtitle?: string;
    category: 'Customer' | 'Callback' | 'Page';
    icon: string;
    to: string;
}

const STATIC_PAGES: SearchResult[] = [
    { id: 'p-dashboard', title: 'Dashboard', category: 'Page', icon: 'dashboard', to: '/dashboard' },
    { id: 'p-script', title: 'Active Script', category: 'Page', icon: 'description', to: '/script' },
    { id: 'p-appt', title: 'Appointment Maker', category: 'Page', icon: 'calendar_add_on', to: '/appointment' },
    { id: 'p-schedule', title: 'Calendar', category: 'Page', icon: 'calendar_month', to: '/schedule' },
    { id: 'p-callbacks', title: 'Callbacks', category: 'Page', icon: 'phone_callback', to: '/callbacks' },
    { id: 'p-registry', title: 'Customer Registry', category: 'Page', icon: 'groups', to: '/registry' },
    { id: 'p-settings', title: 'Settings', category: 'Page', icon: 'settings', to: '/settings' },
    { id: 'p-profile', title: 'Profile', category: 'Page', icon: 'account_circle', to: '/profile' },
];

const GlobalSearch: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [highlight, setHighlight] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen(o => !o);
            } else if (e.key === 'Escape' && open) {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery('');
            setHighlight(0);
        }
    }, [open]);

    const pageResults = useMemo(() => {
        if (!query) return STATIC_PAGES;
        const q = query.toLowerCase();
        return STATIC_PAGES.filter(p => p.title.toLowerCase().includes(q));
    }, [query]);

    useEffect(() => {
        if (!open || !user) return;
        if (!query || query.length < 2) {
            setResults(pageResults);
            return;
        }

        let cancelled = false;
        const run = async () => {
            setLoading(true);
            try {
                const [customersRes, callbacksRes] = await Promise.all([
                    supabase
                        .from('customers')
                        .select('id,name,phone,email')
                        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
                        .limit(5),
                    isAdmin
                        ? supabase.from('callbacks').select('id,name,phone,date').or(`name.ilike.%${query}%,phone.ilike.%${query}%`).limit(5)
                        : supabase.from('callbacks').select('id,name,phone,date').eq('user_id', user.id).or(`name.ilike.%${query}%,phone.ilike.%${query}%`).limit(5),
                ]);

                if (cancelled) return;

                const customerResults: SearchResult[] = (customersRes.data || []).map((c: any) => ({
                    id: `c-${c.id}`,
                    title: c.name,
                    subtitle: c.phone || c.email || '',
                    category: 'Customer',
                    icon: 'person',
                    to: '/registry',
                }));
                const callbackResults: SearchResult[] = (callbacksRes.data || []).map((cb: any) => ({
                    id: `cb-${cb.id}`,
                    title: cb.name,
                    subtitle: `${cb.phone} · ${new Date(cb.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
                    category: 'Callback',
                    icon: 'phone_callback',
                    to: '/callbacks',
                }));

                setResults([...pageResults, ...customerResults, ...callbackResults]);
                setHighlight(0);
            } catch (e) {
                console.error('Global search failed:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        const debounce = setTimeout(run, 200);
        return () => {
            cancelled = true;
            clearTimeout(debounce);
        };
    }, [query, open, user, isAdmin, pageResults]);

    const go = (r: SearchResult) => {
        setOpen(false);
        navigate(r.to);
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight(h => Math.min(h + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight(h => Math.max(h - 1, 0));
        } else if (e.key === 'Enter' && results[highlight]) {
            e.preventDefault();
            go(results[highlight]);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 backdrop-blur-sm pt-24 px-4 animate-[slideIn_0.15s_ease-out]"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="w-full max-w-2xl bg-white dark:bg-[#1a1d21] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <Icon name="search" className="text-slate-400" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Search customers, callbacks, or pages..."
                        className="flex-1 bg-transparent border-none outline-none text-base text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0"
                    />
                    {loading && <Icon name="refresh" className="animate-spin text-slate-400" size={18} />}
                    <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 rounded border border-slate-200 dark:border-slate-700">
                        ESC
                    </kbd>
                </div>

                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {results.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <Icon name="search_off" size={40} className="opacity-30 mb-2" />
                            <p className="text-sm">No results found.</p>
                        </div>
                    ) : (
                        <ul>
                            {results.map((r, i) => (
                                <li
                                    key={r.id}
                                    onMouseEnter={() => setHighlight(i)}
                                    onClick={() => go(r)}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                        i === highlight ? 'bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        r.category === 'Customer' ? 'bg-purple-500/10 text-purple-600' :
                                        r.category === 'Callback' ? 'bg-amber-500/10 text-amber-600' :
                                        'bg-primary/10 text-primary'
                                    }`}>
                                        <Icon name={r.icon} size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{r.title}</p>
                                        {r.subtitle && <p className="text-xs text-slate-500 truncate">{r.subtitle}</p>}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{r.category}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded">↑↓</kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded">↵</kbd>
                            select
                        </span>
                    </div>
                    <span className="hidden sm:flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded">⌘K</kbd>
                        toggle
                    </span>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
