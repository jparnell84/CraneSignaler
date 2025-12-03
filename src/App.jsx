import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DebugPanel from './components/DebugPanel';
import { db, auth } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from "firebase/auth";
import { SIGNAL_RULES } from './core/signals';
import { useAuth } from './AuthContext';

// --- 1. UTILITY: Script Loader for MediaPipe ---
const useMediaPipeScript = (url) => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [url]);
  return loaded;
};

// --- 2. CORE & UI IMPORTS ---
import { getDebugStats, calculateAngle } from './core/geometry';
import HUD from './components/HUD';
import AssessmentDrill from './components/AssessmentDrill';
import ResultsScreen from './components/ResultsScreen';
import useSpeechRecognition from './hooks/useSpeechRecognition';
import { captureSnapshot } from './core/evidence';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// --- 4. ASSESSMENT CONFIGURATION ---
// This is now the single source of truth for the assessment.
// Add or remove signal IDs from this list to control the assessment content.
const ASSESSMENT_CONFIG = [
    // Hand Signals
    { type: 'HAND', id: 'STOP' },
    { type: 'HAND', id: 'HOIST LOAD' },
    { type: 'HAND', id: 'LOWER LOAD' },
    { type: 'HAND', id: 'SWING BOOM' },
    { type: 'HAND', id: 'EXTEND BOOM' },
    { type: 'HAND', id: 'RETRACT BOOM' },
    { type: 'HAND', id: 'EMERGENCY STOP' },
    { type: 'HAND', id: 'TROLLEY TRAVEL' },

    // Voice Signals (with custom prompts)
    { type: 'VOICE', id: 'SWING BOOM', prompt: 'The load is drifting. Correct it.' },
    { type: 'VOICE', id: 'STOP', prompt: 'An obstacle is in the path. Halt the operation.' },
    { type: 'VOICE', id: 'DOG EVERYTHING', prompt: 'A non-essential person entered the work area. Pause all movement.' }
];

// The QUESTION_BANK is now generated from the configuration above.
const QUESTION_BANK = ASSESSMENT_CONFIG.map(q => ({ ...q, prompt: q.prompt || `Perform: ${q.id}` }));

const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// --- 3. MAIN APP COMPONENT ---

// The time in milliseconds a user must hold a signal before it's "committed".
const COMMIT_DURATION = 1500; // 1.5 seconds

const App = () => {
  // Refactored state management for application flow
  const [appState, setAppState] = useState('INITIALIZING'); // INITIALIZING, WELCOME, ASSESSMENT_ACTIVE, RESULTS, SUBMITTING, COMPLETE
  const [detectedSignal, setDetectedSignal] = useState('WAITING...');
  const [leftAngle, setLeftAngle] = useState(0);
  const [rightAngle, setRightAngle] = useState(0);
  const [debugStats, setDebugStats] = useState(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const { text: spokenText, confidence } = useSpeechRecognition(isVoiceActive);
  const [activeVoiceCommand, setActiveVoiceCommand] = useState('NONE');
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { user, isAdmin } = useAuth(); // Use the context
  const [results, setResults] = useState([]); // [{ question, correct, timeTaken, evidence }]
  const [voiceAttemptCount, setVoiceAttemptCount] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [lastSubmissionId, setLastSubmissionId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [holdState, setHoldState] = useState(null); // { signal: 'STOP', startTime: Date.now(), evidence: '...' }

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);

  const leftWristHistory = useRef([]);
  const rightWristHistory = useRef([]);
  const leftHandHistory = useRef([]);
  const rightHandHistory = useRef([]);

  const updateGeneralHistory = (landmark, historyRef) => {
      const data = landmark ? (Array.isArray(landmark) ? landmark : { x: landmark.x, y: landmark.y }) : null;
      if (data) {
          historyRef.current.push(data);
          if (historyRef.current.length > 30) historyRef.current.shift();
      } else {
          historyRef.current = [];
      }
  };

  const onResults = useCallback((results) => {
    const video = webcamRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (videoWidth === 0) return;

    const canvasCtx = canvas.getContext('2d');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
    canvasCtx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

    if (window.drawConnectors && window.drawLandmarks) {
      const { POSE_CONNECTIONS, HAND_CONNECTIONS } = window;
      window.drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: 'rgba(100, 116, 139, 0.5)', lineWidth: 2});
      window.drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#cbd5e1', lineWidth: 1, radius: 2});
      window.drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {color: '#eab308', lineWidth: 2});
      window.drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {color: '#eab308', lineWidth: 2});
    }

    if (results.poseLandmarks) {
      const pose = results.poseLandmarks;
      
      updateGeneralHistory(pose[15], leftWristHistory);
      updateGeneralHistory(pose[16], rightWristHistory);
      updateGeneralHistory(results.leftHandLandmarks, leftHandHistory);
      updateGeneralHistory(results.rightHandLandmarks, rightHandHistory);

      // Angle calculation now imported from geometry.js
      setLeftAngle(calculateAngle(pose[11], pose[13], pose[15]));
      setRightAngle(calculateAngle(pose[12], pose[14], pose[16]));

      const histories = {
        lWristHist: leftWristHistory.current,
        rWristHist: rightWristHistory.current,
        lHandHist: leftHandHistory.current,
        rHandHist: rightHandHistory.current
      };
      // Debug Stats calculation imported from geometry.js
      if (isAdmin) { 
          const stats = getDebugStats(pose, results.leftHandLandmarks, results.rightHandLandmarks, histories, spokenText);
          setDebugStats(stats);
      }

      let activeSignal = "NONE";
      
      // Only process hand signals if voice mode is NOT active.
      if (!isVoiceActive) {
        // Signal Rules imported from signals.js
        for (const sig of Object.keys(SIGNAL_RULES)) {
            if (SIGNAL_RULES[sig]( // Pass histories as a single object
                pose, 
                results.leftHandLandmarks, 
                results.rightHandLandmarks,
                histories
            )) {
                activeSignal = sig;
                break;
            }
        }
      }
      setDetectedSignal(activeSignal);

    }
    canvasCtx.restore();
  }, [isVoiceActive, spokenText, isAdmin]);

  // --- SCRIPT & MODEL LOADING ---
  const holisticLoaded = useMediaPipeScript("https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js");
  const cameraUtilsLoaded = useMediaPipeScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
  const drawingUtilsLoaded = useMediaPipeScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");

  useEffect(() => {
    if (!isVoiceActive) {
      setActiveVoiceCommand('NONE');
      return;
    }
    // Find the first matching signal in the spoken text
    const command = Object.keys(SIGNAL_RULES).find(sig => 
      spokenText.toLowerCase().includes(sig.toLowerCase())
    );

    if (command) {
      setActiveVoiceCommand(command);
    }
  }, [spokenText, isVoiceActive]);

  useEffect(() => {
    if (holisticLoaded && cameraUtilsLoaded && drawingUtilsLoaded && webcamRef.current) {
      const holistic = new window.Holistic({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
      });

      holistic.setOptions({
        modelComplexity: 1, 
        smoothLandmarks: true,
        enableSegmentation: false,
        refineFaceLandmarks: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      holistic.onResults(onResults);

      if (webcamRef.current && !cameraRef.current) {
        cameraRef.current = new window.Camera(webcamRef.current, {
          onFrame: async () => {
            if (webcamRef.current) await holistic.send({image: webcamRef.current});
          },
          width: 1280,
          height: 720
        });
        cameraRef.current.start();
      }
    }
  }, [holisticLoaded, cameraUtilsLoaded, drawingUtilsLoaded, onResults]);

  const handleAdminLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Admin login failed:", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // Helper to ensure a user (anonymous or signed-in) exists before proceeding.
  const getOrCreateUser = async () => {
    // If the user from AuthContext already exists, return it.
    if (user) return user;
    // Otherwise, sign in anonymously and return the new user.
    // This will trigger the onAuthStateChanged in AuthContext.
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  };


  // --- ASSESSMENT FLOW LOGIC ---
  const startAssessment = () => {
      const shuffledQuestions = shuffleArray(QUESTION_BANK).slice(0, 10);
      setAssessmentQuestions(shuffledQuestions);
      setCurrentQuestionIndex(0);
      setResults([]);
      setVoiceAttemptCount(0);
      setQuestionStartTime(Date.now());
      setAppState('ASSESSMENT_ACTIVE');
  };

  const handleCorrectAnswer = async (lockedEvidence) => {
    if (isProcessing) return; // Prevent double-triggering
    setIsProcessing(true);

    const currentUser = await getOrCreateUser();
    if (!currentUser) {
        console.error("Could not get or create a user. Aborting.");
        setIsProcessing(false);
        return;
    }
    const currentQuestion = assessmentQuestions[currentQuestionIndex];

    // --- New Confidence Check for Voice ---
    if (currentQuestion.type === 'VOICE') {
        const CONFIDENCE_THRESHOLD = 0.6; // 60% confidence required
        if (confidence < CONFIDENCE_THRESHOLD) {
            if (voiceAttemptCount < 1) {
                // First failed attempt
                setVoiceAttemptCount(1);
                setFeedbackMessage("I didn't catch that. Please say it again.");
                setIsProcessing(false); // Allow another attempt
                return; // Stop processing this answer
            }
            // Second attempt also failed, so we will proceed to fail the question
        }
    }

    // Clear any feedback messages
    if (feedbackMessage) {
        setFeedbackMessage(null);
    }
    // --- End Confidence Check ---

    const timeTaken = (Date.now() - questionStartTime) / 1000; // in seconds
    setResults(prev => [...prev, { 
        question: currentQuestion, 
        correct: true, 
        timeTaken,
        evidence: lockedEvidence
    }]);

    if (currentQuestionIndex < assessmentQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setHoldState(null); // Reset hold state for the next question
        setVoiceAttemptCount(0); // Reset for next question
        setQuestionStartTime(Date.now()); // Reset timer for next question
    } else {
        setAppState('RESULTS');
    }

    setIsProcessing(false);
  };

  const handleIncorrectAnswer = async (lockedEvidence) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const currentUser = await getOrCreateUser();
    if (!currentUser) {
        console.error("Could not get or create a user for incorrect answer. Aborting.");
        setIsProcessing(false);
        return;
    }
    const currentQuestion = assessmentQuestions[currentQuestionIndex];

    const timeTaken = (Date.now() - questionStartTime) / 1000;
    setResults(prev => [...prev, {
        question: currentQuestion,
        correct: false,
        timeTaken,
        evidence: lockedEvidence
    }]);

    // Move to the next question or end the assessment
    if (currentQuestionIndex < assessmentQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setHoldState(null); // Reset hold state for the next question
        setVoiceAttemptCount(0);
        setQuestionStartTime(Date.now());
    } else {
        setAppState('RESULTS');
    }

    setIsProcessing(false);
  };


  const restartAssessment = () => {
    setAppState('WELCOME');
    setAssessmentQuestions([]);
    setCurrentQuestionIndex(0);
    setResults([]);
    setVoiceAttemptCount(0);
    setFeedbackMessage(null);
    setLastSubmissionId(null);
    setIsProcessing(false);
  }

  const handleSubmitResults = async () => {
    setAppState('SUBMITTING');

    const currentUser = await getOrCreateUser();
    if (!currentUser) {
        console.error("Could not get or create a user. Aborting submission.");
        setAppState('RESULTS'); // Go back to results screen on error
        return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id') || currentUser.uid;

    const score = results.filter(r => r.correct).length;
    const total = results.length;

    const submissionData = {
      timestamp: serverTimestamp(),
      userId: userId,
      score: score,
      total: total,
      details: results.map(r => ({
        signal: r.question.id,
        result: r.correct ? 'pass' : 'fail', // Assuming all recorded results are passes for now
        timeTaken: r.timeTaken,
        evidence: r.evidence || null,
      }))
    };

    try {
      const docRef = await addDoc(collection(db, "assessments"), submissionData);
      setLastSubmissionId(docRef.id);
      setAppState('COMPLETE');
    } catch (e) {
      console.error("Error adding document: ", e);
      setAppState('RESULTS'); // Go back to results screen on error
    }
  }

  const simulateLms = () => {
    const fakeUrl = `${window.location.pathname}?user_id=sim_user_123&session_id=sim_session_abc`;
    window.history.pushState({}, 'Simulated LMS', fakeUrl);
    alert(`Simulating LMS launch. URL is now:\n${window.location.href}`);
  };

  const forcePass = () => {
    // Create a dummy result set that passes
    const passingResults = assessmentQuestions.map(q => ({ question: q, correct: true }));
    setResults(passingResults);
    setAppState('RESULTS');
  };


  // Effect to transition from INITIALIZING to WELCOME
  useEffect(() => {
    if (appState === 'INITIALIZING' && holisticLoaded && cameraUtilsLoaded && drawingUtilsLoaded) {
        setAppState('WELCOME');
    }
  }, [appState, holisticLoaded, cameraUtilsLoaded, drawingUtilsLoaded]);

  // Effect to manage assessment progression
  useEffect(() => {
    if (appState !== 'ASSESSMENT_ACTIVE' || assessmentQuestions.length === 0) return;
    // This is the crucial fix: Do not run any signal detection logic while an answer is being processed.
    if (isProcessing) return;

    if (!questionStartTime) setQuestionStartTime(Date.now()); // Ensure timer starts if it hasn't

    const currentQuestion = assessmentQuestions[currentQuestionIndex];
    
    // Toggle peripherals based on question type
    const needsVoice = currentQuestion.type === 'VOICE';
    if (needsVoice !== isVoiceActive) {
        setIsVoiceActive(needsVoice);
        if (cameraRef.current) {
            if (needsVoice) cameraRef.current.stop();
            else cameraRef.current.start();
        }
    }

    // Check for correct answer
    const activeSignal = currentQuestion.type === 'VOICE' ? activeVoiceCommand : detectedSignal;

    // If a signal is being held and it changes, or if no signal is detected, reset the hold state.
    if (!activeSignal || activeSignal === 'NONE' || (holdState && holdState.signal !== activeSignal)) {
        setHoldState(null);
        return;
    }

    // If a new, valid signal is detected, start the hold timer.
    if (activeSignal && activeSignal !== 'NONE' && !holdState) {
        // Capture evidence AT THE START of the hold. This is the crucial fix.
        const captureAndSetHoldState = async () => {
            const currentUser = await getOrCreateUser();
            if (!currentUser) return;

            const userId = new URLSearchParams(window.location.search).get('user_id') || currentUser.uid;
            let evidence = null;
            if (currentQuestion.type === 'HAND') {
                evidence = await captureSnapshot(webcamRef, canvasRef, userId, activeSignal);
            } else { // VOICE
                evidence = { transcript: spokenText, confidence: confidence };
            }
            
            setHoldState({ signal: activeSignal, startTime: Date.now(), evidence: evidence });
        };
        captureAndSetHoldState();
        return;
    }

    // If a signal is being held, check if the timer has completed.
    if (holdState) {
        const elapsedTime = Date.now() - holdState.startTime;
        if (elapsedTime >= COMMIT_DURATION) {
            // Timer complete! Lock the signal and check if it's correct.
            const lockedSignal = holdState.signal;
            if (lockedSignal === currentQuestion.id) {
                handleCorrectAnswer(holdState.evidence); // Correct answer logic
            } else {
                handleIncorrectAnswer(holdState.evidence); // Incorrect answer logic
            }
        }
    }

  }, [appState, currentQuestionIndex, assessmentQuestions, detectedSignal, activeVoiceCommand, isVoiceActive, confidence, holdState, isProcessing]);

  const currentQuestion = assessmentQuestions[currentQuestionIndex];
  const holdProgress = holdState ? (Date.now() - holdState.startTime) / COMMIT_DURATION : 0;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center text-white font-sans p-4">
      <div className="w-full max-w-5xl flex justify-between items-center mb-4 z-10">
        <h1 className="text-2xl font-bold text-slate-300">Crane Signal Assessment</h1>
        <div className="flex items-center gap-2">
            {/* The mic button is now more of an indicator, controlled by the assessment state */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isVoiceActive ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                <div className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-sm font-mono">Mic</span>
            </div>
            {isAdmin && (
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-green-900/50 border border-green-500 text-green-400 text-xs font-mono">ADMIN</span>
                    <Link to="/admin" className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-mono">Dashboard</Link>
                </div>
            )}
        </div>
      </div>

      {/* SIDE-BY-SIDE LAYOUT */}
      <div className="w-full max-w-5xl flex-grow flex flex-col">
        {/* --- PROMPT AREA (MOVED) --- */}
        {appState === 'ASSESSMENT_ACTIVE' && (
            <div className="w-full mb-4 text-white">
                 <AssessmentDrill target={currentQuestion?.prompt} />
            </div>
        )}

        <div className="flex flex-row justify-center gap-4 w-full flex-grow">
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
                {appState === 'INITIALIZING' && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900 text-white">
                        <div className="text-center">
                            <div className="text-2xl font-bold mb-2 animate-pulse">Loading AI Models...</div>
                            <div className="text-slate-400">Please allow camera access.</div>
                        </div>
                    </div>
                )}
                {appState === 'WELCOME' && (
                    <div className="text-center z-20">
                        <h2 className="text-3xl font-bold mb-6">Welcome to the Assessment</h2>
                        <button onClick={startAssessment} className="px-8 py-3 rounded-lg font-bold transition-colors bg-blue-600 hover:bg-blue-500 text-white text-lg">
                            Begin Assessment
                        </button>
                        {isAdmin && (
                            <div className="mt-8 flex justify-center gap-4">
                                <button onClick={simulateLms} className="px-4 py-2 text-xs rounded-lg bg-yellow-600/20 border border-yellow-500 text-yellow-400">
                                    Simulate LMS
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <video ref={webcamRef} className={`${appState !== 'ASSESSMENT_ACTIVE' || currentQuestion?.type !== 'HAND' ? 'hidden' : ''}`} playsInline muted autoPlay></video>
                <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full object-cover ${appState !== 'ASSESSMENT_ACTIVE' || currentQuestion?.type !== 'HAND' ? 'hidden' : ''}`} />
                
                {appState === 'ASSESSMENT_ACTIVE' && currentQuestion?.type === 'VOICE' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-slate-400">Voice Mode Active</p>
                        </div>
                    </div>
                )}
                {appState === 'ASSESSMENT_ACTIVE' && <HUD mode="assessment" leftAngle={leftAngle} rightAngle={rightAngle} signal={detectedSignal} isVoiceActive={isVoiceActive} voiceCommand={activeVoiceCommand} holdProgress={holdProgress} />}
                
                {appState === 'ASSESSMENT_ACTIVE' && feedbackMessage && (
                    <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 text-center p-4 bg-black/50 rounded-lg z-30">
                        <p className="text-yellow-300 text-lg">{feedbackMessage}</p>
                    </div>
                )}

                {appState === 'ASSESSMENT_ACTIVE' && isAdmin && (
                    <button onClick={forcePass} className="absolute bottom-4 right-4 px-4 py-2 text-xs rounded-lg bg-purple-600/50 border border-purple-400 text-purple-300 z-30">
                        Force Pass
                    </button>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-900/80 backdrop-blur-sm text-white">
                        <div className="text-xl font-bold mb-2 animate-pulse">Processing...</div>
                    </div>
                )}

                {appState === 'RESULTS' && <ResultsScreen results={results} onRestart={restartAssessment} onSubmit={handleSubmitResults} />}
                {appState === 'SUBMITTING' && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/95 text-white">
                        <div className="text-2xl font-bold mb-2 animate-pulse">Submitting Results...</div>
                    </div>
                )}
                {appState === 'COMPLETE' && (
                    <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center z-30 text-white p-8 text-center">
                        <h2 className="text-4xl font-bold mb-4 text-green-400">Submission Successful!</h2>
                        <p className="text-slate-300 mb-6">Your assessment results have been saved.</p>
                        {isAdmin && <p className="text-xs text-slate-500 mb-8">Firestore Doc ID: {lastSubmissionId}</p>}
                        <button onClick={restartAssessment} className="px-8 py-3 rounded-lg font-bold transition-colors bg-blue-600 hover:bg-blue-500 text-white text-lg">Start Over</button>
                    </div>
                )}
            </div>

            {isAdmin && (
                <div className="hidden lg:block h-full">
                    <DebugPanel isVisible={isAdmin} stats={debugStats} />
                </div>
            )}
        </div>
      </div>

      <footer className="w-full max-w-5xl mt-4 text-center text-slate-500 text-xs">
        {user ? (
            <span>Welcome, {user.displayName}. <button onClick={handleLogout} className="underline hover:text-slate-300">Logout</button></span>
        ) : (
            <button onClick={handleAdminLogin} className="underline hover:text-slate-300">Admin Login</button>
        )}
      </footer>

    </div>
  );
};

export default App;