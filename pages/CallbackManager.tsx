import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// --- Types ---
interface CallbackRecord {
    id: string;
    name: string;
    phone: string;
    date: string; // YYYY-MM-DDTHH:MM
    notes: string;
    status: 'Pending' | 'No Answer' | 'Booked' | 'Disqualified';
    createdAt: number;
}

// --- Constants ---
const TIME_SLOTS = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM'
];

// --- Helper Functions ---
function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error(error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue] as const;
}

const convertTo24Hour = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
        hours = modifier === 'PM' ? '12' : '00';
    } else {
        if (modifier === 'PM') {
            hours = (parseInt(hours, 10) + 12).toString();
        }
    }
    return `${hours.padStart(2, '0')}:${minutes}`;
};

const CallbackManager: React.FC = () => {
    const { isAdmin } = useAuth();

    // --- State ---
    const [callbacks, setCallbacks] = useState<CallbackRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    const fetchCallbacks = async () => {
        if (!user) return;
        try {
            let query = supabase
                .from('callbacks')
                .select('*')
                .order('date', { ascending: true });

            if (!isAdmin) {
                query = query.eq('user_id', user.id);
            }

            const { data, error } = await query;

            if (error) throw error;
            if (data) {
                setCallbacks(data.map((d: any) => ({
                    ...d,
                    createdAt: new Date(d.created_at).getTime()
                })));
            }
        } catch (error) {
            console.error('Error fetching callbacks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCallbacks();
    }, [user, isAdmin]);

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [dateInput, setDateInput] = useState(''); // YYYY-MM-DD
    const [timeInput, setTimeInput] = useState('12:00 PM'); // Default 12:00 PM

    // Calendar State
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    // --- Effects ---
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setShowCalendar(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Alert for due callbacks
    useEffect(() => {
        const checkDueCallbacks = () => {
            const now = new Date();
            const dueCallbacks = callbacks.filter(cb => {
                const cbDate = new Date(cb.date);
                // Alert if callback time is within the next 5 minutes and hasn't been alerted yet
                const timeUntilCallback = cbDate.getTime() - now.getTime();
                return timeUntilCallback <= 5 * 60 * 1000 && timeUntilCallback > 0 && cb.status === 'Pending';
            });

            dueCallbacks.forEach(cb => {
                const cbDate = new Date(cb.date);
                const timeString = cbDate.toLocaleString([], { hour: '2-digit', minute: '2-digit' });
                alert(`📞 Callback Due Soon!\n\nName: ${cb.name}\nPhone: ${cb.phone}\nTime: ${timeString}\n\nPlease call now!`);
            });
        };

        // Check immediately on load and at regular intervals
        checkDueCallbacks();
        const intervalId = setInterval(checkDueCallbacks, 60000); // Check every minute

        return () => clearInterval(intervalId);
    }, [callbacks]);

    // --- Handlers ---
    const handleAddClick = () => {
        setEditingId(null);
        setNewName('');
        setNewPhone('');
        setNewNotes('');
        setDateInput('');
        setTimeInput('12:00 PM');
        setCalendarViewDate(new Date());
        setIsModalOpen(true);
    };

    const handleEditClick = (callback: CallbackRecord) => {
        setEditingId(callback.id);
        setNewName(callback.name);
        setNewPhone(callback.phone);
        setNewNotes(callback.notes);
        const dateObj = new Date(callback.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        setDateInput(`${year}-${month}-${day}`);
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const isPM = dateObj.getHours() >= 12;
        const displayHours = dateObj.getHours() % 12 || 12;
        const timeStr = `${String(displayHours).padStart(2, '0')}:${minutes} ${isPM ? 'PM' : 'AM'}`;
        setTimeInput(timeStr);
        setCalendarViewDate(dateObj);
        setIsModalOpen(true);
    };

    const handleSaveCallback = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newName || !newPhone || !dateInput) {
            alert("Please fill in required fields.");
            return;
        }

        if (!user) {
            alert("Please log in.");
            return;
        }

        const dateTime = `${dateInput}T${convertTo24Hour(timeInput)}`;

        try {
            if (editingId) {
                // Update existing callback
                const { data, error } = await supabase
                    .from('callbacks')
                    .update({
                        name: newName,
                        phone: newPhone,
                        date: new Date(dateTime).toISOString(),
                        notes: newNotes
                    })
                    .eq('id', editingId)
                    .select()
                    .single();

                if (error) throw error;

                if (data) {
                    setCallbacks(prev => prev.map(cb => cb.id === editingId ? {
                        ...data,
                        createdAt: new Date(data.created_at).getTime()
                    } : cb));
                    setIsModalOpen(false);
                    setEditingId(null);
                }
            } else {
                // Create new callback
                const { data, error } = await supabase
                    .from('callbacks')
                    .insert([{
                        name: newName,
                        phone: newPhone,
                        date: new Date(dateTime).toISOString(),
                        notes: newNotes,
                        status: 'Pending',
                        user_id: user.id
                    }])
                    .select()
                    .single();

                if (error) throw error;

                if (data) {
                    setCallbacks(prev => [{
                        ...data,
                        createdAt: new Date(data.created_at).getTime()
                    }, ...prev]);
                    setIsModalOpen(false);
                }
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Failed to save callback');
        }
    };

    const handleStatusChange = async (id: string, newStatus: CallbackRecord['status']) => {
        // Optimistic update
        setCallbacks(prev => prev.map(cb => cb.id === id ? { ...cb, status: newStatus } : cb));

        try {
            const { error } = await supabase
                .from('callbacks')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (window.confirm("Are you sure you want to delete this callback?")) {
            // Store the deleted item in case we need to restore it
            const deletedCallback = callbacks.find(cb => cb.id === id);
            
            // Optimistic update - remove from UI immediately
            setCallbacks(prev => prev.filter(cb => cb.id !== id));
            
            try {
                const { error } = await supabase
                    .from('callbacks')
                    .delete()
                    .eq('id', id);

                if (error) {
                    console.error('Delete error:', error);
                    throw error;
                }
                
                // Refetch after delete to ensure sync
                await new Promise(resolve => setTimeout(resolve, 300));
                await fetchCallbacks();
            } catch (error) {
                console.error('Error deleting callback:', error);
                // Restore the item if deletion failed
                if (deletedCallback) {
                    setCallbacks(prev => [...prev, deletedCallback]);
                }
                alert('Failed to delete callback. Please try again.');
            }
        }
    };

    const filteredCallbacks = callbacks.filter(cb =>
        cb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cb.phone.includes(searchTerm)
    );

    // --- Calendar Logic ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const handleCalendarNav = (direction: 'prev' | 'next') => {
        const newDate = new Date(calendarViewDate);
        if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
        else newDate.setMonth(newDate.getMonth() + 1);
        setCalendarViewDate(newDate);
    };

    const selectDate = (day: number) => {
        const year = calendarViewDate.getFullYear();
        const month = String(calendarViewDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;

        setDateInput(dateStr);
        setShowCalendar(false);
    };

    // Stats
    const totalPending = callbacks.filter(c => c.status === 'Pending').length;

    // --- Auto-Open Modal Effect ---
    // --- Auto-Open Modal Effect ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('new') === 'true') {
            handleAddClick();

            // Clear the param so refreshing doesn't re-open it indefinitely
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [/* Run once on mount */]);
    const dueTodayCount = callbacks.filter(c => {
        const today = new Date().toISOString().split('T')[0];
        return c.date.startsWith(today) && c.status === 'Pending';
    }).length;
    const bookedCount = callbacks.filter(c => c.status === 'Booked').length;
    const successRate = callbacks.length > 0 ? Math.round((bookedCount / callbacks.length) * 100) : 0;

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-hidden h-screen flex">
            <Sidebar active="callbacks" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-20">
                    <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Callback Manager</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Manage high-priority homeowner follow-ups.</p>
                            </div>
                            <button
                                onClick={handleAddClick}
                                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all focus:ring-4 focus:ring-primary/30"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                <span>Add New Callback</span>
                            </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col gap-1 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-4xl text-slate-900 dark:text-white">pending_actions</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Pending</p>
                                <div className="flex items-end gap-3">
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalPending}</p>
                                </div>
                            </div>
                            <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col gap-1 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-4xl text-primary">today</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Due Today</p>
                                <div className="flex items-end gap-3">
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{dueTodayCount}</p>
                                    {dueTodayCount > 0 && (
                                        <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded mb-1.5">
                                            Action Required
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col gap-1 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Completion Rate</p>
                                <div className="flex items-end gap-3">
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{successRate}%</p>
                                </div>
                            </div>
                        </div>

                        {/* List Table */}
                        <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col min-h-[400px]">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                    <div className="relative group w-full sm:w-72">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                                        </div>
                                        <input
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary transition-all"
                                            placeholder="Search by name or phone..."
                                            type="text"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">View:</span>
                                    <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white shadow-sm transition-transform active:scale-95">All Active</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-b-xl flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[180px]">Status</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[250px]">Homeowner Details</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[200px]">Callback Date</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[50px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-surface-dark">
                                        {filteredCallbacks.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                                                    No callbacks found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCallbacks.map(cb => {
                                                const cbDate = new Date(cb.date);
                                                const isOverdue = new Date() > cbDate && cb.status === 'Pending';

                                                return (
                                                    <tr key={cb.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <select
                                                                value={cb.status}
                                                                onChange={(e) => handleStatusChange(cb.id, e.target.value as any)}
                                                                className={`text-xs font-bold px-2 py-1 rounded-full border-none focus:ring-1 cursor-pointer 
                                                                    ${cb.status === 'Pending' ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' :
                                                                        cb.status === 'No Answer' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' :
                                                                            cb.status === 'Booked' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' :
                                                                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}
                                                            >
                                                                <option value="Pending">Pending</option>
                                                                <option value="No Answer">No Answer</option>
                                                                <option value="Booked">Booked</option>
                                                                <option value="Disqualified">Disqualified</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{cb.name}</span>
                                                                <span className="text-xs text-slate-500 dark:text-slate-400">{cb.phone}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-sm font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                    {cbDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {isOverdue && <span className="material-symbols-outlined text-[16px] text-red-500" title="Overdue">warning</span>}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-xs">{cb.notes}</p>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEditClick(cb)}
                                                                    className="text-slate-300 hover:text-primary transition-colors"
                                                                    title="Edit Callback"
                                                                >
                                                                    <span className="material-symbols-outlined">edit</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDelete(cb.id, e)}
                                                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                                                    title="Delete Callback"
                                                                >
                                                                    <span className="material-symbols-outlined">delete</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- ADD MODAL --- */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[slideIn_0.1s_ease-out]">
                        <div className="bg-white dark:bg-[#1a1d21] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">{editingId ? 'edit' : 'add_call'}</span>
                                    {editingId ? 'Edit Callback' : 'New Callback'}
                                </h3>
                                <button onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingId(null);
                                }} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleSaveCallback} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Homeowner Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary"
                                        placeholder="e.g. John Smith"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="tel"
                                        required
                                        value={newPhone}
                                        onChange={e => setNewPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary"
                                        placeholder="(555) 000-0000"
                                        inputMode="numeric"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative" ref={calendarRef}>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Callback Date <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                readOnly
                                                value={dateInput}
                                                onClick={() => setShowCalendar(!showCalendar)}
                                                className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary pl-4 pr-10 cursor-pointer"
                                                placeholder="Select Date"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCalendar(!showCalendar)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                                            </button>
                                        </div>
                                        {/* Custom Calendar Popup */}
                                        {showCalendar && (
                                            <div className="fixed z-50 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4 w-72 animate-[slideIn_0.1s_ease-out]" style={{
                                                top: `${calendarRef.current?.getBoundingClientRect().bottom ?? 0}px`,
                                                left: `${calendarRef.current?.getBoundingClientRect().left ?? 0}px`
                                            }}>
                                                <div className="flex justify-between items-center mb-4">
                                                    <button type="button" onClick={() => handleCalendarNav('prev')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                                                    </button>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                    </span>
                                                    <button type="button" onClick={() => handleCalendarNav('next')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-7 text-center mb-2">
                                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                                        <span key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</span>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {Array.from({ length: getFirstDayOfMonth(calendarViewDate) }).map((_, i) => (
                                                        <div key={`empty-${i}`} />
                                                    ))}
                                                    {Array.from({ length: getDaysInMonth(calendarViewDate) }).map((_, i) => {
                                                        const day = i + 1;
                                                        const date = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
                                                        const isSelected = dateInput && new Date(dateInput).getDate() === day && new Date(dateInput).getMonth() === calendarViewDate.getMonth();
                                                        const isToday = day === new Date().getDate() && calendarViewDate.getMonth() === new Date().getMonth() && calendarViewDate.getFullYear() === new Date().getFullYear();

                                                        return (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => selectDate(day)}
                                                                className={`
                                                                    h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition-all
                                                                    ${isSelected ? 'bg-primary text-white shadow-md' : isToday ? 'ring-2 ring-primary bg-blue-50 dark:bg-blue-900/20 text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}
                                                                `}
                                                            >
                                                                {day}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Time <span className="text-red-500">*</span></label>
                                        <select
                                            value={timeInput}
                                            onChange={(e) => setTimeInput(e.target.value)}
                                            className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary"
                                        >
                                            {TIME_SLOTS.map(time => (
                                                <option key={time} value={time}>{time}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                                    <textarea
                                        value={newNotes}
                                        onChange={e => setNewNotes(e.target.value)}
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary"
                                        rows={3}
                                        placeholder="Reason for callback..."
                                    />
                                </div>
                                <div className="pt-2 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            setEditingId(null);
                                        }}
                                        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-sm transition-colors"
                                    >
                                        {editingId ? 'Update Callback' : 'Save Callback'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CallbackManager;