import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { QualificationState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// --- Types ---
interface ScriptStep {
    id: string;
    title: string;
    content: string;
    estTime?: string;
    completed?: boolean;
    isCustom?: boolean;
}

interface Rebuttal {
    id: string;
    title: string;
    content: string;
}

// --- Defaults ---
const DEFAULT_SCRIPT_STEPS: ScriptStep[] = [
    {
        id: 'step-1',
        title: 'The Hook',
        content: '"Hi, this is <span class="highlight">Mike</span> with CCDOCS. I\'m calling because we\'re currently in the <span class="highlight">Springfield</span> area providing free roof assessments after the recent storms. Am I speaking with the homeowner at <span class="highlight">123 Maple St</span>?"',
        estTime: '30s',
        completed: true
    }
];

const DEFAULT_REBUTTALS: Rebuttal[] = [
    {
        id: 'r1',
        title: 'Not Interested',
        content: '"I completely understand. I\'m not asking for you to sign anything or buy anything today. We are simply in the area providing complimentary property condition reports to document recent storm activity. It only takes about 10 minutes and gives you peace of mind. Would you be opposed to having a professional take a quick look?"'
    },
    {
        id: 'r2',
        title: 'I have a new roof',
        content: '"That\'s great news! Just to clarify, when you say \'new\', was it replaced within the last 2 or 3 years? ... (If older/unsure): Actually, roofs over 10 years old are often the most vulnerable to recent storms, even if they look fine from the ground. Since we\'re already here, a quick check could save you a headache later if there is minor damage we catch early."'
    },
    {
        id: 'r3',
        title: 'Wrong Number',
        content: '"Oh, I apologize for the disturbance! I have this number listed for the homeowner at 123 Maple St. Is that not this property? ... Understood. I will update our database immediately so you don\'t receive further calls from us. Sorry again, and have a wonderful day!"'
    },
    {
        id: 'r4',
        title: 'Already have a roofer',
        content: '"That\'s excellent! We work alongside many local contractors. However, getting a second opinion is standard practice in this industry, especially when it costs you absolutely nothing. Think of it as a free data point for your records to ensure everything is being handled 100% correctly. Would you be open to a quick 10-minute assessment?"'
    }
];

// --- Hook ---
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
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };
    return [storedValue, setValue] as const;
}

const ActiveScript: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- State ---
    const [scriptSteps, setScriptSteps] = useState<ScriptStep[]>(DEFAULT_SCRIPT_STEPS);
    const [rebuttals, setRebuttals] = useState<Rebuttal[]>(DEFAULT_REBUTTALS);

    // Call Progress State
    const [currentStage, setCurrentStage] = useState(1);

    // UI State for Editing/AI
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempContent, setTempContent] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiTargetId, setAiTargetId] = useState<string | null>(null); // ID of script or rebuttal being targeted
    const [aiTargetType, setAiTargetType] = useState<'script' | 'rebuttal'>('script');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            // Fetch Script Steps for this user
            const { data: scriptData } = await supabase
                .from('script_steps')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (scriptData && scriptData.length > 0) {
                setScriptSteps(scriptData.map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    content: s.content,
                    estTime: s.est_time,
                    completed: s.completed,
                    isCustom: s.is_custom
                })));
            } else {
                // If no custom steps exist for this user, start with defaults
                setScriptSteps(DEFAULT_SCRIPT_STEPS);
            }

            // Fetch Rebuttals for this user
            const { data: rebuttalData } = await supabase
                .from('rebuttals')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (rebuttalData && rebuttalData.length > 0) {
                setRebuttals(rebuttalData);
            } else {
                // If no custom rebuttals exist for this user, start with defaults
                setRebuttals(DEFAULT_REBUTTALS);
            }
        };

        fetchData();
    }, [user]);

    // --- Actions ---

    const handleEditStart = (id: string, content: string) => {
        setEditingId(id);
        setTempContent(content.replace(/<span class="highlight">/g, '').replace(/<\/span>/g, ''));
    };

    const handleEditSave = async (id: string, type: 'script' | 'rebuttal') => {
        if (!user) return;

        if (type === 'script') {
            const currentStep = scriptSteps.find(s => s.id === id);
            if (!currentStep) return;

            const hasDefaults = scriptSteps.some(s => s.id.startsWith('step-'));

            if (hasDefaults) {
                // Migrate defaults to DB
                // Prepare all steps, applying the current edit to the target step
                const stepsToSave = scriptSteps.map(s => {
                    if (s.id === id) {
                        return { ...s, content: tempContent, title: s.title };
                    }
                    return s;
                });

                const payload = stepsToSave.map(s => ({
                    user_id: user.id,
                    title: s.title,
                    content: s.content,
                    est_time: s.estTime,
                    completed: s.completed || false,
                    is_custom: true
                }));

                const { data, error } = await supabase.from('script_steps').insert(payload).select();

                if (data) {
                    const mappedSteps = data.map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        content: s.content,
                        estTime: s.est_time,
                        completed: s.completed,
                        isCustom: s.is_custom
                    }));
                    setScriptSteps(mappedSteps);
                } else if (error) {
                    console.error('Error migrating default steps:', error);
                }

            } else {
                // Normal update for existing DB rows
                const updated = scriptSteps.map(s => s.id === id ? { ...s, content: tempContent } : s);
                setScriptSteps(updated);

                const { error } = await supabase
                    .from('script_steps')
                    .update({ content: tempContent, title: currentStep.title })
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Error saving script step:', error);
                }
            }
        } else {
            // Rebuttal Logic
            const currentRebuttal = rebuttals.find(r => r.id === id);
            if (!currentRebuttal) return;

            const hasDefaults = rebuttals.some(r => r.id.startsWith('r') && r.id.length < 5);

            if (hasDefaults) {
                // Migrate defaults to DB
                const rebuttalsToSave = rebuttals.map(r => {
                    if (r.id === id) {
                        return { ...r, content: tempContent, title: r.title };
                    }
                    return r;
                });

                const payload = rebuttalsToSave.map(r => ({
                    user_id: user.id,
                    title: r.title,
                    content: r.content
                }));

                const { data, error } = await supabase.from('rebuttals').insert(payload).select();

                if (data) {
                    setRebuttals(data);
                } else if (error) {
                    console.error('Error migrating default rebuttals:', error);
                }
            } else {
                // Normal Update
                const updated = rebuttals.map(r => r.id === id ? { ...r, content: tempContent } : r);
                setRebuttals(updated);

                const { error } = await supabase
                    .from('rebuttals')
                    .update({ content: tempContent, title: currentRebuttal.title })
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Error saving rebuttal:', error);
                }
            }
        }
        setEditingId(null);
    };

    const handleAddScriptStep = async () => {
        if (!user) return;

        const newStepPayload = {
            title: 'New Section',
            content: 'Write your script content here...',
            est_time: '1m',
            is_custom: true,
            user_id: user.id,
            completed: false
        };

        const hasDefaults = scriptSteps.some(s => s.id.startsWith('step-'));

        if (hasDefaults) {
            const existingPayload = scriptSteps.map(s => ({
                user_id: user.id,
                title: s.title,
                content: s.content,
                est_time: s.estTime,
                completed: s.completed || false,
                is_custom: true
            }));

            const fullPayload = [...existingPayload, newStepPayload];
            const { data, error } = await supabase.from('script_steps').insert(fullPayload).select();

            if (data) {
                const mappedSteps = data.map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    content: s.content,
                    estTime: s.est_time,
                    completed: s.completed,
                    isCustom: s.is_custom
                }));
                setScriptSteps(mappedSteps);
                const lastStep = mappedSteps[mappedSteps.length - 1];
                handleEditStart(lastStep.id, lastStep.content);
            }
        } else {
            const { data, error } = await supabase.from('script_steps').insert([newStepPayload]).select().single();

            if (data) {
                const mappedStep: ScriptStep = {
                    id: data.id,
                    title: data.title,
                    content: data.content,
                    estTime: data.est_time,
                    completed: data.completed,
                    isCustom: data.is_custom
                };
                setScriptSteps([...scriptSteps, mappedStep]);
                handleEditStart(mappedStep.id, mappedStep.content);
            }
        }
    };

    const handleAddRebuttal = async () => {
        if (!user) return;

        const newRebuttalPayload = {
            title: 'New Rebuttal',
            content: 'Write your rebuttal here...',
            user_id: user.id
        };

        const hasDefaults = rebuttals.some(r => r.id.startsWith('r') && r.id.length < 5);

        if (hasDefaults) {
            const existingPayload = rebuttals.map(r => ({
                user_id: user.id,
                title: r.title,
                content: r.content
            }));

            const fullPayload = [...existingPayload, newRebuttalPayload];
            const { data, error } = await supabase.from('rebuttals').insert(fullPayload).select();

            if (data) {
                setRebuttals(data);
                const lastRebuttal = data[data.length - 1];
                handleEditStart(lastRebuttal.id, lastRebuttal.content);
            }
        } else {
            const { data, error } = await supabase.from('rebuttals').insert([newRebuttalPayload]).select().single();

            if (data) {
                setRebuttals([...rebuttals, data]);
                handleEditStart(data.id, data.content);
            }
        }
    };

    const handleDelete = async (id: string, type: 'script' | 'rebuttal') => {
        if (type === 'script') {
            setScriptSteps(scriptSteps.filter(s => s.id !== id));
            if (user) await supabase.from('script_steps').delete().eq('id', id);
        } else {
            setRebuttals(rebuttals.filter(r => r.id !== id));
            if (user) await supabase.from('rebuttals').delete().eq('id', id);
        }
    };

    const openAiModal = (id: string, type: 'script' | 'rebuttal') => {
        setAiTargetId(id);
        setAiTargetType(type);
        setAiPrompt('');
        setIsAiModalOpen(true);
    };

    const handleAiGenerate = async () => {
        if (!aiTargetId) {
            alert("Invalid context for AI generation.");
            return;
        }

        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
        if (!apiKey) {
            alert("API Key is not configured. Please add VITE_GOOGLE_API_KEY to your .env file.");
            return;
        }

        setIsGenerating(true);
        try {
            // Retrieve current content context
            let currentText = '';
            if (aiTargetType === 'script') {
                currentText = scriptSteps.find(s => s.id === aiTargetId)?.content || '';
            } else {
                currentText = rebuttals.find(r => r.id === aiTargetId)?.content || '';
            }

            const promptText = `Act as a world-class sales copywriter for a roofing CRM.
Task: Rewrite or generate a script segment.
Context: The user is a roofing sales agent cold calling or following up with a homeowner.
User Instruction: "${aiPrompt}"
Original Text (if any): "${currentText}"

Requirements:
- Keep it conversational, confident, and professional.
- Be concise.
- Do not include markdown formatting or quotes around the output.`;

            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: promptText
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 500,
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('API Error:', error);
                throw new Error(error.error?.message || 'Failed to generate content');
            }

            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (resultText) {
                if (aiTargetType === 'script') {
                    setScriptSteps(scriptSteps.map(s => s.id === aiTargetId ? { ...s, content: resultText } : s));
                } else {
                    setRebuttals(rebuttals.map(r => r.id === aiTargetId ? { ...r, content: resultText } : r));
                }
                setIsAiModalOpen(false);
            } else {
                throw new Error('No content generated');
            }
        } catch (error) {
            console.error('Error generating content:', error);
            alert(`AI Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Check your API key and try again.`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('Are you sure you want to reset the script and rebuttals to default? This will delete all your customizations.')) return;

        if (user) {
            await supabase.from('script_steps').delete().eq('user_id', user.id);
            await supabase.from('rebuttals').delete().eq('user_id', user.id);
        }

        setScriptSteps(DEFAULT_SCRIPT_STEPS);
        setRebuttals(DEFAULT_REBUTTALS);
        setCurrentStage(1);
    };

    // --- Renderers ---

    const renderScriptContent = (text: string) => {
        // Simple highlighter for demo purposes - in real app use a sanitizer
        return { __html: text };
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-800 dark:text-white">
            <Sidebar active="script" />

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Navbar */}
                <header className="h-16 bg-white dark:bg-[#1a1d21] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 z-10 shadow-subtle shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600 text-[20px] animate-pulse">record_voice_over</span>
                                <h2 className="text-slate-900 dark:text-white font-bold text-base">Active Call: 00:45</h2>
                            </div>
                            <p className="text-slate-500 text-xs mt-0.5">Lead: <span className="font-medium text-slate-700 dark:text-slate-300">John Doe</span> • 123 Maple St, Springfield</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 text-sm font-semibold rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900">
                            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                            Reset
                        </button>

                    </div>
                </header>

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-6 pb-24">
                        {/* Progress Stepper */}
                        {/* Progress Stepper */}
                        <div className="flex items-center justify-between mb-8 px-2">
                            {/* Step 1: Intro */}
                            <div className="flex flex-col items-center relative z-10 w-24 cursor-pointer group" onClick={() => setCurrentStage(1)}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ring-4 ring-background-light dark:ring-background-dark mb-2 transition-colors ${currentStage >= 1 ? 'bg-primary text-white' : 'bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-slate-400'}`}>
                                    {currentStage > 1 ? <span className="material-symbols-outlined text-[16px]">check</span> : '1'}
                                </div>
                                <p className={`text-xs font-bold text-center transition-colors ${currentStage >= 1 ? 'text-primary' : 'text-slate-400'}`}>Intro</p>
                            </div>

                            {/* Line 1 -> 2 */}
                            <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 relative top-[-14px] -mx-4 overflow-hidden">
                                <div className={`absolute top-0 left-0 h-full bg-primary transition-all duration-500 rounded-full ${currentStage > 1 ? 'w-full' : 'w-0'}`}></div>
                            </div>

                            {/* Step 2: Qualify */}
                            <div className="flex flex-col items-center relative z-10 w-24 cursor-pointer group" onClick={() => setCurrentStage(2)}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ring-4 ring-background-light dark:ring-background-dark mb-2 transition-colors ${currentStage >= 2 ? 'bg-primary text-white' : 'bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-slate-400'} ${currentStage === 2 ? 'ring-primary/20' : ''}`}>
                                    {currentStage > 2 ? <span className="material-symbols-outlined text-[16px]">check</span> : '2'}
                                </div>
                                <p className={`text-xs font-bold text-center transition-colors ${currentStage >= 2 ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>Qualify</p>
                            </div>

                            {/* Line 2 -> 3 */}
                            <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 relative top-[-14px] -mx-4 overflow-hidden">
                                <div className={`absolute top-0 left-0 h-full bg-primary transition-all duration-500 rounded-full ${currentStage > 2 ? 'w-full' : 'w-0'}`}></div>
                            </div>

                            {/* Step 3: Closing */}
                            <div className="flex flex-col items-center relative z-10 w-24 cursor-pointer group" onClick={() => setCurrentStage(3)}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ring-4 ring-background-light dark:ring-background-dark mb-2 transition-colors ${currentStage >= 3 ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400'} ${currentStage === 3 ? 'ring-primary/20' : ''}`}>
                                    3
                                </div>
                                <p className={`text-xs font-medium text-center transition-colors ${currentStage >= 3 ? 'text-primary font-bold' : 'text-slate-400'}`}>Closing</p>
                            </div>
                        </div>

                        {/* --- SCRIPT SECTIONS --- */}
                        <div className="space-y-6">
                            {scriptSteps.map((step, index) => (
                                <div key={step.id} className="bg-white dark:bg-[#1a1d21] rounded-xl shadow-card border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${step.completed ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                {editingId === step.id ? (
                                                    <input
                                                        type="text"
                                                        value={step.title}
                                                        onChange={(e) => {
                                                            const newTitle = e.target.value;
                                                            setScriptSteps(scriptSteps.map(s => s.id === step.id ? { ...s, title: newTitle } : s));
                                                        }}
                                                        className="font-bold text-lg bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-1 focus:ring-2 focus:ring-primary w-full"
                                                    />
                                                ) : (
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                        {step.completed && <span className="material-symbols-outlined text-green-500">check_circle</span>}
                                                        {step.title}
                                                    </h3>
                                                )}
                                                <p className="text-slate-500 text-sm mt-1">Est. time: {step.estTime || 'N/A'}</p>
                                            </div>

                                            <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                {editingId === step.id ? (
                                                    <>
                                                        <button onClick={() => handleEditSave(step.id, 'script')} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200">
                                                            <span className="material-symbols-outlined">check</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => openAiModal(step.id, 'script')} className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50" title="Generate with AI">
                                                            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                                        </button>
                                                        <button onClick={() => handleEditStart(step.id, step.content)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200" title="Edit">
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </button>
                                                        {step.isCustom && (
                                                            <button onClick={() => handleDelete(step.id, 'script')} className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded hover:bg-red-200" title="Delete">
                                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="prose prose-slate dark:prose-invert max-w-none">
                                            {editingId === step.id ? (
                                                <textarea
                                                    value={tempContent}
                                                    onChange={(e) => setTempContent(e.target.value)}
                                                    className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                />
                                            ) : (
                                                <p
                                                    className="text-slate-600 dark:text-slate-300 text-base leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50"
                                                    dangerouslySetInnerHTML={renderScriptContent(step.content)}
                                                ></p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Step Button */}
                        <div className="flex justify-center">
                            <button onClick={handleAddScriptStep} className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors border border-dashed border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/5">
                                <span className="material-symbols-outlined">add_circle</span>
                                Add Custom Script Section
                            </button>
                        </div>

                        {/* Objection Handling */}
                        <div className="bg-white dark:bg-[#1a1d21] rounded-xl shadow-card border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500">shield</span>
                                    Objection Handling
                                </h3>
                                <button onClick={handleAddRebuttal} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">add</span> Add Rebuttal
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {rebuttals.map(rebuttal => (
                                    <details key={rebuttal.id} className="group">
                                        <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                {editingId === rebuttal.id ? (
                                                    <input
                                                        type="text"
                                                        value={rebuttal.title}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            const newTitle = e.target.value;
                                                            setRebuttals(rebuttals.map(r => r.id === rebuttal.id ? { ...r, title: newTitle } : r));
                                                        }}
                                                        className="font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 text-sm w-48"
                                                    />
                                                ) : (
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">"{rebuttal.title}"</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {editingId !== rebuttal.id && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openAiModal(rebuttal.id, 'rebuttal'); }}
                                                            className="p-1 text-purple-400 hover:text-purple-600"
                                                            title="Generate with AI"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditStart(rebuttal.id, rebuttal.content); }}
                                                            className="p-1 text-slate-400 hover:text-primary"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(rebuttal.id, 'rebuttal'); }}
                                                            className="p-1 text-slate-400 hover:text-red-500"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        </button>
                                                    </div>
                                                )}
                                                <span className="material-symbols-outlined text-slate-400 transition-transform group-open:rotate-180">expand_more</span>
                                            </div>
                                        </summary>
                                        <div className="px-4 pb-4 pt-0">
                                            {editingId === rebuttal.id ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={tempContent}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => setTempContent(e.target.value)}
                                                        className="w-full p-2 text-sm border rounded bg-slate-50 dark:bg-slate-900 dark:border-slate-600"
                                                        rows={3}
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs font-bold text-slate-500">Cancel</button>
                                                        <button onClick={() => handleEditSave(rebuttal.id, 'rebuttal')} className="px-3 py-1 text-xs font-bold bg-green-500 text-white rounded">Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                    {rebuttal.content}
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Sticky Footer */}
                <footer className="bg-white dark:bg-[#1a1d21] border-t border-slate-200 dark:border-slate-700 p-4 shrink-0 z-20">
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors">
                            <span className="material-symbols-outlined">block</span>
                            Log as Disqualified
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/callbacks?new=true')}
                                className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors"
                            >
                                Callback Later
                            </button>
                            <button onClick={() => navigate('/appointment')} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg shadow-lg shadow-blue-500/30 transition-transform active:scale-95">
                                <span>Proceed to Scheduling</span>
                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </footer>

                {/* AI Generator Modal */}
                {isAiModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[slideIn_0.1s_ease-out]">
                        <div className="bg-white dark:bg-[#1a1d21] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 flex justify-between items-center">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                    AI Script Generator
                                </h3>
                                <button onClick={() => setIsAiModalOpen(false)} className="text-white/80 hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                                    Describe how you want to change or write this section.
                                </p>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder='e.g., "Make it sound more urgent", "Shorten it for a busy homeowner", "Rewrite to focus on storm damage"'
                                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-purple-500 focus:border-purple-500 mb-4"
                                    rows={3}
                                />
                                <button
                                    onClick={handleAiGenerate}
                                    disabled={!aiPrompt.trim() || isGenerating}
                                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isGenerating ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin">refresh</span>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">magic_button</span>
                                            Generate
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActiveScript;