import React from 'react';
import { useParams, Link } from 'react-router-dom';
import LessonEngine from './LessonEngine';
import { SIGNAL_RULES } from '../../../core/signals.js';

// --- Signal Keys ---
const SIGNALS = Object.keys(SIGNAL_RULES);

// --- Question Bank ---
// In a real app, this would be fetched from a database or a larger static file.
const LESSON_BANK = {
  'hand-signals': {
    id: 'hand-signals',
    title: 'Hand Signal Identification',
    challenges: [
      {
        type: 'identify_signal',
        prompt: 'What signal is shown when both hands are open, palms facing each other, and arms are extended horizontally?',
        image: '/images/signals/stop.png', // Placeholder for signal image
        options: ['STOP', 'EMERGENCY STOP', 'BRIDGE TRAVEL', 'DOG EVERYTHING'],
        answer: 'STOP',
      },
      {
        type: 'identify_signal',
        prompt: 'Identify the signal: One hand with thumb pointing up, arm extended.',
        image: '/images/signals/raise_boom.png', // Placeholder
        options: ['RAISE BOOM', 'LOWER BOOM', 'HOIST LOAD', 'MAIN HOIST'],
        answer: 'RAISE BOOM',
      },
      {
        type: 'identify_signal',
        prompt: 'What does this signal mean: Hands clasped together, low at waist level.',
        image: '/images/signals/dog_everything.png', // Placeholder
        options: ['DOG EVERYTHING', 'EMERGENCY STOP', 'STOP', 'TROLLEY TRAVEL'],
        answer: 'DOG EVERYTHING',
      },
    ],
  },
  'voice-signals': {
    id: 'voice-signals',
    title: 'Voice Signal Recall',
    challenges: [
      {
        type: 'voice_command',
        prompt: 'Say the voice command for stopping all operations immediately.',
        answer: 'emergency stop',
      },
      {
        type: 'voice_command',
        prompt: 'What do you say to signal raising the boom?',
        answer: 'raise boom',
      },
      {
        type: 'voice_command',
        prompt: 'Voice command for hoisting the load.',
        answer: 'hoist',
      },
    ],
  },
  'basic-gestures': {
    id: 'basic-gestures',
    title: 'Basic Gestures and Poses',
    challenges: [
      {
        type: 'perform',
        prompt: 'Perform the STOP signal.',
        answer: 'STOP',
      },
      {
        type: 'perform',
        prompt: 'Show the HOIST LOAD gesture.',
        answer: 'HOIST LOAD',
      },
      {
        type: 'perform',
        prompt: 'Demonstrate LOWER LOAD.',
        answer: 'LOWER LOAD',
      },
    ],
  },
  'emergency-situations': {
    id: 'emergency-situations',
    title: 'Emergency Situations',
    challenges: [
      {
        type: 'scenario_visual',
        prompt: 'The load is swinging dangerously. What signal should you use?',
        image: '/images/scenarios/swinging_load.png', // Placeholder
        options: ['EMERGENCY STOP', 'STOP', 'SWING BOOM', 'DOG EVERYTHING'],
        answer: 'EMERGENCY STOP',
      },
      {
        type: 'scenario_visual',
        prompt: 'Power lines are nearby and the load is approaching. Immediate action?',
        image: '/images/scenarios/powerline.png', // Placeholder
        options: ['EMERGENCY STOP', 'STOP', 'LOWER LOAD', 'RAISE BOOM'],
        answer: 'EMERGENCY STOP',
      },
    ],
  },
  'load-handling': {
    id: 'load-handling',
    title: 'Load Handling Scenarios',
    challenges: [
      {
        type: 'scenario_visual',
        prompt: 'To lift the load, what signal is needed?',
        image: '/images/scenarios/lift_load.png', // Placeholder
        options: ['HOIST LOAD', 'LOWER LOAD', 'RAISE BOOM', 'MAIN HOIST'],
        answer: 'HOIST LOAD',
      },
      {
        type: 'scenario_visual',
        prompt: 'The load needs to be lowered safely.',
        image: '/images/scenarios/lower_load.png', // Placeholder
        options: ['LOWER LOAD', 'HOIST LOAD', 'RETRACT BOOM', 'AUX HOIST'],
        answer: 'LOWER LOAD',
      },
    ],
  },
  'communication-challenges': {
    id: 'communication-challenges',
    title: 'Communication Challenges',
    challenges: [
      {
        type: 'scenario_visual',
        prompt: 'Operator cannot see you clearly due to distance. Best signal?',
        image: '/images/scenarios/distance.png', // Placeholder
        options: ['EMERGENCY STOP', 'STOP', 'MAIN HOIST', 'DOG EVERYTHING'],
        answer: 'EMERGENCY STOP',
      },
      {
        type: 'scenario_visual',
        prompt: 'In noisy environment, combine voice with this signal.',
        image: '/images/scenarios/noise.png', // Placeholder
        options: ['STOP', 'EMERGENCY STOP', 'BRIDGE TRAVEL', 'TROLLEY TRAVEL'],
        answer: 'STOP',
      },
    ],
  },
  'overhead-crane': {
    id: 'overhead-crane',
    title: 'Overhead Crane Signals',
    challenges: [
      {
        type: 'perform',
        prompt: 'Signal to move the overhead crane bridge.',
        answer: 'BRIDGE TRAVEL',
      },
      {
        type: 'identify_signal',
        prompt: 'Overhead crane: Hands open, palms facing direction of travel.',
        image: '/images/signals/bridge_travel.png', // Placeholder
        options: ['BRIDGE TRAVEL', 'TROLLEY TRAVEL', 'SWING BOOM', 'EXTEND BOOM'],
        answer: 'BRIDGE TRAVEL',
      },
    ],
  },
  'mobile-crane': {
    id: 'mobile-crane',
    title: 'Mobile Crane Signals',
    challenges: [
      {
        type: 'perform',
        prompt: 'Signal to swing the boom on a mobile crane.',
        answer: 'SWING BOOM',
      },
      {
        type: 'identify_signal',
        prompt: 'Mobile crane: Pointing with index finger horizontally.',
        image: '/images/signals/swing_boom.png', // Placeholder
        options: ['SWING BOOM', 'TROLLEY TRAVEL', 'BRIDGE TRAVEL', 'RAISE BOOM'],
        answer: 'SWING BOOM',
      },
    ],
  },
  'final-assessment': {
    id: 'final-assessment',
    title: 'Final Assessment',
    challenges: [
      // Mix of all types
      {
        type: 'identify_signal',
        prompt: 'Identify: Arms extended horizontally, palms open.',
        options: ['STOP', 'EMERGENCY STOP', 'HOIST LOAD', 'LOWER LOAD'],
        answer: 'STOP',
      },
      {
        type: 'voice_command',
        prompt: 'Voice command to stop everything.',
        answer: 'stop',
      },
      {
        type: 'scenario_visual',
        prompt: 'Load too close to ground, action?',
        image: '/images/scenarios/ground.png', // Placeholder
        options: ['STOP', 'LOWER LOAD', 'EMERGENCY STOP', 'RAISE BOOM'],
        answer: 'STOP',
      },
      {
        type: 'perform',
        prompt: 'Perform EMERGENCY STOP.',
        answer: 'EMERGENCY STOP',
      },
    ],
  },
};

const LessonViewScreen = () => {
  const { lessonId } = useParams();
  const lessonData = LESSON_BANK[lessonId];

  if (!lessonData) {
    return (
      <div className="min-h-screen bg-slate-800 text-white p-8 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Lesson Not Found</h1>
        <p className="text-slate-300 mb-8">The lesson "{lessonId}" does not exist.</p>
        <Link to="/learn" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
          Back to Learning Path
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <LessonEngine lessonData={lessonData} />
      </div>
    </div>
  );
};

export default LessonViewScreen;