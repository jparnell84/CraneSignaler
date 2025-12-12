import React from 'react';
import TechCheck from './TechCheck';

const OnboardingScreen = () => {
  return (
    <div className="min-h-screen bg-slate-800 text-white p-8 flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome to Crane Signal Training</h1>
        <p className="text-xl text-slate-300">Let's get your equipment ready.</p>
      </div>
      <div className="w-full max-w-4xl bg-slate-900 rounded-lg shadow-xl p-6">
        <TechCheck />
      </div>
    </div>
  );
};

export default OnboardingScreen;
