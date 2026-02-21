import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import ActiveScript from './pages/ActiveScript';
import AppointmentMaker from './pages/AppointmentMaker';
import CallbackManager from './pages/CallbackManager';
import ScheduleGrid from './pages/ScheduleGrid';
import Settings from './pages/Settings';
import Registry from './pages/Registry';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/Profile';

import MobileBlocker from './components/MobileBlocker';

const App: React.FC = () => {
  return (
    <MobileBlocker>
      <AuthProvider>
        <LanguageProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </LanguageProvider>
      </AuthProvider>
    </MobileBlocker>
  );
};

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/script" element={<ActiveScript />} />
        <Route path="/appointment" element={<AppointmentMaker />} />
        <Route path="/callbacks" element={<CallbackManager />} />
        <Route path="/registry" element={<Registry />} />
        <Route path="/schedule" element={<ScheduleGrid />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
};

export default App;