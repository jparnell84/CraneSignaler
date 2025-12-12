import React from 'react';

const ResultsScreen = ({ results, onRestart, onSubmit }) => {
    const correctAnswers = results.filter(r => r.correct).length;
    const totalQuestions = results.length;
    const score = `${correctAnswers} / ${totalQuestions}`;

    // Example: 80% to pass
    const passThreshold = 0.8;
    const passed = totalQuestions > 0 && (correctAnswers / totalQuestions) >= passThreshold;

    return (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center z-30 text-white p-8 text-center">
            <h2 className="text-4xl font-bold mb-2">Assessment Complete</h2>
            
            <p className={`text-6xl font-bold my-6 ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {score}
            </p>

            <p className="text-xl mb-8 text-slate-300">
                {passed ? "Congratulations, you passed!" : "You did not meet the passing requirement. Please try again."}
            </p>

            <div className="flex gap-4">
                <button onClick={onRestart} className="px-8 py-3 rounded-lg font-bold transition-colors bg-slate-700 hover:bg-slate-600 text-white text-lg">
                    Retry
                </button>
                <button onClick={onSubmit} className="px-8 py-3 rounded-lg font-bold transition-colors bg-blue-600 hover:bg-blue-500 text-white text-lg">
                    Submit Results
                </button>
            </div>
        </div>
    );
};

export default ResultsScreen;