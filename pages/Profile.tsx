import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const Profile: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [uploading, setUploading] = useState(false);

    // Mock Metrics for now - in real app, fetch these
    const metrics = {
        callsToday: 45,
        appointmentsBooked: 3,
        conversionRate: '12%',
        avgCallDuration: '4m 12s'
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                // If bucket doesn't exist or permissions fail, fallback to alert or handling
                // For MVP without confirmed storage setup:
                alert("Upload failed (Storage bucket 'avatars' may not exist). Please use an image URL instead.");
                throw uploadError;
            }

            // Get URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            if (data) {
                await updateUser({ avatar: data.publicUrl });
            }

        } catch (error: any) {
            console.error('Error uploading avatar:', error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-800 dark:text-white">
            <Sidebar active="profile" />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="max-w-5xl mx-auto space-y-8 pb-20">

                        {/* Profile Header */}
                        <div className="relative bg-white dark:bg-[#1a1d21] rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-8">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-700 shadow-xl bg-slate-200">
                                    <img
                                        src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}`}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer text-white font-bold text-xs flex-col gap-1">
                                    <span className="material-symbols-outlined">upload</span>
                                    <span>Change</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        disabled={uploading}
                                        className="hidden"
                                    />
                                </label>
                                {uploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                        <span className="material-symbols-outlined animate-spin text-white">refresh</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 text-center md:text-left space-y-2">
                                <h1 className="text-3xl font-black text-slate-900 dark:text-white">{user?.name}</h1>
                                <div className="flex items-center justify-center md:justify-start gap-3">
                                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20">
                                        {user?.role}
                                    </span>
                                    <span className="text-slate-400 text-sm font-mono">{user?.agentId}</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 max-w-lg">
                                    Top performing sales agent focusing on the Southeast region. Consistently exceeds monthly targets.
                                </p>
                            </div>
                        </div>

                        {/* Overall Metrics Grid */}
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">bar_chart</span>
                                Performance Metrics
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-[#1a1d21] p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <p className="text-slate-500 text-sm font-medium mb-1">Total Calls (Day)</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{metrics.callsToday}</p>
                                    <div className="mt-2 text-xs font-bold text-green-600 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">trending_up</span>
                                        +12% vs yesterday
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-[#1a1d21] p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <p className="text-slate-500 text-sm font-medium mb-1">Appointments Set</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{metrics.appointmentsBooked}</p>
                                    <div className="mt-2 text-xs font-bold text-green-600 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">trending_up</span>
                                        On track for goal
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-[#1a1d21] p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <p className="text-slate-500 text-sm font-medium mb-1">Conversion Rate</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{metrics.conversionRate}</p>
                                    <div className="mt-2 text-xs font-bold text-slate-400">
                                        Last 30 days
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-[#1a1d21] p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <p className="text-slate-500 text-sm font-medium mb-1">Avg Call Duration</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{metrics.avgCallDuration}</p>
                                    <div className="mt-2 text-xs font-bold text-slate-400">
                                        Optimal engagement
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default Profile;
