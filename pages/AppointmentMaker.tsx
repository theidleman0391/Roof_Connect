import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FormField, AppointmentRecord, BlockRule, STATE_CONFIG, OPERATING_HOURS } from '../types';

// Manual blocks are now handled dynamically via BlockRule, 
// but we keep the hardcoded list for legacy/holidays if needed or merge logic.
const HOLIDAY_BLOCKS: string[] = [
    '2024-12-25', // Christmas
    '2024-01-01'  // New Years
];

// --- Default Schema Definition ---
const DEFAULT_SCHEMA: FormField[] = [
    { id: 'homeOwner', type: 'text', label: 'Home Owner', required: true, prefix: 'Home Owner: ', suffix: '\n', placeholder: 'John Doe' },
    { id: 'roofAge', type: 'slider', label: 'Roof Age', min: 0, max: 50, step: 1, prefix: 'Roof Age: ', suffix: ' years\n' },
    { id: 'roofType', type: 'select', label: 'Roof Type', options: ['Shingles', 'Metal', 'Tile', 'Flat', 'Other'], prefix: 'Roof Type: ', suffix: '\n' },
    { id: 'insuranceName', type: 'select', label: 'Insurance Name', options: ['All State', 'State Farm', 'USAA', 'Geico', 'Progressive', 'Farmers', 'Travelers', "Don't Know", 'Other'], prefix: 'Insurance: ', suffix: '\n' },
    { id: 'insuranceOther', type: 'text', label: 'Other Insurance Name', showWhen: { fieldId: 'insuranceName', value: 'Other' }, prefix: 'Insurance (Other): ', suffix: '\n' },
    { id: 'roofCondition', type: 'select', label: 'Roof Condition', options: ['Unknown', 'Damaged'], prefix: 'Condition: ', suffix: '\n' },
    { id: 'damageDescription', type: 'textarea', label: 'Damage Description', showWhen: { fieldId: 'roofCondition', value: 'Damaged' }, prefix: 'Damage: ', suffix: '\n' },
    { id: 'squareFootage', type: 'number', label: 'Square Footage', prefix: 'Sq Ft: ', suffix: '\n' },
    { id: 'emailOption', type: 'select', label: 'Email Option', options: ['Has Email', 'Does Not Apply'], prefix: 'Email Status: ', suffix: '\n' },
    { id: 'email', type: 'email', label: 'Email Address', showWhen: { fieldId: 'emailOption', value: 'Has Email' }, prefix: 'Email: ', suffix: '\n' },
    { id: 'phoneNumber', type: 'tel', label: 'Phone Number', prefix: 'Phone: ', suffix: '\n', placeholder: '(555) 000-0000' },
    { id: 'address', type: 'text', label: 'Address', prefix: 'Address: ', suffix: '\n' },
    { id: 'state', type: 'select', label: 'Property State', options: ['GA', 'TN', 'AL', 'SC'], required: true, prefix: 'State: ', suffix: '\n' },
    { id: 'engagementLevel', type: 'select', label: 'Engagement Level', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], prefix: 'Engagement: ', suffix: '/10\n' },
    { id: 'appointmentDate', type: 'date', label: 'Appointment Date', required: true, prefix: 'Date: ', suffix: '\n' },
    { id: 'appointmentTime', type: 'select', label: 'Appointment Time', options: [], required: true, prefix: 'Time: ', suffix: '\n' }, // Options handled dynamically
    { id: 'notes', type: 'textarea', label: 'Notes', prefix: 'Notes: ', suffix: '\n' },
    { id: 'googleMaps', type: 'url', label: 'Google Maps Link', prefix: 'Map: ', suffix: '\n' },
];

// --- Helper Hooks ---
// --- Helper Hooks ---
// (Supabase used instead of useLocalStorage)

const AppointmentMaker: React.FC = () => {
    // --- State ---
    const [schema, setSchema] = useState<FormField[]>(DEFAULT_SCHEMA);
    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
    const [blockedRules, setBlockedRules] = useState<BlockRule[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const { user } = useAuth();

    const fetchAppointments = async () => {
        if (!user) return;

        // Fetch Appointments
        const { data: apptData } = await supabase
            .from('appointments')
            .select('*')
            .order('created_at', { ascending: false });

        if (apptData) {
            setAppointments(apptData.map((d: any) => ({
                id: d.id,
                createdAt: new Date(d.created_at).getTime(),
                formData: d.form_data,
                clipboardSummary: d.clipboard_summary
            })));
        }

        // Fetch Block Rules
        const { data: rulesData } = await supabase
            .from('block_rules')
            .select('*');

        if (rulesData) {
            setBlockedRules(rulesData);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [user]);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AppointmentRecord | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    // Calendar State
    const [activeDateField, setActiveDateField] = useState<string | null>(null);
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);

    // --- Helpers ---
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Close calendar when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setActiveDateField(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isFieldVisible = (field: FormField, currentData: Record<string, any>) => {
        if (!field.showWhen) return true;
        return currentData[field.showWhen.fieldId] === field.showWhen.value;
    };

    const generateClipboardText = (data: Record<string, any>, currentSchema: FormField[]) => {
        let text = '';
        currentSchema.forEach(field => {
            if (isFieldVisible(field, data) && data[field.id]) {
                text += `${field.prefix || ''}${data[field.id]}${field.suffix || ''}`;
            }
        });
        text += 'Did you confirm the physical address?: Yes';
        text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
        return text;
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast('Copied to clipboard!');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }
    };

    // --- Capacity & Rules Logic ---

    // Check if a specific hour in a specific date is full OR blocked by rule
    const isSlotUnavailable = (dateStr: string, time: string, state: string) => {
        if (!state || !STATE_CONFIG[state]) return true;

        // 1. Check Capacity
        const config = STATE_CONFIG[state];
        const bookings = appointments.filter(a =>
            a.formData.appointmentDate === dateStr &&
            a.formData.appointmentTime === time &&
            a.formData.state === state
        );
        if (bookings.length >= config.capacity) return true;

        // 2. Check Dynamic Rules (Time Specific)
        // Block if rule matches Date AND Time AND (State matches OR State is null/global)
        const isBlocked = blockedRules.some(r =>
            r.date === dateStr &&
            r.time === time &&
            (!r.state || r.state === state)
        );
        if (isBlocked) return true;

        return false;
    };

    // Check if a date is blocked (Lead time, Workdays, Manual Block, or All Slots Full)
    const isDateBlocked = (date: Date) => {
        const state = formData['state'];

        // 1. Must have state selected to pick date
        if (!state) return true;

        const config = STATE_CONFIG[state];
        if (!config) return true;

        // 2. Lead Time: Next-day booking only (T+1)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);

        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return true; // Block past dates only

        // 3. Workdays (0 = Sun, 6 = Sat)
        if (!config.workdays.includes(target.getDay())) return true;

        const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;

        // 4. Hardcoded Holiday Blocks
        if (HOLIDAY_BLOCKS.includes(dateStr)) return true;

        // 5. Dynamic Rules (Whole Day Block)
        // Check if there is a rule for this Date with NO time specified (implies whole day)
        // And (State matches OR State is null)
        const isDynamicDayBlocked = blockedRules.some(r =>
            r.date === dateStr &&
            !r.time &&
            (!r.state || r.state === state)
        );
        if (isDynamicDayBlocked) return true;

        // 6. Full Capacity Check (Disable date if ALL hours are full/blocked)
        const allSlotsUnavailable = OPERATING_HOURS.every(time => isSlotUnavailable(dateStr, time, state));
        if (allSlotsUnavailable) return true;

        return false;
    };

    const handleSaveAndCopy = async () => {
        const newErrors: Record<string, boolean> = {};
        let isValid = true;

        schema.forEach(field => {
            if (isFieldVisible(field, formData)) {
                if (field.required && !formData[field.id]) {
                    newErrors[field.id] = true;
                    isValid = false;
                }
            }
        });

        // Double check capacity before saving
        if (formData.state && formData.appointmentDate && formData.appointmentTime) {
            if (isSlotUnavailable(formData.appointmentDate, formData.appointmentTime, formData.state)) {
                showToast('This slot is unavailable (full or blocked). Please pick another.', 'error');
                return;
            }
        }

        setErrors(newErrors);

        if (!isValid) {
            showToast('Cannot save: Missing required fields.', 'error');
            return;
        }

        const summary = generateClipboardText(formData, schema);

        if (!user) {
            showToast('Please log in using Supabase to save.', 'error');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('appointments')
                .insert([{
                    user_id: user.id,
                    form_data: formData,
                    clipboard_summary: summary,
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const newRecord: AppointmentRecord = {
                    id: data.id,
                    createdAt: new Date(data.created_at).getTime(),
                    formData: data.form_data,
                    clipboardSummary: data.clipboard_summary
                };
                setAppointments([newRecord, ...appointments]);
                copyToClipboard(summary);
                setFormData({});
                setErrors({});
                showToast('Saved, Copied & Form Cleared!');
            }
        } catch (error) {
            console.error('Save error:', error);
            showToast('Failed to save to database.', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        // Store the deleted item in case we need to restore it
        const deletedAppt = appointments.find(a => a.id === id);
        
        // Optimistic update - remove from UI immediately
        setAppointments(appointments.filter(a => a.id !== id));

        try {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Delete error:', error);
                throw error;
            }

            // Wait a moment then refetch to ensure delete is complete
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchAppointments();
            showToast('Record deleted.');
        } catch (error) {
            console.error('Error deleting appointment:', error);
            // Restore the item if deletion failed
            if (deletedAppt) {
                setAppointments(prev => [...prev, deletedAppt]);
            }
            showToast('Failed to delete.', 'error');
        }
    };

    const handleUpdateRecord = () => {
        if (!editingRecord) return;
        setAppointments(appointments.map(a => a.id === editingRecord.id ? editingRecord : a));
        setIsEditModalOpen(false);
        showToast('Record updated.');
    };

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
        if (!activeDateField) return;
        const year = calendarViewDate.getFullYear();
        const month = String(calendarViewDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;

        setFormData({ ...formData, [activeDateField]: dateStr, appointmentTime: '' });
        setErrors({ ...errors, [activeDateField]: false });
        setActiveDateField(null);
    };

    const renderCustomCalendar = () => {
        const daysInMonth = getDaysInMonth(calendarViewDate);
        const startDay = getFirstDayOfMonth(calendarViewDate);
        const currentSelected = activeDateField && formData[activeDateField] ? new Date(formData[activeDateField]) : null;
        const today = new Date();

        if (!formData['state']) {
            return (
                <div className="absolute z-50 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4 w-72 animate-[slideIn_0.1s_ease-out]">
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                        <span className="material-symbols-outlined text-amber-500 text-3xl mb-2">warning</span>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">State Required</p>
                        <p className="text-xs text-slate-500 mt-1">Please select a Property State first to see available dates.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute z-50 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4 w-72 animate-[slideIn_0.1s_ease-out]">
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
                    {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const date = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
                        const isBlocked = isDateBlocked(date);
                        const isSelected = currentSelected &&
                            date.getDate() === currentSelected.getDate() &&
                            date.getMonth() === currentSelected.getMonth() &&
                            date.getFullYear() === currentSelected.getFullYear();

                        const isToday = date.getDate() === today.getDate() &&
                            date.getMonth() === today.getMonth() &&
                            date.getFullYear() === today.getFullYear();

                        return (
                            <button
                                key={day}
                                type="button"
                                disabled={isBlocked}
                                onClick={() => selectDate(day)}
                                className={`
                                    h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition-all relative
                                    ${isSelected ? 'bg-primary text-white shadow-md' : 'text-slate-700 dark:text-slate-300'}
                                    ${!isBlocked && !isSelected ? 'hover:bg-slate-100 dark:hover:bg-slate-700' : ''}
                                    ${isBlocked ? 'opacity-30 cursor-not-allowed bg-slate-50 dark:bg-slate-800 decoration-slate-400' : ''}
                                    ${isToday && !isSelected ? 'ring-2 ring-primary text-primary font-bold' : ''}
                                `}
                            >
                                <span className={isBlocked ? 'line-through' : ''}>{day}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 flex flex-col gap-1">
                    <p>• GA/TN: Mon-Sat | AL/SC: Mon-Fri</p>
                    <p>• Next day booking only</p>
                </div>
            </div>
        );
    };

    // --- Render Components ---

    const renderInput = (field: FormField) => {
        const value = formData[field.id] || '';
        const error = errors[field.id];

        // Custom Render for Appointment Time (Capacity Logic)
        if (field.id === 'appointmentTime') {
            const dateSelected = formData['appointmentDate'];
            const stateSelected = formData['state'];

            return (
                <div className="relative">
                    <select
                        value={value}
                        onChange={e => {
                            setFormData({ ...formData, [field.id]: e.target.value });
                            if (e.target.value) setErrors({ ...errors, [field.id]: false });
                        }}
                        disabled={!dateSelected}
                        className={`w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-500 ring-1 ring-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}
                    >
                        <option value="">{dateSelected ? 'Select a time...' : 'Select a date first...'}</option>
                        {dateSelected && stateSelected && OPERATING_HOURS.map(time => {
                            const isUnavailable = isSlotUnavailable(dateSelected, time, stateSelected);
                            const config = STATE_CONFIG[stateSelected];
                            const currentCount = appointments.filter(a =>
                                a.formData.appointmentDate === dateSelected &&
                                a.formData.appointmentTime === time &&
                                a.formData.state === stateSelected
                            ).length;
                            const remaining = config.capacity - currentCount;

                            // Distinguish between full and blocked for user feedback could be nice, 
                            // but generic "unavailable" is safer for simple logic
                            const isBlockedRule = blockedRules.some(r =>
                                r.date === dateSelected &&
                                r.time === time &&
                                (!r.state || r.state === stateSelected)
                            );

                            return (
                                <option key={time} value={time} disabled={isUnavailable}>
                                    {time} {isBlockedRule ? '(BLOCKED)' : (currentCount >= config.capacity ? '(FULL)' : `(${remaining} left)`)}
                                </option>
                            );
                        })}
                    </select>
                </div>
            );
        }

        switch (field.type) {
            case 'select':
                return (
                    <select
                        value={value}
                        onChange={e => {
                            const newData = { ...formData, [field.id]: e.target.value };
                            // If State changes, clear date and time because rules changed
                            if (field.id === 'state') {
                                newData['appointmentDate'] = '';
                                newData['appointmentTime'] = '';
                            }
                            setFormData(newData);
                            if (e.target.value) setErrors({ ...errors, [field.id]: false });
                        }}
                        className={`w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-primary focus:border-primary ${error ? 'border-red-500 ring-1 ring-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}
                    >
                        <option value="">Select...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            case 'slider':
                return (
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            value={value || 0}
                            onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <span className="w-12 text-center font-bold text-primary bg-primary/10 rounded py-1 text-xs">{value || 0}</span>
                    </div>
                );
            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={e => {
                            setFormData({ ...formData, [field.id]: e.target.value });
                            if (e.target.value) setErrors({ ...errors, [field.id]: false });
                        }}
                        placeholder={field.placeholder}
                        rows={3}
                        className={`w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-primary focus:border-primary ${error ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}
                    />
                );
            case 'date':
                return (
                    <div className="relative" ref={activeDateField === field.id ? calendarRef : null}>
                        <div className="relative">
                            <input
                                type="text"
                                readOnly
                                value={value}
                                placeholder="Select a date..."
                                onClick={() => {
                                    setActiveDateField(activeDateField === field.id ? null : field.id);
                                    if (value) setCalendarViewDate(new Date(value));
                                }}
                                className={`w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-primary focus:border-primary pl-4 pr-10 cursor-pointer ${error ? 'border-red-500 ring-1 ring-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveDateField(activeDateField === field.id ? null : field.id);
                                    if (value) setCalendarViewDate(new Date(value));
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                            </button>
                        </div>
                        {activeDateField === field.id && renderCustomCalendar()}
                    </div>
                );
            default:
                return (
                    <input
                        type={field.type}
                        value={value}
                        onChange={e => {
                            setFormData({ ...formData, [field.id]: e.target.value });
                            if (e.target.value) setErrors({ ...errors, [field.id]: false });
                        }}
                        placeholder={field.placeholder}
                        className={`w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-primary focus:border-primary ${error ? 'border-red-500 ring-1 ring-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}
                    />
                );
        }
    };

    // Filter appointments
    const filteredAppointments = appointments.filter(app => {
        const search = searchQuery.toLowerCase();
        const data = app.formData;
        return (
            (data.homeOwner && data.homeOwner.toLowerCase().includes(search)) ||
            (data.phoneNumber && data.phoneNumber.includes(search)) ||
            (data.address && data.address.toLowerCase().includes(search))
        );
    });

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-800 dark:text-white">
            <Sidebar active="appt" />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-[#1a1d21] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 z-10 shadow-sm shrink-0">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">calendar_add_on</span>
                        Appointment Maker
                    </h1>
                    <div className="flex gap-3">
                        <button onClick={() => { setFormData({}); setErrors({}); }} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 rounded-lg transition-colors">
                            Clear Form
                        </button>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">tune</span>
                            Form Settings
                        </button>
                    </div>
                </header>

                <main className="flex-1 flex overflow-hidden">
                    {/* LEFT COLUMN: FORM ENGINE */}
                    <div className="w-full lg:w-1/2 xl:w-5/12 overflow-y-auto custom-scrollbar p-6 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent">
                        <div className="max-w-xl mx-auto space-y-5 pb-24">
                            {schema.map(field => {
                                if (!isFieldVisible(field, formData)) return null;
                                return (
                                    <div key={field.id} className="animate-[slideIn_0.3s_ease-out]">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                                            <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                                            {errors[field.id] && <span className="text-xs text-red-500 font-bold animate-pulse">Required</span>}
                                        </label>
                                        {renderInput(field)}
                                    </div>
                                );
                            })}

                            <div className="pt-6 sticky bottom-0 bg-gradient-to-t from-white dark:from-[#1a1d21] via-white dark:via-[#1a1d21] to-transparent pb-4">
                                <button
                                    onClick={handleSaveAndCopy}
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.01] active:scale-[0.98]"
                                >
                                    <span className="material-symbols-outlined">content_paste_go</span>
                                    Save & Copy to Clipboard
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: LOG & HISTORY */}
                    <div className="hidden lg:flex flex-1 flex-col bg-slate-50 dark:bg-background-dark/50">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4 bg-white dark:bg-[#1a1d21]">
                            <div className="relative flex-1">
                                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
                                <input
                                    type="text"
                                    placeholder="Search history by name, phone or address..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {filteredAppointments.length} Records
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {filteredAppointments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined text-6xl mb-4 opacity-20">history_edu</span>
                                    <p>No appointment records found.</p>
                                </div>
                            ) : (
                                filteredAppointments.map(record => (
                                    <div key={record.id} className="group bg-white dark:bg-[#1a1d21] rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{record.formData.homeOwner || 'Unknown Homeowner'}</h3>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(record.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingRecord(record); setIsEditModalOpen(true); }} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Edit Text">
                                                    <span className="material-symbols-outlined text-[20px]">edit_note</span>
                                                </button>
                                                <button onClick={() => handleDelete(record.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-sm mb-4">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                                                {record.formData.phoneNumber || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
                                                <span className="truncate">{record.formData.address || 'N/A'} {record.formData.state ? `(${record.formData.state})` : ''}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">event</span>
                                                {record.formData.appointmentDate || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
                                                {record.formData.appointmentTime || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <button
                                                onClick={() => copyToClipboard(record.clipboardSummary)}
                                                className="w-full py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-primary font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                                Copy Again
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>

                {/* --- Modals & Toasts --- */}

                {/* Toast */}
                {toast && (
                    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md animate-[slideIn_0.3s_ease-out] ${toast.type === 'success' ? 'bg-slate-900/90 text-white border-white/10' : 'bg-red-600/90 text-white border-red-400/30'}`}>
                        <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
                        <p className="text-sm font-bold">{toast.message}</p>
                    </div>
                )}

                {/* Settings Modal - Simplified for prototype */}
                {isSettingsOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-[#1a1d21] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Form Builder</h2>
                                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-6">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        <strong>Note:</strong> Reordering and advanced logic editing are simplified in this prototype. Changes here will persist to your local browser storage.
                                    </p>
                                </div>
                                {schema.map((field, idx) => (
                                    <div key={field.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full text-slate-400 font-bold text-xs shadow-sm">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{field.label}</p>
                                            <p className="text-xs text-slate-500 font-mono">{field.id} • {field.type}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const newSchema = [...schema];
                                                    if (idx > 0) {
                                                        [newSchema[idx - 1], newSchema[idx]] = [newSchema[idx], newSchema[idx - 1]];
                                                        setSchema(newSchema);
                                                    }
                                                }}
                                                disabled={idx === 0}
                                                className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newSchema = [...schema];
                                                    if (idx < schema.length - 1) {
                                                        [newSchema[idx + 1], newSchema[idx]] = [newSchema[idx], newSchema[idx + 1]];
                                                        setSchema(newSchema);
                                                    }
                                                }}
                                                disabled={idx === schema.length - 1}
                                                className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                                            </button>
                                            <button
                                                onClick={() => setSchema(schema.filter(f => f.id !== field.id))}
                                                className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <button
                                    onClick={() => {
                                        setSchema(DEFAULT_SCHEMA);
                                        showToast('Schema reset to defaults');
                                    }}
                                    className="text-xs font-bold text-red-500 hover:underline"
                                >
                                    Reset to Default Schema
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Plain Text Edit Modal */}
                {isEditModalOpen && editingRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-[#1a1d21] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col h-[600px]">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Clipboard Summary</h2>
                                    <p className="text-xs text-slate-500">Manually tweak the text before re-saving.</p>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="flex-1 p-6">
                                <textarea
                                    value={editingRecord.clipboardSummary}
                                    onChange={(e) => setEditingRecord({ ...editingRecord, clipboardSummary: e.target.value })}
                                    className="w-full h-full p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-sm resize-none focus:ring-primary focus:border-primary"
                                ></textarea>
                            </div>
                            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleUpdateRecord} className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-colors">
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

export default AppointmentMaker;