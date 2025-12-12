import React from 'react';
import { useParams, Link } from 'react-router-dom';

const LessonViewScreen = () => {
  const { lessonId } = useParams();

  return (
    <div className="min-h-screen bg-slate-800 text-white p-8 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold">Lesson: {lessonId}</h1>
      <p className="text-slate-300 my-4">This is where the CameraView, HUD, and AI logic will go.</p>
      <Link
        to="/level-map"
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500"
      >
        Back to Level Map
      </Link>
    </div>
  );
};

export default LessonViewScreen;
