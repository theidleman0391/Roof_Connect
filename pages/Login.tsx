import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';

type Mode = 'signin' | 'signup' | 'forgot';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>('signin');
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/dashboard');
        });
    }, [navigate]);

    const changeMode = (m: Mode) => {
        setMode(m);
        setError(null);
        setMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.name,
                            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`,
                        },
                    },
                });
                if (error) throw error;
                if (data.user && !data.session) {
                    setMessage('Account created! Please check your email to confirm your registration.');
                } else if (data.session) {
                    navigate('/dashboard');
                }
            } else if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
                    redirectTo: window.location.origin,
                });
                if (error) throw error;
                setMessage('If an account exists for that email, a password reset link has been sent.');
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });
                if (error) throw error;
                if (data.session) navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during authentication.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark p-4 overflow-y-auto">
            <div className="w-full max-w-md space-y-4 sm:space-y-6 bg-white dark:bg-[#1a1d21] p-5 sm:p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 my-auto">
                <div className="flex flex-col items-center justify-center gap-1 sm:gap-1.5">
                    <div className="bg-primary/10 p-2 sm:p-2.5 rounded-xl border border-primary/20">
                        <Icon name="roofing" className="text-primary" size={36} />
                    </div>
                    <h1 className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Roof Connect</h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium tracking-wide uppercase">Roofing CRM</p>
                </div>

                <div className="text-center pt-0 sm:pt-2">
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {mode === 'signup' ? 'Create an account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}
                    </h2>
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {mode === 'signup'
                            ? 'Start managing your leads today'
                            : mode === 'forgot'
                                ? "Enter your email and we'll send you a reset link"
                                : 'Please enter your details to sign in'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm text-center">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-5">
                    {mode === 'signup' && (
                        <Input
                            id="name"
                            label="Full Name"
                            icon="person"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                        />
                    )}

                    <Input
                        id="email"
                        type="email"
                        label="Email Address"
                        icon="mail"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="name@company.com"
                    />

                    {mode !== 'forgot' && (
                        <Input
                            id="password"
                            label="Password"
                            icon="lock"
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            toggleVisibility
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                        />
                    )}

                    {mode === 'signin' && (
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                />
                                Remember me
                            </label>
                            <button
                                type="button"
                                onClick={() => changeMode('forgot')}
                                className="text-sm font-bold text-primary hover:text-primary-dark hover:underline transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    <Button
                        type="submit"
                        isLoading={isLoading}
                        fullWidth
                        size="lg"
                        className="py-3 shadow-lg shadow-blue-500/30 rounded-xl"
                    >
                        {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
                    </Button>

                    <div className="text-center mt-4 space-y-2">
                        {mode === 'forgot' ? (
                            <button
                                type="button"
                                onClick={() => changeMode('signin')}
                                className="text-sm font-medium text-primary hover:text-primary-dark hover:underline transition-colors"
                            >
                                ← Back to sign in
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => changeMode(mode === 'signup' ? 'signin' : 'signup')}
                                className="text-sm font-medium text-primary hover:text-primary-dark hover:underline transition-colors"
                            >
                                {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
