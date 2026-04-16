import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';

import ActiveScript from './pages/ActiveScript';
import AppointmentMaker from './pages/AppointmentMaker';
import CallbackManager from './pages/CallbackManager';
import ScheduleGrid from './pages/ScheduleGrid';
import Settings from './pages/Settings';
import Registry from './pages/Registry';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

import ProtectedRoute from './components/ProtectedRoute';
import MobileBlocker from './components/MobileBlocker';
import ErrorBoundary from './components/ErrorBoundary';
import Splash from './components/Splash';
import GlobalSearch from './components/GlobalSearch';

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <MobileBlocker>
                <ThemeProvider>
                    <AuthProvider>
                        <LanguageProvider>
                            <ConfirmProvider>
                                <ToastProvider>
                                    <HashRouter>
                                        <AppShell />
                                    </HashRouter>
                                </ToastProvider>
                            </ConfirmProvider>
                        </LanguageProvider>
                    </AuthProvider>
                </ThemeProvider>
            </MobileBlocker>
        </ErrorBoundary>
    );
};

const AppShell: React.FC = () => {
    const { loading, isAuthenticated } = useAuth();
    const { pathname } = useLocation();

    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    if (loading) return <Splash />;

    return (
        <>
            {isAuthenticated && <GlobalSearch />}
            <Routes>
                <Route path="/" element={<Login />} />

                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/script" element={<ActiveScript />} />
                    <Route path="/appointment" element={<AppointmentMaker />} />
                    <Route path="/callbacks" element={<CallbackManager />} />
                    <Route path="/registry" element={<Registry />} />
                    <Route path="/schedule" element={<ScheduleGrid />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/profile" element={<Profile />} />
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
};

export default App;
