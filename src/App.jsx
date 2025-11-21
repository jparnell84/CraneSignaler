import React, { useState, useRef, useCallback, useEffect } from 'react';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS, HAND_CONNECTIONS } from '@mediapipe/holistic';

// Components
import CameraView from './components/CameraView';
import HUD from './components/HUD';
import AssessmentDrill from './components/AssessmentDrill';
import VoiceSubtitle from './components/VoiceSubtitle';

// Core Logic
import { SIGNAL_RULES } from './core/signals';
import { calculateAngle } from './core/geometry';
import { VoiceManager } from './core/voice';

// Hooks
import { useMediaPipe } from './hooks/useMediaPipe';

const App = () => {
  // -- State --
  const [mode, setMode] = useState('training'); 
  const [detectedSignal, setDetectedSignal] = useState('WAITING...');
  const [leftAngle, setLeftAngle] = useState(0);
  const [rightAngle, setRightAngle] = useState(0);
  const [drillTarget, setDrillTarget] = useState(null);
  const [drillSuccess, setDrillSuccess] = useState(false);

  const [voiceCommand, setVoiceCommand] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const voiceManagerRef = useRef(null);

  // Refs for MediaPipe
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // --- HISTORY BUFFERS FOR MOTION DETECTION ---
  // 1. Index Fingers (For Hoist/Lower Load circles & metronomes)
  const leftIndexHistory = useRef([]);
  const rightIndexHistory = useRef([]);
  
  // 2. Wrists (For Emergency Stop horizontal wave)
  const leftWristHistory = useRef([]);
  const rightWristHistory = useRef([]);

  useEffect(() => {
    voiceManagerRef.current = new VoiceManager((cmd) => {
        setVoiceCommand(cmd);
        if (cmd.includes('training')) setMode('training');
        if (cmd.includes('assessment') || cmd.includes('test')) setMode('assessment');
    });
  }, []);

  const toggleVoice = () => {
    if (isVoiceActive) {
        voiceManagerRef.current.stop();
        setIsVoiceActive(false);
    } else {
        const started = voiceManagerRef.current.start();
        if (started) setIsVoiceActive(true);
        else alert("Voice recognition not supported.");
    }
  };

  // -- HELPER: Generic History Tracker --
  // Updates a history array with {x, y} of a specific landmark
  const updateGeneralHistory = (landmark, historyRef) => {
    if (landmark) {
        historyRef.current.push({ x: landmark.x, y: landmark.y });
        // Keep 30 frames (~1 sec) for robust motion analysis
        if (historyRef.current.length > 30) historyRef.current.shift();
    } else {
        // If tracking is lost, clear history to prevent "teleporting" artifacts
        historyRef.current = [];
    }
  };

  const onResults = useCallback((results) => {
    if (!webcamRef.current || !canvasRef.current || !webcamRef.current.video) return;

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;
    
    const canvasCtx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
    canvasCtx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: 'rgba(100, 116, 139, 0.5)', lineWidth: 2});
    drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#cbd5e1', lineWidth: 1, radius: 2});
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {color: '#eab308', lineWidth: 2});
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {color: '#eab308', lineWidth: 2});

    if (results.poseLandmarks) {
      const pose = results.poseLandmarks;
      
      // --- UPDATE HISTORIES ---
      
      // 1. Index Fingers (from Hand Landmarks)
      // Note: Hand landmarks are sometimes null if hands go off screen
      const lIndex = results.leftHandLandmarks ? results.leftHandLandmarks[8] : null;
      const rIndex = results.rightHandLandmarks ? results.rightHandLandmarks[8] : null;
      updateGeneralHistory(lIndex, leftIndexHistory);
      updateGeneralHistory(rIndex, rightIndexHistory);

      // 2. Wrists (from Pose Landmarks - usually more stable)
      // 15: Left Wrist, 16: Right Wrist
      updateGeneralHistory(pose[15], leftWristHistory);
      updateGeneralHistory(pose[16], rightWristHistory);

      // UI Updates
      setLeftAngle(calculateAngle(pose[11], pose[13], pose[15]));
      setRightAngle(calculateAngle(pose[12], pose[14], pose[16]));

      // Check Signals
      let activeSignal = "NONE";
      // Iterate through rule book
      for (const sig of Object.keys(SIGNAL_RULES)) {
          if (SIGNAL_RULES[sig](
              pose, 
              results.leftHandLandmarks, 
              results.rightHandLandmarks,
              leftIndexHistory.current,  // For Hoist
              rightIndexHistory.current, // For Hoist
              leftWristHistory.current,  // For Emergency Stop
              rightWristHistory.current  // For Emergency Stop
          )) {
              activeSignal = sig;
              break;
          }
      }
      setDetectedSignal(activeSignal);

      if (mode === 'assessment' && activeSignal === drillTarget) {
        setDrillSuccess(true);
      }
    }
    canvasCtx.restore();
  }, [mode, drillTarget]);

  const isLoaded = useMediaPipe(webcamRef, onResults);

  const startDrill = () => {
      const keys = Object.keys(SIGNAL_RULES);
      const randomSig = keys[Math.floor(Math.random() * keys.length)];
      setDrillTarget(randomSig);
      setDrillSuccess(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center text-white font-sans p-4">
      
      <div className="w-full max-w-5xl flex justify-between items-center mb-4 z-10">
        <div className="flex gap-4">
            <button onClick={() => setMode('training')} className={`px-6 py-2 rounded-lg font-bold transition-colors ${mode === 'training' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>Training</button>
            <button onClick={() => setMode('assessment')} className={`px-6 py-2 rounded-lg font-bold transition-colors ${mode === 'assessment' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>Assessment</button>
        </div>
        <button onClick={toggleVoice} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isVoiceActive ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-sm font-mono">Mic {isVoiceActive ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      <div className="relative">
          <CameraView ref={{ webcamRef, canvasRef }} isLoaded={isLoaded} />
          <HUD mode={mode} leftAngle={leftAngle} rightAngle={rightAngle} signal={detectedSignal} />
          <AssessmentDrill mode={mode} target={drillTarget} success={drillSuccess} onStart={startDrill} onNext={() => setDrillTarget(null)} />
          <VoiceSubtitle text={voiceCommand} />
      </div>

      {mode === 'training' && (
        <div className="mt-6 px-6 py-3 bg-slate-800 rounded-full border border-slate-700 text-slate-400 text-sm">
            Try: <span className="text-yellow-400 font-bold">Hoist Load</span> (Finger UP + Motion) or <span className="text-yellow-400 font-bold">Emergency Stop</span> (Wave arms)
        </div>
      )}
    </div>
  );
};

export default App;