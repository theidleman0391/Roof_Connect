import React from 'react';

interface Props {
    children: React.ReactNode;
}

interface State {
    error: Error | null;
}

// React 19 still requires a class component for error boundaries.
// @types/react is not installed in this project, so we cast Component to `any`
// to work around missing generic type information.
const BaseComponent = React.Component as any;

class ErrorBoundary extends BaseComponent {
    state: State;

    constructor(props: Props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ error: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        const state = this.state as State;
        const props = this.props as Props;
        if (state.error) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-6">
                    <div className="max-w-lg w-full bg-white dark:bg-[#1a1d21] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined" style={{ fontSize: 32 }}>error</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Something went wrong</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            An unexpected error occurred. You can try to recover, or reload the page.
                        </p>
                        <pre className="text-left text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-3 overflow-auto max-h-40 mb-6 text-slate-700 dark:text-slate-300">
                            {state.error.message}
                        </pre>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Try again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors"
                            >
                                Reload page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return props.children;
    }
}

export default ErrorBoundary as unknown as React.ComponentType<Props>;
