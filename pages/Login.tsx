import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/script');
        });
    }, [navigate]);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.name,
                            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`
                        }
                    }
                });

                if (error) throw error;

                if (data.user && !data.session) {
                    setMessage("Account created! Please check your email to confirm your registration.");
                } else if (data.session) {
                    navigate('/script');
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                });

                if (error) throw error;

                if (data.session) {
                    navigate('/script');
                }
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during authentication.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark p-4 overflow-y-auto">
            <div className="w-full max-w-md space-y-4 sm:space-y-6 bg-white dark:bg-[#1a1d21] p-5 sm:p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 my-auto">

                {/* Company Branding */}
                <div className="flex flex-col items-center justify-center gap-1 sm:gap-1.5">
                    <div className="bg-primary/10 p-2 sm:p-2.5 rounded-xl border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-3xl sm:text-4xl">roofing</span>
                    </div>
                    <h1 className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Roof Connect</h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium tracking-wide uppercase">Roofing CRM</p>
                </div>

                <div className="text-center pt-0 sm:pt-2">
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {isSignUp ? 'Create an account' : 'Welcome back'}
                    </h2>
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {isSignUp ? 'Start managing your leads today' : 'Please enter your details to sign in'}
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

                <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-4 sm:space-y-5">
                    <div className="space-y-4">
                        {isSignUp && (
                            <div className="space-y-1">
                                <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-slate-400 text-[20px]">person</span>
                                    </div>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required={isSignUp}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="block w-full pl-10 pr-3 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-sm transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">mail</span>
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-sm transition-all"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">lock</span>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-sm transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    {!isSignUp && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 dark:text-slate-400">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-bold text-primary hover:text-primary-dark">
                                    Forgot password?
                                </a>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                Processing...
                            </span>
                        ) : (
                            isSignUp ? 'Create Account' : 'Sign in'
                        )}
                    </button>



                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm font-medium text-primary hover:text-primary-dark hover:underline transition-colors"
                        >
                            {isSignUp
                                ? "Already have an account? Sign in"
                                : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;