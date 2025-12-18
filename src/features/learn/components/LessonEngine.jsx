import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Construction, Star } from 'lucide-react';

import CameraView from '../../../components/CameraView';
import AssessmentDrill from '../../../components/AssessmentDrill';
import { MediaContext } from '/src/hooks/MediaProvider.jsx';
// --- Challenge Components ---

const PerformChallenge = ({ challenge, onComplete, onFailure }) => {
    const { webcamRef, canvasRef, detectedSignal, isLoaded } = useContext(MediaContext);

    useEffect(() => {
        if (isLoaded && detectedSignal === challenge.answer) {
            onComplete(100); // Award 100 XP for success
        }
        // Basic failure feedback
        if (isLoaded && detectedSignal !== 'NONE' && detectedSignal !== 'POSE_NOT_DETECTED' && detectedSignal !== challenge.answer) {
            // This could be expanded to give specific feedback
            // onFailure("Incorrect signal detected: " + detectedSignal);
        }
    }, [detectedSignal, isLoaded, challenge.answer, onComplete, onFailure]);

    return (
        <div className="flex flex-col items-center gap-4">
            <AssessmentDrill target={challenge.prompt} />
            <div className="w-full aspect-video">
                <CameraView ref={{ webcamRef, canvasRef }} isLoaded={isLoaded} />
            </div>
            <p className="text-slate-400">Perform the signal for: <span className="font-bold text-yellow-300">{challenge.prompt}</span></p>
        </div>
    );
};

const VoiceChallenge = ({ challenge, onComplete, onFailure }) => {
    const { speechText, setIsListening, stopSpeech } = useContext(MediaContext);

    useEffect(() => {
        setIsListening(true);
        if (speechText.toLowerCase().includes(challenge.answer.toLowerCase())) {
            stopSpeech();
            onComplete(50); // Award 50 XP
        }
        return () => setIsListening(false); // Stop listening when component unmounts
    }, [speechText, challenge.answer, onComplete, setIsListening, stopSpeech]);

    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <img src={challenge.image} alt={challenge.prompt} className="rounded-lg border-4 border-slate-600 max-w-sm" />
            <p className="text-xl mt-4">What is the name of this signal?</p>
            <div className="mt-2 p-4 bg-slate-900 rounded-lg w-full max-w-sm">
                <p className="font-mono text-lg text-cyan-300 animate-pulse">Listening...</p>
                <p className="font-mono text-slate-400 h-6">{speechText}</p>
            </div>
        </div>
    );
};

const ScenarioChallenge = ({ challenge, onComplete, onFailure }) => {
    const { webcamRef, canvasRef, detectedSignal, isLoaded } = useContext(MediaContext);

    useEffect(() => {
        if (isLoaded && detectedSignal === challenge.answer) {
            onComplete(150); // Award 150 XP for scenario
        }
    }, [detectedSignal, isLoaded, challenge.answer, onComplete]);

    return (
        <div className="flex flex-col items-center gap-4">
            <img src={challenge.image} alt={challenge.prompt} className="rounded-lg border-4 border-slate-600 max-w-md mb-4" />
            <p className="text-xl text-center mb-2">{challenge.prompt}</p>
            <div className="w-full aspect-video">
                <CameraView ref={{ webcamRef, canvasRef }} isLoaded={isLoaded} />
            </div>
        </div>
    );
};

const IdentifySignalChallenge = ({ challenge, onComplete, onFailure }) => {
    const handleOptionClick = (option) => {
        if (option === challenge.answer) {
            onComplete(75); // Award 75 XP for correct identification
        } else {
            onFailure("Incorrect answer");
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <img src={challenge.image} alt={challenge.prompt} className="rounded-lg border-4 border-slate-600 max-w-md mb-4" />
            <p className="text-xl text-center mb-4">{challenge.prompt}</p>
            <div className="grid grid-cols-2 gap-4">
                {challenge.options.map((option) => (
                    <button
                        key={option}
                        onClick={() => handleOptionClick(option)}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
};

const VoiceCommandChallenge = ({ challenge, onComplete, onFailure }) => {
    const { speechText, setIsListening, stopSpeech } = useContext(MediaContext);

    useEffect(() => {
        setIsListening(true);
        if (speechText.toLowerCase().includes(challenge.answer.toLowerCase())) {
            stopSpeech();
            onComplete(50); // Award 50 XP
        }
        return () => setIsListening(false); // Stop listening when component unmounts
    }, [speechText, challenge.answer, onComplete, setIsListening, stopSpeech]);

    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-xl mt-4">{challenge.prompt}</p>
            <div className="mt-2 p-4 bg-slate-900 rounded-lg w-full max-w-sm">
                <p className="font-mono text-lg text-cyan-300 animate-pulse">Listening...</p>
                <p className="font-mono text-slate-400 h-6">{speechText}</p>
            </div>
        </div>
    );
};

// --- Main Engine ---

const LessonEngine = ({ lessonData }) => {
    const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
    const [lives, setLives] = useState(3);
    const [xp, setXp] = useState(0);

    const handleChallengeComplete = useCallback((xpGained) => {
        console.log(`Challenge complete! +${xpGained} XP`);
        setXp(prev => prev + xpGained);
        // Use a timeout to give the user a moment before the next challenge
        setTimeout(() => {
            if (currentChallengeIndex < lessonData.challenges.length - 1) {
                setCurrentChallengeIndex(prev => prev + 1);
            } else {
                console.log("Lesson Finished!");
                // Handle lesson completion (e.g., navigate to a results screen)
            }
        }, 1500);
    }, [currentChallengeIndex, lessonData.challenges.length]);

    const handleChallengeFailure = useCallback((feedback) => {
        console.log(`Challenge failed: ${feedback}`);
        setLives(prev => prev - 1);
        if (lives <= 1) {
            console.log("Game Over!");
            // Handle game over
        }
    }, [lives]);

    const currentChallenge = lessonData.challenges[currentChallengeIndex];
    const ChallengeComponent = {
        'perform': PerformChallenge,
        'voice': VoiceChallenge,
        'scenario_visual': ScenarioChallenge,
    }[currentChallenge.type];

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6 bg-slate-900 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl"><Star className="w-6 h-6" /> {xp}</div>
                <h2 className="text-2xl font-bold">{lessonData.title}</h2>
                <div className="flex items-center gap-2 text-red-500 font-bold text-xl">{Array(lives).fill().map((_, i) => <Construction key={i} className="w-6 h-6" />)}</div>
            </div>
            <ChallengeComponent challenge={currentChallenge} onComplete={handleChallengeComplete} onFailure={handleChallengeFailure} />
        </div>
    );
};

export default LessonEngine;