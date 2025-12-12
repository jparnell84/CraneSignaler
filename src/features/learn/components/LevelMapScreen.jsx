import React from 'react';
import { Link } from 'react-router-dom';

const LevelMapScreen = () => {
  return (
    <div className="min-h-screen bg-slate-800 text-white p-8 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold">Level Map</h1>
      <p className="text-slate-300 my-4">Here is the path of lessons.</p>
      {/* This would be dynamically generated */}
      <Link
        to="/lesson/swing"
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500"
      >
        Start Lesson 1: Swing
      </Link>
    </div>
  );
};

export default LevelMapScreen;