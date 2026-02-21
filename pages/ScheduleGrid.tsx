import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { AppointmentRecord, BlockRule, STATE_CONFIG, OPERATING_HOURS } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';



const ScheduleGrid: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin, user } = useAuth();

    // --- Data ---
    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
    const [blockedRules, setBlockedRules] = useState<BlockRule[]>([]);

    // --- UI State ---
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [selectedStateFilter, setSelectedStateFilter] = useState<string | 'ALL'>('ALL');

    // Modal State
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [blockModalViewDate, setBlockModalViewDate] = useState<Date>(new Date());
    const [tempBlockedRules, setTempBlockedRules] = useState<BlockRule[]>([]);
    const [blockStateFilter, setBlockStateFilter] = useState<string | 'ALL'>('ALL');

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            // Fetch Appointments
            const { data: apptData } = await supabase
                .from('appointments')
                .select('*');

            if (apptData) {
                setAppointments(apptData.map((d: any) => ({
                    id: d.id,
                    createdAt: new Date(d.created_at).getTime(),
                    formData: d.form_data,
                    clipboardSummary: d.clipboard_summary
                })));
            }

            // Fetch Block Rules (assuming we create a table for this, or mock it locally for now if table doesn't exist)
            // For now, let's keep BlockRules local or creates a table? 
            // The prompt "Supabase Integration" implies we should probably persist this too.
            // Let's assume we need to create/use a 'block_rules' table. 
            // If it doesn't exist, I'll need to create it. 
            // For this specific step, I will add the fetch logic, and if it fails, I'll handle it. 
            // But to be safe and avoid breaking, I'll stick to local state for blockedRules TEMPORARILY 
            // OR I can quicky create the table command in next turn.
            // Actually, I'll switch blockedRules to just state for now, but to really persist it, 
            // I should use Supabase. Let's use Supabase 'block_rules' table.

            const { data: rulesData } = await supabase
                .from('block_rules')
                .select('*');

            if (rulesData) {
                setBlockedRules(rulesData);
            }
        };

        fetchData();

        // Subscription could be added here for realtime
    }, [user]);

    // --- Derived Data Helpers ---

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const dateStr = formatDate(selectedDate);

    const getAppointmentsForSlot = (time: string, state: string) => {
        return appointments.filter(a =>
            a.formData.appointmentDate === dateStr &&
            a.formData.appointmentTime === time &&
            a.formData.state === state
        );
    };

    const isTimeBlocked = (time: string, state: string) => {
        return blockedRules.some(r =>
            r.date === dateStr &&
            r.time === time &&
            (!r.state || r.state === state)
        );
    };

    const isDayBlocked = (dStr: string = dateStr, state?: string, rules: BlockRule[] = blockedRules) => {
        return rules.some(r => r.date === dStr && !r.time && (!r.state || (state && r.state === state)));
    };

    // Check if there is a GLOBAL block for the current day (state is undefined/null in DB rule)
    const isGlobalDayBlocked = (dStr: string = dateStr, rules: BlockRule[] = blockedRules) => {
        return rules.some(r => r.date === dStr && !r.time && !r.state);
    };


    const handleDateChange = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    // --- Grid/Time Blocking Logic ---
    // UPDATING TO SUPABASE

    const toggleBlockTime = async (time: string, state: string) => {
        if (!isAdmin) return;

        const existing = blockedRules.find(r =>
            r.date === dateStr &&
            r.time === time &&
            (!r.state || r.state === state)
        );

        if (existing) {
            // Delete
            const { error } = await supabase.from('block_rules').delete().eq('id', existing.id);
            if (!error) {
                setBlockedRules(blockedRules.filter(r => r.id !== existing.id));
            }
        } else {
            // Create
            const newRule = {
                date: dateStr,
                time,
                state,
                reason: 'Manual Slot Block'
            };
            const { data, error } = await supabase.from('block_rules').insert([newRule]).select().single();
            if (data && !error) {
                setBlockedRules([...blockedRules, data]);
            }
        }
    };

    // --- Modal Calendar Logic ---
    // UPDATING TO SUPABASE

    const openBlockModal = () => {
        if (!isAdmin) return;
        setTempBlockedRules([...blockedRules]);
        setIsBlockModalOpen(true);
    };

    const saveBlockModal = async () => {
        // Calculate diffs to minimize API calls (naive approach: delete all removed, insert all added)
        // For simplicity in this iteration, we'll just process the diff or 
        // simplistic approach: just identifying what changed is hard without deep compare.
        // Let's just handle the user interaction: 
        // Use 'toggleDateBlockFromCalendar' to immediately effect DB or wait for save?
        // The UI implies "Save Changes".

        // 1. Find rules in temp not in current (Added)
        const added = tempBlockedRules.filter(tr => !blockedRules.find(br => br.id === tr.id));
        // 2. Find rules in current not in temp (Removed)
        const removed = blockedRules.filter(br => !tempBlockedRules.find(tr => tr.id === br.id));

        // Batch Apply
        if (removed.length > 0) {
            await supabase.from('block_rules').delete().in('id', removed.map(r => r.id));
        }

        if (added.length > 0) {
            // 'id' in temp might be randomUUID/temp, so we should omit ID on insert if it's auto-gen by DB
            // but we need them locally. 
            // Logic: Insert without ID, get back ID.
            const toInsert = added.map(({ id, ...rest }) => rest);
            const { data } = await supabase.from('block_rules').insert(toInsert).select();
            // Refetch or update local state
            if (data) {
                // We need to merge everything back.
                // easiest is refetch
                const { data: allRules } = await supabase.from('block_rules').select('*');
                if (allRules) setBlockedRules(allRules);
            }
        } else {
            setBlockedRules(tempBlockedRules); // Just in case only deletes happened
        }

        setIsBlockModalOpen(false);
    };

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

    const toggleDateBlockFromCalendar = (day: number) => {
        // This manipulates tempBlockedRules.
        // IDs for new rules will be temporary (crypto.randomUUID) until saved
        const d = new Date(blockModalViewDate.getFullYear(), blockModalViewDate.getMonth(), day);
        const dStr = formatDate(d);

        // Determine if we are unblocking or blocking based on current filter state
        const targetState = blockStateFilter === 'ALL' ? undefined : blockStateFilter;
        const currentlyBlocked = isDayBlocked(dStr, targetState, tempBlockedRules);

        if (currentlyBlocked) {
            // Unblock
            // If ALL, remove global rule. If specific, remove specific rule.
            // If we are looking at specific state, and there is a global rule, do we delete global rule? 
            // Ideally, no, we should probably 'except' it, but simple logic: 
            // If filter=ALL, remove global rules. If filter=GA, remove GA rules.
            // CAUTION: If filter=GA and there is a GLOBAL rule, we can't "unblock" just GA without converting global to (All - GA). 
            // For MVP simplicity: We only delete the rule that EXACTLY matches the scope or specific overrides.

            setTempBlockedRules(tempBlockedRules.filter(r => {
                const isSameDate = r.date === dStr && !r.time;
                if (!isSameDate) return true; // keep other dates

                // If we are unblocking ALL, remove everything on this date? Or just global?
                // Let's go with: Remove rule if it matches targetState

                if (targetState === undefined) {
                    // Filter is ALL. Remove global rule.
                    return r.state !== undefined && r.state !== null;
                } else {
                    // Filter is Specific. Remove specific rule.
                    return r.state !== targetState;
                }
            }));
        } else {
            // Block
            const newRule: BlockRule = {
                id: crypto.randomUUID(),
                date: dStr,
                reason: 'Manual Calendar Block',
                state: targetState
            };
            setTempBlockedRules([...tempBlockedRules, newRule]);
        }
    };

    const states = selectedStateFilter === 'ALL' ? Object.keys(STATE_CONFIG) : [selectedStateFilter];
    const globalDayBlocked = isGlobalDayBlocked();

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-800 dark:text-white">
            <Sidebar active="schedule" />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-[#1a1d21] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 z-10 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">calendar_month</span>
                            Schedule Grid
                        </h1>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => handleDateChange(-1)}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            <div className="px-4 text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[140px] text-center">
                                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                            </div>
                            <button
                                onClick={() => handleDateChange(1)}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            Today
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Grid View
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                List View
                            </button>
                        </div>

                        {isAdmin && (
                            <button
                                onClick={openBlockModal}
                                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold transition-colors ${globalDayBlocked ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">event_busy</span>
                                {globalDayBlocked ? 'Manage Blocks' : 'Block Dates'}
                            </button>
                        )}

                        <button onClick={() => navigate('/appointment')} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-lg shadow-md transition-colors">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            New Appt
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden flex flex-col">
                    {/* Filters Toolbar */}
                    <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d21] flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter State:</span>
                        <div className="flex gap-2">
                            {['ALL', 'GA', 'TN', 'AL', 'SC'].map(state => (
                                <button
                                    key={state}
                                    onClick={() => setSelectedStateFilter(state)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${selectedStateFilter === state
                                        ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent'
                                        : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                        }`}
                                >
                                    {state}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50 dark:bg-background-dark/50">
                        {globalDayBlocked && (
                            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-red-800 dark:text-red-200 animate-[slideIn_0.2s_ease-out]">
                                <span className="material-symbols-outlined">block</span>
                                <span className="font-semibold">This entire date is manually blocked for ALL states. No new appointments can be scheduled.</span>
                            </div>
                        )}

                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-[auto_1fr] gap-6">
                                {/* Time Column */}
                                <div className="space-y-4 pt-10">
                                    {OPERATING_HOURS.map(time => (
                                        <div key={time} className="h-32 flex flex-col items-end pr-4 justify-start">
                                            <span className="text-sm font-bold text-slate-400">{time}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* States Columns */}
                                <div className={`grid gap-4 ${states.length === 1 ? 'grid-cols-1' : `grid-cols-${states.length} md:grid-cols-${Math.min(states.length, 4)}`}`}>
                                    {states.map(state => {
                                        const isStateDayBlocked = isDayBlocked(dateStr, state);
                                        return (
                                            <div key={state} className="space-y-4">
                                                {/* Column Header */}
                                                <div className="text-center pb-2 sticky top-0 bg-slate-50 dark:bg-[#22252a] z-10">
                                                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center justify-center gap-2">
                                                        {state}
                                                        {isStateDayBlocked && <span className="material-symbols-outlined text-red-500 text-[18px]" title="State Blocked for Day">event_busy</span>}
                                                    </h3>
                                                    <span className="text-xs font-medium text-slate-500">Cap: {STATE_CONFIG[state].capacity}/hr</span>
                                                </div>

                                                {OPERATING_HOURS.map(time => {
                                                    const bookings = getAppointmentsForSlot(time, state);
                                                    const capacity = STATE_CONFIG[state].capacity;
                                                    const filled = bookings.length;
                                                    const isFull = filled >= capacity;
                                                    const isBlocked = isTimeBlocked(time, state) || isStateDayBlocked;
                                                    const percentage = Math.min((filled / capacity) * 100, 100);

                                                    return (
                                                        <div
                                                            key={`${state}-${time}`}
                                                            className={`
                                                            h-32 rounded-xl border p-3 flex flex-col relative group transition-all
                                                            ${isBlocked
                                                                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70'
                                                                    : isFull
                                                                        ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                                                                        : 'bg-white dark:bg-[#1a1d21] border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
                                                                }
                                                        `}
                                                        >
                                                            {/* Slot Header */}
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isFull || isBlocked ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                                                                        {isBlocked ? 'BLOCKED' : `${filled}/${capacity}`}
                                                                    </span>
                                                                </div>
                                                                {isAdmin && !isStateDayBlocked && (
                                                                    <button
                                                                        onClick={() => toggleBlockTime(time, state)}
                                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-all text-slate-400"
                                                                        title={isBlocked ? "Unblock Slot" : "Block Slot"}
                                                                    >
                                                                        <span className="material-symbols-outlined text-[16px]">{isBlocked ? 'lock_open' : 'lock'}</span>
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Progress Bar */}
                                                            {!isBlocked && (
                                                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-primary'}`}
                                                                        style={{ width: `${percentage}%` }}
                                                                    ></div>
                                                                </div>
                                                            )}

                                                            {/* Appt List */}
                                                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
                                                                {bookings.map(appt => (
                                                                    <div key={appt.id} className="text-xs p-1.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 truncate" title={appt.formData.homeOwner}>
                                                                        {appt.formData.homeOwner}
                                                                    </div>
                                                                ))}
                                                                {bookings.length === 0 && !isBlocked && (
                                                                    <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-600 text-xs italic">
                                                                        Open
                                                                    </div>
                                                                )}
                                                                {isBlocked && (
                                                                    <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs italic flex-col">
                                                                        <span className="material-symbols-outlined text-[18px] mb-1">block</span>
                                                                        Unavailable
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            // List View
                            <div className="max-w-4xl mx-auto space-y-8">
                                {states.map(state => {
                                    const isStateDayBlocked = isDayBlocked(dateStr, state);

                                    return (
                                        <div key={state} className="bg-white dark:bg-[#1a1d21] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {state}
                                                    </div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                        {state} Schedule
                                                        {isStateDayBlocked && <span className="text-xs text-red-500 font-bold border border-red-200 bg-red-50 px-2 py-0.5 rounded">BLOCKED</span>}
                                                    </h3>
                                                </div>
                                                <span className="text-xs font-semibold text-slate-500">
                                                    {OPERATING_HOURS.reduce((acc, time) => acc + getAppointmentsForSlot(time, state).length, 0)} Total Appts
                                                </span>
                                            </div>
                                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {isStateDayBlocked ? (
                                                    <div className="p-8 text-center">
                                                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">event_busy</span>
                                                        <p className="text-slate-500 font-medium">This state is currently blocked for appointments on this date.</p>
                                                    </div>
                                                ) : (
                                                    OPERATING_HOURS.map(time => {
                                                        const bookings = getAppointmentsForSlot(time, state);
                                                        const isBlocked = isTimeBlocked(time, state); // Day block handled by parent branch

                                                        if (bookings.length === 0 && !isBlocked) return null; // Hide empty slots in list view

                                                        return (
                                                            <div key={time} className={`px-6 py-4 ${isBlocked ? 'bg-slate-50 dark:bg-slate-800/20' : ''}`}>
                                                                <div className="flex items-start gap-6">
                                                                    <div className="w-20 shrink-0 pt-1">
                                                                        <span className="text-sm font-bold text-slate-500">{time}</span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        {isBlocked ? (
                                                                            <div className="inline-flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-2 py-1 rounded">
                                                                                <span className="material-symbols-outlined text-[14px]">lock</span>
                                                                                Slot Blocked
                                                                            </div>
                                                                        ) : (
                                                                            <div className="space-y-2">
                                                                                {bookings.map(appt => (
                                                                                    <div key={appt.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                                                                                {appt.formData.homeOwner.charAt(0)}
                                                                                            </div>
                                                                                            <div>
                                                                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{appt.formData.homeOwner}</p>
                                                                                                <p className="text-xs text-slate-500">{appt.formData.phoneNumber}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <button className="text-slate-400 hover:text-primary transition-colors">
                                                                                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                                {/* Empty State for List View if no appts */}
                                                {OPERATING_HOURS.every(time => getAppointmentsForSlot(time, state).length === 0 && !isTimeBlocked(time, state) && !isStateDayBlocked) && (
                                                    <div className="p-8 text-center text-slate-400 text-sm">
                                                        No appointments scheduled for this region today.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>

                {/* --- BLOCK DATES MODAL --- */}
                {isBlockModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-[#1a1d21] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-[slideIn_0.2s_ease-out]">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-500">event_busy</span>
                                    Manage Blocked Dates
                                </h2>
                                <button onClick={() => setIsBlockModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-6">
                                <p className="text-sm text-slate-500 mb-4">Click dates to toggle their availability. Changes are applied when you save.</p>

                                {/* State Filter */}
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Block for State:</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setBlockStateFilter('ALL')}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${blockStateFilter === 'ALL'
                                                    ? 'bg-primary text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            All States
                                        </button>
                                        {Object.keys(STATE_CONFIG).map(state => (
                                            <button
                                                key={state}
                                                onClick={() => setBlockStateFilter(state)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${blockStateFilter === state
                                                        ? 'bg-primary text-white'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                {state}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Calendar Controls */}
                                <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
                                    <button onClick={() => {
                                        const d = new Date(blockModalViewDate);
                                        d.setMonth(d.getMonth() - 1);
                                        setBlockModalViewDate(d);
                                    }} className="p-1 rounded-full hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all">
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <span className="text-base font-bold text-slate-900 dark:text-white">
                                        {blockModalViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <button onClick={() => {
                                        const d = new Date(blockModalViewDate);
                                        d.setMonth(d.getMonth() + 1);
                                        setBlockModalViewDate(d);
                                    }} className="p-1 rounded-full hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all">
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 text-center mb-2">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                        <span key={day} className="text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</span>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {Array.from({ length: getFirstDayOfMonth(blockModalViewDate) }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}
                                    {Array.from({ length: getDaysInMonth(blockModalViewDate) }).map((_, i) => {
                                        const day = i + 1;
                                        const date = new Date(blockModalViewDate.getFullYear(), blockModalViewDate.getMonth(), day);
                                        const dStr = formatDate(date);
                                        // Use helper with correct context
                                        const targetState = blockStateFilter === 'ALL' ? undefined : blockStateFilter;
                                        const isBlocked = isDayBlocked(dStr, targetState, tempBlockedRules);
                                        const isToday = formatDate(new Date()) === dStr;

                                        return (
                                            <button
                                                key={day}
                                                onClick={() => toggleDateBlockFromCalendar(day)}
                                                className={`
                                                    h-10 w-full rounded-lg text-sm font-semibold flex items-center justify-center transition-all border-2
                                                    ${isToday
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                                                        : isBlocked
                                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400'
                                                            : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                                                    }
                                                `}
                                                title={isToday ? "Today" : isBlocked ? "Unblock Date" : "Block Date"}

                                            >
                                                {isBlocked ? <span className="material-symbols-outlined text-lg">block</span> : day}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-6 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-500"></span>
                                            <span>Today</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded bg-red-100 border border-red-500"></span>
                                            <span>Blocked</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded bg-white border border-slate-300"></span>
                                            <span>Available</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsBlockModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveBlockModal}
                                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-sm transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleGrid;