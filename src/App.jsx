import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import your screen components
import OnboardingScreen from './features/onboarding/components/OnboardingScreen.jsx';
import LevelMapScreen from './features/learn/components/LevelMapScreen.jsx';
import LessonViewScreen from './features/learn/components/LessonViewScreen.jsx';
import AdminDashboardScreen from './features/dashboard/components/AdminDashboardScreen.jsx';
import { MediaProvider } from '/src/hooks/MediaProvider.jsx';

// NOTE: You will need to create and implement AuthProvider and useAuth for this to work.
// import { AuthProvider, useAuth } from './AuthContext';

// A wrapper to protect the admin route
// const AdminRoute = ({ children }) => {
//     const { isAdmin, loading } = useAuth();
//     if (loading) return <div className="text-white text-center p-10">Loading...</div>;
//     return isAdmin ? children : <Navigate to="/onboarding" />;
// };

export default function App() {
  return (
    <MediaProvider>
      <Routes>
        {/* Set Onboarding as the default route */}
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/level-map" element={<LevelMapScreen />} />
        <Route path="/lesson/:lessonId" element={<LessonViewScreen />} />
        <Route path="/admin" element={<AdminDashboardScreen />} />
      </Routes>
    </MediaProvider>
  );
}
