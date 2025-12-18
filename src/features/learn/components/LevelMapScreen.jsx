import React from 'react';
import { Link } from 'react-router-dom';

const LevelMapScreen = () => {
  const levels = [
    {
      id: 'basic-concepts',
      title: 'Basic Concepts',
      description: 'Learn fundamental crane signaling concepts including hand signal identification and voice signal recall.',
      lessons: [
        { id: 'hand-signals', title: 'Hand Signal Identification' },
        { id: 'voice-signals', title: 'Voice Signal Recall' },
        { id: 'basic-gestures', title: 'Basic Gestures and Poses' },
      ],
    },
    {
      id: 'situational-responses',
      title: 'Situational Responses',
      description: 'Practice responses to various crane operation scenarios using image-based prompts.',
      lessons: [
        { id: 'emergency-situations', title: 'Emergency Situations' },
        { id: 'load-handling', title: 'Load Handling Scenarios' },
        { id: 'communication-challenges', title: 'Communication Challenges' },
      ],
    },
    {
      id: 'equipment-signals',
      title: 'Equipment-Specific Signals',
      description: 'Master signals tailored to different crane types: overhead and mobile cranes.',
      lessons: [
        { id: 'overhead-crane', title: 'Overhead Crane Signals' },
        { id: 'mobile-crane', title: 'Mobile Crane Signals' },
      ],
    },
    {
      id: 'assessment',
      title: 'Final Assessment',
      description: 'Comprehensive assessment to evaluate your crane signaling skills across all concepts.',
      lessons: [
        { id: 'final-assessment', title: 'Complete Assessment' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Crane Signaling Learning Path</h1>
        <div className="space-y-8">
          {levels.map((level, levelIndex) => (
            <div key={level.id} className="bg-slate-700 rounded-lg p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">
                  {levelIndex + 1}
                </div>
                <h2 className="text-2xl font-semibold">{level.title}</h2>
              </div>
              <p className="text-slate-300 mb-4">{level.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {level.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    to={`/lesson/${lesson.id}`}
                    className="block px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-center transition-colors"
                  >
                    {lesson.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LevelMapScreen;