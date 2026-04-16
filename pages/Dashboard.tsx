import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Icon from '../components/ui/Icon';
import { Card, StatCard } from '../components/ui/Card';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface DashStats {
    totalCustomers: number;
    pendingCallbacks: number;
    dueToday: number;
    bookedAppts: number;
    apptsThisWeek: number;
    newCustomersThisWeek: number;
}

interface RecentCallback {
    id: string;
    name: string;
    phone: string;
    date: string;
    status: string;
}

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
};

const Dashboard: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashStats>({
        totalCustomers: 0,
        pendingCallbacks: 0,
        dueToday: 0,
        bookedAppts: 0,
        apptsThisWeek: 0,
        newCustomersThisWeek: 0,
    });
    const [recentCallbacks, setRecentCallbacks] = useState<RecentCallback[]>([]);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setLoading(true);
            try {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

                const customerQuery = supabase.from('customers').select('id,created_at', { count: 'exact' });
                const callbackQuery = supabase.from('callbacks').select('id,name,phone,date,status,user_id', { count: 'exact' });
                const apptQuery = supabase.from('appointments').select('id,created_at', { count: 'exact' });

                const scopedCallbacks = isAdmin ? callbackQuery : callbackQuery.eq('user_id', user.id);

                const [customersRes, callbacksRes, apptsRes] = await Promise.all([
                    customerQuery,
                    scopedCallbacks,
                    apptQuery,
                ]);

                const customers = customersRes.data || [];
                const callbacks = callbacksRes.data || [];
                const appts = apptsRes.data || [];

                const pending = callbacks.filter((c: any) => c.status === 'Pending').length;
                const dueToday = callbacks.filter((c: any) => {
                    const d = new Date(c.date);
                    return d >= todayStart && d <= todayEnd && c.status === 'Pending';
                }).length;
                const booked = callbacks.filter((c: any) => c.status === 'Booked').length;
                const apptsThisWeek = appts.filter((a: any) => a.created_at >= weekAgo).length;
                const newCustomersThisWeek = customers.filter((c: any) => c.created_at >= weekAgo).length;

                setStats({
                    totalCustomers: customersRes.count || 0,
                    pendingCallbacks: pending,
                    dueToday,
                    bookedAppts: booked,
                    apptsThisWeek,
                    newCustomersThisWeek,
                });

                setRecentCallbacks(
                    callbacks
                        .filter((c: any) => c.status === 'Pending')
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(0, 5)
                );
            } catch (e) {
                console.error('Dashboard load failed:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user, isAdmin]);

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-800 dark:text-white">
            <Sidebar active="dashboard" />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-16 bg-white dark:bg-[#1a1d21] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Icon name="dashboard" className="text-primary" />
                        Dashboard
                    </h1>
                    <div className="text-xs text-slate-400 font-mono hidden md:block">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                                {greeting()}, {user?.name?.split(' ')[0] || 'there'}.
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                Here's what's happening across your CRM today.
                            </p>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="bg-white dark:bg-[#1a1d21] p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <Skeleton width="w-24" height="h-3" className="mb-3" />
                                        <Skeleton width="w-16" height="h-8" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    label="Total Customers"
                                    value={stats.totalCustomers}
                                    icon="groups"
                                    iconColor="text-primary"
                                    trend={stats.newCustomersThisWeek > 0 ? { value: `+${stats.newCustomersThisWeek} this week`, positive: true } : undefined}
                                    hint={stats.newCustomersThisWeek === 0 ? 'No new this week' : undefined}
                                />
                                <StatCard
                                    label="Pending Callbacks"
                                    value={stats.pendingCallbacks}
                                    icon="phone_callback"
                                    iconColor="text-amber-500"
                                    hint={stats.dueToday > 0 ? `${stats.dueToday} due today` : 'None due today'}
                                />
                                <StatCard
                                    label="Booked Appointments"
                                    value={stats.bookedAppts}
                                    icon="event_available"
                                    iconColor="text-emerald-500"
                                    trend={stats.apptsThisWeek > 0 ? { value: `${stats.apptsThisWeek} this week`, positive: true } : undefined}
                                />
                                <StatCard
                                    label="Due Today"
                                    value={stats.dueToday}
                                    icon="today"
                                    iconColor="text-red-500"
                                    hint={stats.dueToday > 0 ? 'Action required' : 'You’re all caught up'}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card padding="none" className="lg:col-span-2">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Icon name="upcoming" className="text-primary" />
                                        Upcoming Callbacks
                                    </h3>
                                    <Link to="/callbacks" className="text-xs font-bold text-primary hover:underline">View all →</Link>
                                </div>
                                {loading ? (
                                    <div className="p-4 space-y-3">
                                        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                                    </div>
                                ) : recentCallbacks.length === 0 ? (
                                    <EmptyState
                                        icon="phone_callback"
                                        title="No pending callbacks"
                                        description="You're all caught up. New callbacks will appear here."
                                        action={
                                            <Link to="/callbacks?new=true">
                                                <Button icon="add">New callback</Button>
                                            </Link>
                                        }
                                    />
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {recentCallbacks.map(cb => {
                                            const d = new Date(cb.date);
                                            const isOverdue = d < new Date();
                                            return (
                                                <li key={cb.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-primary/10 text-primary'}`}>
                                                        <Icon name="call" size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold truncate">{cb.name}</p>
                                                        <p className="text-xs text-slate-500 truncate">{cb.phone}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className={`text-sm font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {isOverdue && <p className="text-xs text-red-500 font-medium">Overdue</p>}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </Card>

                            <Card padding="none">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Icon name="bolt" className="text-amber-500" />
                                        Quick Actions
                                    </h3>
                                </div>
                                <div className="p-4 space-y-2">
                                    <Link to="/script" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                            <Icon name="description" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Start a call</p>
                                            <p className="text-xs text-slate-500">Open active script</p>
                                        </div>
                                    </Link>
                                    <Link to="/appointment" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                            <Icon name="calendar_add_on" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Book appointment</p>
                                            <p className="text-xs text-slate-500">Create new inspection</p>
                                        </div>
                                    </Link>
                                    <Link to="/callbacks?new=true" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                            <Icon name="phone_callback" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Log callback</p>
                                            <p className="text-xs text-slate-500">Schedule follow-up</p>
                                        </div>
                                    </Link>
                                    <Link to="/registry" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                                            <Icon name="person_add" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Add customer</p>
                                            <p className="text-xs text-slate-500">Grow the registry</p>
                                        </div>
                                    </Link>
                                </div>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
