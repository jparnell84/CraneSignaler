import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- 1. UTILITY: Script Loader for MediaPipe ---
// Since we can't use npm imports in this environment, we inject the scripts dynamically.
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
  // Load external scripts
  const holisticLoaded = useMediaPipeScript("https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js");
  const cameraUtilsLoaded = useMediaPipeScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
  const drawingUtilsLoaded = useMediaPipeScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");

  const [mode, setMode] = useState('training'); // 'training' or 'assessment'
  const [detectedSignal, setDetectedSignal] = useState('WAITING...');
  
  // Assessment State
  const [drillTarget, setDrillTarget] = useState(null);
  const [drillSuccess, setDrillSuccess] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);

  // Process Results
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Prevent drawing if dimensions are zero
    if (videoWidth === 0 || videoHeight === 0) return;

    const canvasCtx = canvas.getContext('2d');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
    
    // Draw Video
    canvasCtx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

    // Draw Landmarks (Accessing global window object since scripts are loaded)
    if (window.drawConnectors && window.drawLandmarks) {
      const { POSE_CONNECTIONS, HAND_CONNECTIONS } = window;
      window.drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#64748b', lineWidth: 2});
      window.drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#cbd5e1', lineWidth: 1, radius: 3});
      window.drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {color: '#eab308', lineWidth: 2});
      window.drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {color: '#eab308', lineWidth: 2});
    }

    // Run Logic
    if (results.poseLandmarks) {
      let activeSignal = "NONE";
      
      if (SIGNAL_RULES.EMERGENCY_STOP(results.poseLandmarks)) {
        activeSignal = "EMERGENCY STOP";
      } else if (SIGNAL_RULES.RAISE_BOOM(results.poseLandmarks, results.leftHandLandmarks, results.rightHandLandmarks)) {
        activeSignal = "RAISE BOOM";
      } else if (SIGNAL_RULES.LOWER_BOOM(results.poseLandmarks, results.leftHandLandmarks, results.rightHandLandmarks)) {
        activeSignal = "LOWER BOOM";
      }

      setDetectedSignal(activeSignal);

      if (isAssessing && activeSignal === drillTarget) {
        setDrillSuccess(true);
        setIsAssessing(false);
      }
    }
    canvasCtx.restore();
  }, [isAssessing, drillTarget]);

  // Initialize MediaPipe once scripts are loaded
  useEffect(() => {
    if (holisticLoaded && cameraUtilsLoaded && drawingUtilsLoaded && videoRef.current) {
      const holistic = new window.Holistic({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
      });

      holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
      });

      holistic.onResults(onResults);

      if (videoRef.current && !cameraRef.current) {
        cameraRef.current = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await holistic.send({image: videoRef.current});
            }
          },
          width: 1280,
          height: 720
        });
        cameraRef.current.start();
      }
    }
  }, [holisticLoaded, cameraUtilsLoaded, drawingUtilsLoaded, onResults]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center text-white font-sans p-4">
      
      {/* TOP BAR */}
      <div className="w-full max-w-5xl flex justify-center gap-4 z-10 mb-4">
        <button 
          onClick={() => setMode('training')}
          className={`px-6 py-2 rounded-lg font-bold transition-colors ${mode === 'training' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}
        >
          Training Mode
        </button>
        <button 
          onClick={() => setMode('assessment')}
          className={`px-6 py-2 rounded-lg font-bold transition-colors ${mode === 'assessment' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}
        >
          Assessment Mode
        </button>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
        
        {/* Setup Message if loading */}
        {(!holisticLoaded || !cameraUtilsLoaded) && (
           <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900 text-white">
             <div className="text-center">
                <div className="text-2xl font-bold mb-2">Loading AI Models...</div>
                <div className="text-slate-400">Please allow camera access when prompted.</div>
             </div>
           </div>
        )}

        {/* Hidden Video Source */}
        <video 
          ref={videoRef} 
          className="hidden" 
          playsInline 
          muted 
          autoPlay
        ></video>
        
        {/* Visible Canvas Output */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
        />

        {/* HUD: TRAINING */}
        {mode === 'training' && (
          <div className="absolute top-6 left-6 p-6 rounded-2xl bg-slate-900/90 backdrop-blur border border-white/10 w-64 sm:w-80">
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Real-Time Feedback</h2>
            <div className={`text-2xl sm:text-3xl font-black mb-1 ${detectedSignal === 'NONE' ? 'text-white' : detectedSignal === 'EMERGENCY STOP' ? 'text-red-500' : 'text-green-400'}`}>
              {detectedSignal}
            </div>
            <div className="text-sm text-slate-400">
              {detectedSignal === 'NONE' ? "Align body to start" : "Signal Detected"}
            </div>
          </div>
        )}

        {/* HUD: ASSESSMENT */}
        {mode === 'assessment' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/90 backdrop-blur text-center pointer-events-auto mx-4 border border-white/10">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Drill Command</h2>
                
                {!drillTarget ? (
                   <button 
                     onClick={() => {
                       const targets = ['EMERGENCY STOP', 'RAISE BOOM', 'LOWER BOOM'];
                       setDrillTarget(targets[Math.floor(Math.random() * targets.length)]);
                       setIsAssessing(true);
                       setDrillSuccess(false);
                     }}
                     className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl w-full"
                   >
                     Start Random Drill
                   </button>
                ) : (
                   <div>
                      <div className="text-3xl sm:text-4xl font-black text-white mb-6">{drillTarget}</div>
                      {drillSuccess ? (
                        <div className="text-green-500 font-bold text-xl animate-bounce">SUCCESS!</div>
                      ) : (
                        <div className="text-yellow-500 font-mono animate-pulse">PERFORM SIGNAL NOW...</div>
                      )}
                      
                      {drillSuccess && (
                        <button onClick={() => setDrillTarget(null)} className="mt-6 text-sm text-blue-400 underline hover:text-blue-300">
                          Next Drill
                        </button>
                      )}
                   </div>
                )}
             </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-slate-500 text-sm max-w-lg text-center">
        If the camera does not start, please ensure you have given permission and are using a browser that supports WebAssembly.
      </div>
    </div>
  );
};

export default App;
