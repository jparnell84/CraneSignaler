import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import your screen components
// Note: You will need to create these placeholder files.
import OnboardingScreen from './src/features/onboarding/components/OnboardingScreen.jsx';
import LevelMapScreen from './src/features/learn/components/LevelMapScreen.jsx';
import LessonViewScreen from './src/features/learn/components/LessonViewScreen.jsx';
import AdminDashboardScreen from './src/features/dashboard/components/AdminDashboardScreen.jsx';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Set Onboarding as the default route */}
        <Route path="/" element={<Navigate to="/onboarding" replace />} />

        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/level-map" element={<LevelMapScreen />} />
        <Route path="/lesson/:lessonId" element={<LessonViewScreen />} />
        <Route path="/admin" element={<AdminDashboardScreen />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;