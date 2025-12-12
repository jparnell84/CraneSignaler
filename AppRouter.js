import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import your screen components
// Note: You will need to create these placeholder files.
import OnboardingScreen from '../features/onboarding/components/OnboardingScreen';
import LevelMapScreen from '../features/learn/components/LevelMapScreen';
import LessonViewScreen from '../features/learn/components/LessonViewScreen';
import AdminDashboardScreen from '../features/dashboard/components/AdminDashboardScreen';

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