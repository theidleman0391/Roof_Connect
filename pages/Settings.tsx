import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// --- Helper Hook (Supabase integration) ---
// (removed useLocalStorage)

const Settings: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();

    // --- State ---
    const [settingsId, setSettingsId] = useState<string | null>(null);
    const [campaign, setCampaign] = useState({
        name: 'Spring Storm Outreach 2024',
        region: 'Southeast (GA, TN, AL, SC)',
        dialerMode: 'Power Dialer',
        callerId: '(404) 555-0123'
    });

    const [preferences, setPreferences] = useState({
        notifications: true
    });

    const [isLogoutLoading, setIsLogoutLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('operating_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setSettingsId(data.id);
                if (data.settings?.campaign) setCampaign(data.settings.campaign);
                if (data.settings?.preferences) setPreferences(data.settings.preferences);
            }
        };
        fetchSettings();
    }, [user]);

    const saveSettings = async (newCampaign: any, newPreferences: any) => {
        if (!user) return;
        const payload = {
            campaign: newCampaign,
            preferences: newPreferences
        };

        if (settingsId) {
            await supabase
                .from('operating_settings')
                .update({ settings: payload })
                .eq('id', settingsId);
        } else {
            const { data } = await supabase
                .from('operating_settings')
                .insert([{ user_id: user.id, settings: payload }])
                .select()
                .single();
            if (data) setSettingsId(data.id);
        }
    };

    // --- Handlers ---
    const handleCampaignChange = (field: string, value: string) => {
        const newCampaign = { ...campaign, [field]: value };
        setCampaign(newCampaign);
        saveSettings(newCampaign, preferences);
    };

    const handlePreferenceChange = () => {
        const newPreferences = { ...preferences, notifications: !preferences.notifications };
        setPreferences(newPreferences);
        saveSettings(campaign, newPreferences);
    };

    const handleLogout = () => {
        setIsLogoutLoading(true);
        // Simulate API call
        setTimeout(async () => {
            await logout();
            setIsLogoutLoading(false);
            navigate('/');
        }, 1000);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-800 dark:text-white">
            <Sidebar active="settings" />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-[#1a1d21] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 z-10 shadow-sm shrink-0">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">settings</span>
                        {t('nav.settings')}
                    </h1>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50 dark:bg-background-dark/50">
                    <div className="max-w-4xl mx-auto space-y-8 pb-20">

                        {/* User Profile Section */}
                        <div className="bg-white dark:bg-[#1a1d21] rounded-xl shadow-card border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-500">account_circle</span>
                                    User Information
                                </h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-start">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-4 border-white dark:border-slate-600 shadow-md">
                                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    </div>
                                    <button className="text-xs font-bold text-primary hover:underline">Change Photo</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Full Name</label>
                                        <input
                                            type="text"
                                            value={user.name}
                                            onChange={(e) => updateUser({ name: e.target.value })}
                                            className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Email Address</label>
                                        <input
                                            type="email"
                                            value={user.email}
                                            onChange={(e) => updateUser({ email: e.target.value })}
                                            className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Role / Title (Managed by Admin)</label>
                                        <select
                                            value={user.role}
                                            disabled
                                            className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-500 text-sm cursor-not-allowed appearance-none"
                                        >
                                            <option value="Admin">Admin</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Sales Agent">Sales Agent</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Agent ID</label>
                                        <input
                                            type="text"
                                            value={user.agentId}
                                            disabled
                                            className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-500 text-sm cursor-not-allowed font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Campaign Information */}
                        <div className="bg-white dark:bg-[#1a1d21] rounded-xl shadow-card border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-500">campaign</span>
                                    Campaign Information
                                </h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Active Campaign</label>
                                    <select
                                        value={campaign.name}
                                        onChange={(e) => handleCampaignChange('name', e.target.value)}
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary"
                                    >
                                        <option>Spring Storm Outreach 2024</option>
                                        <option>Q3 Maintenance Checkups</option>
                                        <option>Past Client Reactivation</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Target Region</label>
                                    <input
                                        type="text"
                                        value={campaign.region}
                                        onChange={(e) => handleCampaignChange('region', e.target.value)}
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Dialing Mode</label>
                                    <select
                                        value={campaign.dialerMode}
                                        onChange={(e) => handleCampaignChange('dialerMode', e.target.value)}
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary"
                                    >
                                        <option>Power Dialer</option>
                                        <option>Predictive Dialer</option>
                                        <option>Manual Click-to-Call</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Outbound Caller ID</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={campaign.callerId}
                                            onChange={(e) => handleCampaignChange('callerId', e.target.value)}
                                            className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary font-mono"
                                        />
                                        <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700">
                                            Test
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preferences & Language */}
                        <div className="bg-white dark:bg-[#1a1d21] rounded-xl shadow-card border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-500">tune</span>
                                    Preferences
                                </h2>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">Interface Language</span>
                                        <span className="text-xs text-slate-500">Choose your preferred language for the CRM interface.</span>
                                    </div>
                                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <button
                                            onClick={() => setLanguage('en')}
                                            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                                        >
                                            English
                                        </button>
                                        <button
                                            onClick={() => setLanguage('es')}
                                            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${language === 'es' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                                        >
                                            Español
                                        </button>
                                    </div>
                                </div>
                                <div className="h-px bg-slate-100 dark:bg-slate-800"></div>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">Desktop Notifications</span>
                                        <span className="text-xs text-slate-500">Receive alerts for new callbacks and upcoming appointments.</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences.notifications}
                                            onChange={handlePreferenceChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Account Actions */}
                        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden">
                            <div className="p-4 border-b border-red-100 dark:border-red-900/30 flex items-center justify-between">
                                <h2 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                                    <span className="material-symbols-outlined">logout</span>
                                    Session
                                </h2>
                            </div>
                            <div className="p-6 flex items-center justify-between">
                                <p className="text-sm text-red-800/70 dark:text-red-300/70">
                                    Securely end your current session. All unsaved changes will be lost.
                                </p>
                                <button
                                    onClick={handleLogout}
                                    disabled={isLogoutLoading}
                                    className="px-6 py-2 bg-white dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/60 transition-colors flex items-center gap-2"
                                >
                                    {isLogoutLoading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                                            Logging out...
                                        </>
                                    ) : (
                                        <>
                                            Log Out
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default Settings;