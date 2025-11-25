import React, { useState, useRef, useCallback, useEffect } from 'react';
import DebugPanel from './components/DebugPanel';
import { SIGNAL_RULES } from './core/signals';

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
import VoiceDrill from './components/VoiceDrill';
import AssessmentDrill from './components/AssessmentDrill';
import useSpeechRecognition from './hooks/useSpeechRecognition';

// --- 3. MAIN APP COMPONENT ---

const App = () => {
  const [mode, setMode] = useState('training');
  const [detectedSignal, setDetectedSignal] = useState('WAITING...');
  const [leftAngle, setLeftAngle] = useState(0);
  const [rightAngle, setRightAngle] = useState(0);
  const [drillTarget, setDrillTarget] = useState(null);
  const [drillSuccess, setDrillSuccess] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugStats, setDebugStats] = useState(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const { text: spokenText } = useSpeechRecognition(isVoiceActive);
  const [activeVoiceCommand, setActiveVoiceCommand] = useState('NONE');

  const showDebugRef = useRef(showDebug);
  useEffect(() => {
    showDebugRef.current = showDebug;
  }, [showDebug]);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);

  const leftWristHistory = useRef([]);
  const rightWristHistory = useRef([]);
  const leftHandHistory = useRef([]);
  const rightHandHistory = useRef([]);

  const toggleVoice = () => {
      setIsVoiceActive(!isVoiceActive);
      // Stop/start the camera to save resources and hide the feed.
      if (cameraRef.current) {
        if (!isVoiceActive) cameraRef.current.stop();
        else cameraRef.current.start();
      }
  };

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
      if (showDebugRef.current) { 
          const stats = getDebugStats(pose, results.leftHandLandmarks, results.rightHandLandmarks, histories);
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

      if (mode === 'assessment' && activeSignal === drillTarget) {
        setDrillSuccess(true);
      }
    }
    canvasCtx.restore();
  }, [mode, drillTarget, isVoiceActive]);

  // Load scripts
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
        <div className="flex gap-2">
            <button onClick={() => setShowDebug(!showDebug)} className={`px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${showDebug ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                {showDebug ? 'DEBUG ON' : 'DEBUG OFF'}
            </button>
            <button onClick={toggleVoice} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isVoiceActive ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                <div className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-sm font-mono">Mic</span>
            </button>
        </div>
      </div>

      {/* SIDE-BY-SIDE LAYOUT */}
      <div className="flex flex-row justify-center gap-4 w-full px-4">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
              {(!holisticLoaded) && (
                 <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900 text-white">
                   <div className="text-center">
                      <div className="text-2xl font-bold mb-2 animate-pulse">Loading AI Models...</div>
                      <div className="text-slate-400">Please allow camera access.</div>
                   </div>
                 </div>
              )}
              <video ref={webcamRef} className={`hidden ${isVoiceActive ? 'invisible' : ''}`} playsInline muted autoPlay></video>
              <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${isVoiceActive ? 'invisible' : ''}`} />
              
              {isVoiceActive && <VoiceDrill activeCommand={activeVoiceCommand} />}
              <HUD mode={mode} leftAngle={leftAngle} rightAngle={rightAngle} signal={detectedSignal} isVoiceActive={isVoiceActive} voiceCommand={activeVoiceCommand} />
              <AssessmentDrill mode={mode} target={drillTarget} success={drillSuccess} onStart={startDrill} onNext={() => setDrillTarget(null)} />
          </div>

          {showDebug && (
             <div className="hidden lg:block h-full">
                 <DebugPanel isVisible={showDebug} stats={debugStats} />
             </div>
          )}
      </div>

      {mode === 'training' && (
        <div className="mt-6 px-6 py-3 bg-slate-800 rounded-full border border-slate-700 text-slate-400 text-sm text-center">
            Try: <span className="text-yellow-400 font-bold">Extend Boom</span> (Thumbs OUT), <span className="text-yellow-400 font-bold">Swing Boom</span> (Blade Hand), or <span className="text-yellow-400 font-bold">Dog Everything</span>
        </div>
      )}
    </div>
  );
};

export default App;