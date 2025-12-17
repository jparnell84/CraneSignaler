import React from 'react';
import { useParams, Link } from 'react-router-dom';
import LessonEngine from './LessonEngine';

// --- Mock Lesson Data ---
// In a real app, this would be fetched from a database or a larger static file.
const MOCK_LESSON_DATA = {
  id: 'basic-signals-1',
  title: 'Lesson 1: Basic Signals',
  challenges: [
    {
      type: 'perform',
      prompt: 'HOIST',
      answer: 'HOIST', // The key from SIGNAL_RULES
    },
    {
      type: 'voice',
      prompt: 'Identify this signal.',
      image: '/images/signals/stop.png', // NOTE: You will need to add this image to your /public/images/signals folder
      answer: 'Stop',
    },
    {
      type: 'scenario_visual',
      prompt: 'The load is approaching a power line. What should you do?',
      image: '/images/scenarios/powerline.png', // NOTE: You will need to add this image to your /public/images/scenarios folder
      answer: 'EMERGENCY_STOP',
    },
  ],
};

const LessonViewScreen = () => {
  const { lessonId } = useParams();

  return (
    <div className="min-h-screen bg-slate-800 text-white p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <LessonEngine lessonData={MOCK_LESSON_DATA} />
      </div>
    </div>
  );
};

export default LessonViewScreen;
