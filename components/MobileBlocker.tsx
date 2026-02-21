import React, { useState, useEffect } from 'react';

const MobileBlocker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [language, setLanguage] = useState<'en' | 'es'>('en');

    useEffect(() => {
        const checkMobile = () => {
            // Set 1024px as the minimum threshold for desktop view
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'es' : 'en');
    };

    if (isMobile) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6 text-center text-slate-800 dark:text-white">
                <button
                    onClick={toggleLanguage}
                    className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-dark rounded-full shadow-subtle hover:shadow-md transition-shadow"
                >
                    <span className="material-symbols-outlined text-sm">language</span>
                    <span className="font-medium text-sm">{language === 'en' ? 'Español' : 'English'}</span>
                </button>

                <span className="material-symbols-outlined text-8xl text-primary mb-6">desktop_windows</span>

                {language === 'en' ? (
                    <>
                        <h1 className="text-3xl font-extrabold mb-4 tracking-tight">Desktop Required</h1>
                        <div className="h-1 w-16 bg-primary rounded-full mb-6 mx-auto"></div>
                        <p className="text-lg text-slate-600 dark:text-gray-400 max-w-sm leading-relaxed">
                            Rooftop CRM is a powerful tool designed exclusively for desktop environments. Please open this site on a laptop or desktop computer to log in and use the application.
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-extrabold mb-4 tracking-tight">Se Requiere Computadora</h1>
                        <div className="h-1 w-16 bg-primary rounded-full mb-6 mx-auto"></div>
                        <p className="text-lg text-slate-600 dark:text-gray-400 max-w-sm leading-relaxed">
                            Rooftop CRM es una herramienta poderosa diseñada exclusivamente para entornos de escritorio. Por favor, abra este sitio en una computadora portátil o de escritorio para iniciar sesión y utilizar la aplicación.
                        </p>
                    </>
                )}
            </div>
        );
    }

    return <>{children}</>;
};

export default MobileBlocker;
