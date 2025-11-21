import React, { useState, useRef, useEffect, useCallback } from 'react';
import CameraView from './components/CameraView';
import HUD from './components/HUD';
import AssessmentDrill from './components/AssessmentDrill';
import VoiceSubtitle from './components/VoiceSubtitle';

// --- 2. MATH & SIGNAL LOGIC (Merged from signals.js) ---
const calculateAngle = (a, b, c) => {
  if(!a || !b || !c) return 0;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};

const detectThumb = (handLandmarks) => {
  if (!handLandmarks) return "NONE";
  const thumbTip = handLandmarks[4];
  const indexMCP = handLandmarks[5];
  const wrist = handLandmarks[0];
  
  // Safety check
  if (!thumbTip || !indexMCP || !wrist) return "NONE";

  const tipToKnuckle = indexMCP.y - thumbTip.y; 
  const threshold = Math.abs(wrist.y - indexMCP.y) * 0.5; 

  if (tipToKnuckle > threshold) return "UP";
  if (tipToKnuckle < -threshold) return "DOWN";
  return "NEUTRAL";
};

const SIGNAL_RULES = {
  'EMERGENCY_STOP': (pose) => {
    if (!pose) return false;
    // Rule: Both arms extended (>145deg)
    const rightArm = calculateAngle(pose[12], pose[14], pose[16]);
    const leftArm  = calculateAngle(pose[11], pose[13], pose[15]);
    return rightArm > 145 && leftArm > 145; 
  },
  'RAISE_BOOM': (pose, leftHand, rightHand) => {
    if (!pose) return false;
    // Rule: One arm extended + Thumb Up
    const leftThumb = detectThumb(leftHand);
    const rightThumb = detectThumb(rightHand);
    
    const rightArm = calculateAngle(pose[12], pose[14], pose[16]);
    const leftArm  = calculateAngle(pose[11], pose[13], pose[15]);
    const armExtended = rightArm > 130 || leftArm > 130; // Slightly looser for comfort

    return armExtended && (leftThumb === 'UP' || rightThumb === 'UP');
  },
  'LOWER_BOOM': (pose, leftHand, rightHand) => {
    if (!pose) return false;
    // Rule: One arm extended + Thumb Down
    const leftThumb = detectThumb(leftHand);
    const rightThumb = detectThumb(rightHand);
    
    const rightArm = calculateAngle(pose[12], pose[14], pose[16]);
    const leftArm  = calculateAngle(pose[11], pose[13], pose[15]);
    const armExtended = rightArm > 130 || leftArm > 130;

    return armExtended && (leftThumb === 'DOWN' || rightThumb === 'DOWN');
  }
};

// --- 3. MAIN COMPONENT ---
const App = () => {
  const [holisticLoaded, setHolisticLoaded] = useState(false);

  const [mode, setMode] = useState('training'); // 'training' or 'assessment'
  const [detectedSignal, setDetectedSignal] = useState('WAITING...');
  const [thumbState, setThumbState] = useState(null);
  const [armAngle, setArmAngle] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  
  // Assessment State
  const [drillTarget, setDrillTarget] = useState(null);
  const [drillSuccess, setDrillSuccess] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);

  // Process detections forwarded from CameraView (CameraView handles drawing)
  const handleDetections = useCallback((results) => {
    if (!results || !results.poseLandmarks) return;

    let activeSignal = "NONE";
    let thumbStatus = "NONE";
    let angleDebug = 0;

    try {
      const rightShoulder = results.poseLandmarks[12];
      const rightElbow = results.poseLandmarks[14];
      const rightWrist = results.poseLandmarks[16];
      const leftShoulder = results.poseLandmarks[11];
      const leftElbow = results.poseLandmarks[13];
      const leftWrist = results.poseLandmarks[15];

      const rAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
      const lAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
      angleDebug = Math.round(rAngle || lAngle || 0);

      if (results.leftHandLandmarks) thumbStatus = detectThumb(results.leftHandLandmarks);
      else if (results.rightHandLandmarks) thumbStatus = detectThumb(results.rightHandLandmarks);
    } catch (e) {}

    if (SIGNAL_RULES.EMERGENCY_STOP(results.poseLandmarks)) {
      activeSignal = "EMERGENCY STOP";
    } else if (SIGNAL_RULES.RAISE_BOOM(results.poseLandmarks, results.leftHandLandmarks, results.rightHandLandmarks)) {
      activeSignal = "RAISE BOOM";
    } else if (SIGNAL_RULES.LOWER_BOOM(results.poseLandmarks, results.leftHandLandmarks, results.rightHandLandmarks)) {
      activeSignal = "LOWER BOOM";
    }

    setDetectedSignal(activeSignal);
    setThumbState(thumbStatus);
    setArmAngle(angleDebug);

    if (isAssessing && activeSignal === drillTarget) {
      setDrillSuccess(true);
      setIsAssessing(false);
    }
  }, [isAssessing, drillTarget]);

  // MediaPipe is initialized inside CameraView via useMediaPipe; CameraView will report load status.

  // Voice recognition state
  const [voiceActive, setVoiceActive] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRec = window.webkitSpeechRecognition || window.SpeechRecognition || null;
    if (!SpeechRec) {
      alert('Voice not supported in this browser (Try Chrome)');
      return;
    }
    const r = new SpeechRec();
    r.continuous = true;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onresult = (event) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.trim();
      setSubtitleText(`Radio: "${command}"`);
      setTimeout(() => setSubtitleText(''), 3000);
      console.log('Voice Command:', command);
    };
    r.onerror = () => {};
    r.start();
    recognitionRef.current = r;
  };

  const stopListening = () => {
    if (recognitionRef.current && recognitionRef.current.stop) recognitionRef.current.stop();
    recognitionRef.current = null;
  };

  const toggleVoice = () => {
    if (voiceActive) {
      stopListening();
      setVoiceActive(false);
      setSubtitleText('');
    } else {
      startListening();
      setVoiceActive(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center text-white font-sans p-4">
      
      {/* TOP BAR */}
      <div className="w-full max-w-5xl flex justify-between items-center gap-4 z-10 mb-4">
        <div className="flex">
          <button 
            onClick={() => setMode('training')}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${mode === 'training' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}
          >
            Training Mode
          </button>
          <button 
            onClick={() => setMode('assessment')}
            className={`ml-2 px-6 py-2 rounded-lg font-bold transition-colors ${mode === 'assessment' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}
          >
            Assessment Mode
          </button>
        </div>

        <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
          <div className={`w-3 h-3 rounded-full ${voiceActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm font-mono text-slate-400">{voiceActive ? 'Radio: LISTENING' : 'Radio: OFF'}</span>
          <button onClick={toggleVoice} className="ml-3 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">Toggle</button>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
        
          {/* Setup Message if loading */}
          {!holisticLoaded && (
           <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900 text-white">
             <div className="text-center">
                <div className="text-2xl font-bold mb-2">Loading AI Models...</div>
                <div className="text-slate-400">Please allow camera access when prompted.</div>
             </div>
           </div>
        )}

          {/* Camera and Canvas */}
          <CameraView onDetections={handleDetections} setHolisticLoaded={setHolisticLoaded} setCameraError={setCameraError} />

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/60 text-white p-6 text-center">
              <div>
                <div className="text-xl font-bold mb-2">Camera Error</div>
                <div className="text-sm text-slate-300 mb-4">{cameraError}</div>
                <div className="text-sm text-slate-400">If the camera is in use, close other apps or tabs using it and reload this page.</div>
              </div>
            </div>
          )}

          {/* Voice subtitle overlay */}
          <VoiceSubtitle text={subtitleText} />

        {/* HUD: TRAINING (presentational component) */}
        <HUD mode={mode} detectedSignal={detectedSignal} thumb={thumbState} angle={armAngle} />

        {/* HUD: ASSESSMENT (presentational component) */}
        {mode === 'assessment' && (
          <AssessmentDrill
            drillTarget={drillTarget}
            drillSuccess={drillSuccess}
            isAssessing={isAssessing}
            onStart={() => {
              const targets = ['EMERGENCY STOP', 'RAISE BOOM', 'LOWER BOOM'];
              setDrillTarget(targets[Math.floor(Math.random() * targets.length)]);
              setIsAssessing(true);
              setDrillSuccess(false);
            }}
            onReset={() => setDrillTarget(null)}
          />
        )}
      </div>
      
      <div className="mt-4 text-slate-500 text-sm max-w-lg text-center">
        If the camera does not start, please ensure you have given permission and are using a browser that supports WebAssembly.
      </div>
    </div>
  );
};

export default App;
