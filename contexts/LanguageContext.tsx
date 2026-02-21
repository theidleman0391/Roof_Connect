import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'es';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    en: {
        "app.name": "RoofConnect",
        "app.subtitle": "Roofing CRM",
        "nav.script": "Active Script",
        "nav.appt": "Appt. Maker",
        "nav.calendar": "Calendar",
        "nav.callbacks": "Callbacks",
        "nav.settings": "Settings",
        "nav.system": "System",
        "user.online": "Online",
    },
    es: {
        "app.name": "RoofConnect",
        "app.subtitle": "CRM de Techos",
        "nav.script": "Guión Activo",
        "nav.appt": "Citas",
        "nav.calendar": "Calendario",
        "nav.callbacks": "Llamadas",
        "nav.settings": "Ajustes",
        "nav.system": "Sistema",
        "user.online": "En Línea",
    }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(() => {
        const stored = localStorage.getItem('crm_language');
        return (stored === 'es' ? 'es' : 'en');
    });

    useEffect(() => {
        localStorage.setItem('crm_language', language);
    }, [language]);

    const t = (key: string) => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
