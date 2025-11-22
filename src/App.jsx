import React, { useState, useRef, useCallback, useEffect } from 'react';
import DebugPanel from './components/DebugPanel';

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

// --- 2. GEOMETRY & MATH HELPERS ---

const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
};

const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return 1.0; 
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
};

const detectThumb = (handLandmarks) => {
    if (!handLandmarks) return "NONE";
    const thumbTip = handLandmarks[4];
    const indexMCP = handLandmarks[5]; 
    const wrist = handLandmarks[0];
    if (!thumbTip || !indexMCP || !wrist) return "NONE";

    const tipToKnuckle = indexMCP.y - thumbTip.y; 
    const threshold = Math.abs(wrist.y - indexMCP.y) * 0.5; 

    if (tipToKnuckle > threshold) return "UP";
    if (tipToKnuckle < -threshold) return "DOWN";
    return "NEUTRAL";
};

const detectThumbHorizontal = (handLandmarks, isRightHand) => {
    if (!handLandmarks) return "NONE";
    const thumbTip = handLandmarks[4];
    const indexMCP = handLandmarks[5]; 
    const wrist = handLandmarks[0]; 
    if (!thumbTip || !indexMCP) return "NONE";

    const diff = thumbTip.x - indexMCP.x;
    const handSize = calculateDistance(wrist, indexMCP);
    const threshold = handSize * 0.2;

    if (isRightHand) {
        if (diff < -threshold) return "OUT";
        if (diff > threshold) return "IN";
    } else {
        if (diff > threshold) return "OUT";
        if (diff < -threshold) return "IN";
    }
    return "NEUTRAL";
};

const detectIndexFinger = (handLandmarks) => {
    if (!handLandmarks) return "NONE";
    const tip = handLandmarks[8];
    const pip = handLandmarks[6];
    const wrist = handLandmarks[0];
    if (!tip || !pip) return "NONE";

    const threshold = Math.abs(wrist.y - pip.y) * 0.2;
    if (tip.y < pip.y - threshold) return "UP";
    if (tip.y > pip.y + threshold) return "DOWN";
    return "NEUTRAL";
};

const isFingerCurled = (landmarks, tipIdx, pipIdx) => {
    if (!landmarks) return false;
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    const distTipToWrist = calculateDistance(tip, wrist);
    const distPipToWrist = calculateDistance(pip, wrist);
    return distTipToWrist < distPipToWrist;
};

const areFingersExtended = (hand) => {
    if (!hand) return false;
    const wrist = hand[0];
    const checkFinger = (tipIdx, pipIdx) => {
        const tip = hand[tipIdx];
        const pip = hand[pipIdx];
        return calculateDistance(tip, wrist) > calculateDistance(pip, wrist);
    };
    return checkFinger(8,6) && checkFinger(12,10) && checkFinger(16,14) && checkFinger(20,18);
};

const isHandHorizontal = (hand) => {
    if (!hand) return false;
    const wrist = hand[0];
    const indexTip = hand[8]; 
    const dx = Math.abs(indexTip.x - wrist.x);
    const dy = Math.abs(indexTip.y - wrist.y);
    return dx > dy * 1.2;
};

const detectRepetitiveMotion = (history) => {
    if (history.length < 10) return false;
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    let totalPathLength = 0;

    for (let i = 0; i < history.length; i++) {
        const p = history[i];
        if(p.x < minX) minX = p.x;
        if(p.x > maxX) maxX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.y > maxY) maxY = p.y;
        if (i > 0) {
            const prev = history[i-1];
            totalPathLength += Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2));
        }
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const boxDiagonal = Math.sqrt(Math.pow(boxWidth, 2) + Math.pow(boxHeight, 2));

    if (boxDiagonal < 0.02) return false;
    const ratio = totalPathLength / boxDiagonal;
    return ratio > 1.2; 
};

const detectHorizontalWave = (history) => {
    if (history.length < 5) return false;
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    let totalPath = 0;

    for (let i = 0; i < history.length; i++) {
        const p = history[i];
        if(p.x < minX) minX = p.x;
        if(p.x > maxX) maxX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.y > maxY) maxY = p.y;
        if (i > 0) {
            const prev = history[i-1];
            totalPath += Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2));
        }
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const significantMove = width > 0.15;
    const isHorizontal = width > (height * 1.5);
    const isOscillating = totalPath > width * 1.2;

    return significantMove && isHorizontal && isOscillating;
};

const getDebugStats = (pose, lHand, rHand) => {
    if (!pose) return {};
    return {
        wristDist: calculateDistance(pose[15], pose[16]).toFixed(3),
        handsLow: (pose[15].y > pose[11].y).toString(),
        lArmAngle: calculateAngle(pose[11], pose[13], pose[15]).toFixed(0),
        rArmAngle: calculateAngle(pose[12], pose[14], pose[16]).toFixed(0),
        lHandBlade: lHand ? areFingersExtended(lHand).toString() : "No Hand",
        rHandBlade: rHand ? areFingersExtended(rHand).toString() : "No Hand",
        lHandFlat: lHand ? isHandHorizontal(lHand).toString() : "No Hand",
        rHandFlat: rHand ? isHandHorizontal(rHand).toString() : "No Hand",
        lThumbHoriz: lHand ? detectThumbHorizontal(lHand, false) : "None",
        rThumbHoriz: rHand ? detectThumbHorizontal(rHand, true) : "None"
    };
};

// --- 3. SIGNAL RULES ---

const SIGNAL_RULES = {
    'EMERGENCY STOP': (pose, lHand, rHand, lIdxHist, rIdxHist, lWristHist, rWristHist) => {
        if (!pose) return false;
        const rShoulder = pose[12]; const rElbow = pose[14];
        const lShoulder = pose[11]; const lElbow = pose[13];
        const upperArmsHorizontal = Math.abs(rShoulder.y - rElbow.y) < 0.15 && Math.abs(lShoulder.y - lElbow.y) < 0.15;
        if (!upperArmsHorizontal) return false;
        const rWaving = detectHorizontalWave(rWristHist);
        const lWaving = detectHorizontalWave(lWristHist);
        return rWaving || lWaving;
    },

    'DOG EVERYTHING': (pose) => {
        if (!pose) return false;
        const dist = calculateDistance(pose[15], pose[16]);
        const handsLow = pose[15].y > pose[11].y; 
        return dist < 0.12 && handsLow;
    },

    'MAIN HOIST': (pose) => {
        if (!pose) return false;
        const nose = pose[0];
        const rWrist = pose[16];
        const lWrist = pose[15];
        const rOnHead = rWrist.y < nose.y && calculateDistance(rWrist, nose) < 0.25;
        const lOnHead = lWrist.y < nose.y && calculateDistance(lWrist, nose) < 0.25;
        return rOnHead || lOnHead;
    },

    'AUX HOIST': (pose, lHand, rHand) => {
        if (!pose) return false;
        const isVerticalForearm = (shoulder, elbow, wrist) => {
            const angle = calculateAngle(shoulder, elbow, wrist);
            if (angle < 20 || angle > 70) return false; 
            const isVertical = Math.abs(wrist.x - elbow.x) < 0.15; 
            const isAbove = wrist.y < elbow.y; 
            return isVertical && isAbove;
        };
        const threshold = 0.3;
        const rArmActive = isVerticalForearm(pose[12], pose[14], pose[16]);
        const lHandTouching = calculateDistance(pose[15], pose[14]) < threshold;
        const lArmActive = isVerticalForearm(pose[11], pose[13], pose[15]);
        const rHandTouching = calculateDistance(pose[16], pose[13]) < threshold;
        return (rArmActive && lHandTouching) || (lArmActive && rHandTouching);
    },

    'HOIST LOAD': (pose, lHand, rHand, lIndexHist, rIndexHist) => {
        if (!pose) return false;
        const checkSide = (hand, history, shoulder, elbow, wrist, otherWristIndex, activeElbowIndex) => {
            if (!hand || !history) return false;
            const isForearmVertical = Math.abs(wrist.x - elbow.x) < 0.25;
            const isAbove = wrist.y < elbow.y; 
            if (!isForearmVertical || !isAbove) return false;
            const indexUp = detectIndexFinger(hand) === 'UP';
            const indexStraight = !isFingerCurled(hand, 8, 6); 
            if (!indexUp || !indexStraight) return false;
            const otherWrist = pose[otherWristIndex];
            const activeElbow = pose[activeElbowIndex];
            if (calculateDistance(otherWrist, activeElbow) < 0.3) return false;
            return detectRepetitiveMotion(history);
        };
        const rActive = checkSide(rHand, rIndexHist, pose[12], pose[14], pose[16], 15, 14);
        const lActive = checkSide(lHand, lIndexHist, pose[11], pose[13], pose[15], 16, 13);
        return rActive || lActive;
    },

    'LOWER LOAD': (pose, lHand, rHand, lIndexHist, rIndexHist) => {
        if (!pose) return false;
        const checkSide = (hand, history, shoulder, elbow, wrist, otherWristIndex, activeElbowIndex) => {
            if (!hand || !history) return false;
            const isForearmVertical = Math.abs(wrist.x - elbow.x) < 0.25;
            const isBelow = wrist.y > elbow.y; 
            if (!isForearmVertical || !isBelow) return false;
            const indexDown = detectIndexFinger(hand) === 'DOWN';
            const indexStraight = !isFingerCurled(hand, 8, 6);
            if (!indexDown || !indexStraight) return false;
            const otherWrist = pose[otherWristIndex];
            const activeElbow = pose[activeElbowIndex];
            if (calculateDistance(otherWrist, activeElbow) < 0.3) return false;
            return detectRepetitiveMotion(history);
        };
        const rActive = checkSide(rHand, rIndexHist, pose[12], pose[14], pose[16], 15, 14);
        const lActive = checkSide(lHand, lIndexHist, pose[11], pose[13], pose[15], 16, 13);
        return rActive || lActive;
    },

    'SWING BOOM': (pose, lHand, rHand) => {
        if (!pose) return false;
        const checkSide = (shoulder, elbow, wrist, hand, otherWrist, activeElbow) => {
            const armStraight = calculateAngle(shoulder, elbow, wrist) > 140;
            if (!armStraight) return false;
            const touchingElbow = calculateDistance(otherWrist, activeElbow) < 0.25;
            if (!touchingElbow) return false;
            if (!hand) return false; 
            const fingersExtended = areFingersExtended(hand);
            const handHorizontal = isHandHorizontal(hand);
            return fingersExtended && handHorizontal;
        };
        const rActive = checkSide(pose[12], pose[14], pose[16], rHand, pose[15], pose[14]);
        const lActive = checkSide(pose[11], pose[13], pose[15], lHand, pose[16], pose[13]);
        return rActive || lActive;
    },

    'RAISE BOOM': (pose, lHand, rHand) => {
        if (!pose) return false;
        const lThumb = detectThumb(lHand);
        const rThumb = detectThumb(rHand);
        const rArm = calculateAngle(pose[12], pose[14], pose[16]);
        const lArm = calculateAngle(pose[11], pose[13], pose[15]);
        const armOut = rArm > 130 || lArm > 130;
        return armOut && (lThumb === 'UP' || rThumb === 'UP');
    },

    'LOWER BOOM': (pose, lHand, rHand) => {
        if (!pose) return false;
        const lThumb = detectThumb(lHand);
        const rThumb = detectThumb(rHand);
        const rArm = calculateAngle(pose[12], pose[14], pose[16]);
        const lArm = calculateAngle(pose[11], pose[13], pose[15]);
        const armOut = rArm > 130 || lArm > 130;
        return armOut && (lThumb === 'DOWN' || rThumb === 'DOWN');
    },

    'EXTEND BOOM': (pose, lHand, rHand) => {
        const isFist = (hand) => isFingerCurled(hand, 8, 6); 
        const lDir = detectThumbHorizontal(lHand, false); 
        const rDir = detectThumbHorizontal(rHand, true);
        const lFist = lHand ? isFist(lHand) : false;
        const rFist = rHand ? isFist(rHand) : false;
        return lDir === 'OUT' && rDir === 'OUT' && lFist && rFist;
    },

    'RETRACT BOOM': (pose, lHand, rHand) => {
        const isFist = (hand) => isFingerCurled(hand, 8, 6);
        const lDir = detectThumbHorizontal(lHand, false);
        const rDir = detectThumbHorizontal(rHand, true);
        const lFist = lHand ? isFist(lHand) : false;
        const rFist = rHand ? isFist(rHand) : false;
        return lDir === 'IN' && rDir === 'IN' && lFist && rFist;
    },
};

// --- 4. UI COMPONENTS ---

const HUD = ({ mode, leftAngle, rightAngle, signal }) => {
  if (mode !== 'training') return null;
  return (
    <div className="absolute top-4 left-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-600 shadow-xl w-72 z-40">
      <h1 className="text-xl font-bold text-yellow-400 mb-1">Signal Evaluator</h1>
      <p className="text-slate-300 text-xs mb-4">Mode: <span className="font-mono text-white">Training</span></p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Left Arm:</span>
          <span className="font-mono font-bold text-white">{Math.round(leftAngle)}°</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Right Arm:</span>
          <span className="font-mono font-bold text-white">{Math.round(rightAngle)}°</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-600">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Current Signal</p>
          <div className={`mt-1 text-2xl font-bold ${signal === 'NONE' || signal === 'WAITING...' ? 'text-white' : 'text-green-400'}`}>
            {signal}
          </div>
        </div>
      </div>
    </div>
  );
};

const AssessmentDrill = ({ mode, target, success, onStart, onNext }) => {
  if (mode !== 'assessment') return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
       <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/95 backdrop-blur text-center pointer-events-auto mx-4 border border-white/10">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Drill Command</h2>
          {!target ? (
             <button onClick={onStart} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl w-full">Start Random Drill</button>
          ) : (
             <div>
                <div className="text-4xl font-black text-white mb-6">{target}</div>
                {success ? (
                  <div className="text-green-500 font-bold text-xl animate-bounce">SUCCESS!</div>
                ) : (
                  <div className="text-yellow-500 font-mono animate-pulse">PERFORM SIGNAL...</div>
                )}
                {success && (
                  <button onClick={onNext} className="mt-6 text-sm text-blue-400 underline hover:text-blue-300">Next Drill</button>
                )}
             </div>
          )}
       </div>
    </div>
  );
};

const VoiceSubtitle = ({ text }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (text) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [text]);
  if (!visible || !text) return null;
  return (
    <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none z-50">
        <div className="bg-black/60 backdrop-blur px-6 py-2 rounded-full border border-white/10">
            <span className="text-white font-mono">🎤 "{text}"</span>
        </div>
    </div>
  );
};

// --- 5. MAIN APP COMPONENT ---

const App = () => {
  const [mode, setMode] = useState('training'); 
  const [detectedSignal, setDetectedSignal] = useState('WAITING...');
  const [leftAngle, setLeftAngle] = useState(0);
  const [rightAngle, setRightAngle] = useState(0);
  const [drillTarget, setDrillTarget] = useState(null);
  const [drillSuccess, setDrillSuccess] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugStats, setDebugStats] = useState(null);
  const [voiceCommand, setVoiceCommand] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);

  const leftIndexHistory = useRef([]);
  const rightIndexHistory = useRef([]);
  const leftWristHistory = useRef([]);
  const rightWristHistory = useRef([]);

  // Voice Logic Stub
  const toggleVoice = () => {
      setIsVoiceActive(!isVoiceActive);
      if (!isVoiceActive) setVoiceCommand("Voice Mode: Mock Enabled");
  };

  const updateGeneralHistory = (landmark, historyRef) => {
    if (landmark) {
        historyRef.current.push({ x: landmark.x, y: landmark.y });
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
      
      const lIndex = results.leftHandLandmarks ? results.leftHandLandmarks[8] : null;
      const rIndex = results.rightHandLandmarks ? results.rightHandLandmarks[8] : null;
      updateGeneralHistory(lIndex, leftIndexHistory);
      updateGeneralHistory(rIndex, rightIndexHistory);
      updateGeneralHistory(pose[15], leftWristHistory);
      updateGeneralHistory(pose[16], rightWristHistory);

      setLeftAngle(calculateAngle(pose[11], pose[13], pose[15]));
      setRightAngle(calculateAngle(pose[12], pose[14], pose[16]));

      if (showDebug) {
          const stats = getDebugStats(pose, results.leftHandLandmarks, results.rightHandLandmarks);
          setDebugStats(stats);
      }

      let activeSignal = "NONE";
      for (const sig of Object.keys(SIGNAL_RULES)) {
          if (SIGNAL_RULES[sig](
              pose, 
              results.leftHandLandmarks, 
              results.rightHandLandmarks,
              leftIndexHistory.current,  
              rightIndexHistory.current, 
              leftWristHistory.current,  
              rightWristHistory.current  
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
  }, [mode, drillTarget, showDebug]);

  // Load scripts
  const holisticLoaded = useMediaPipeScript("https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js");
  const cameraUtilsLoaded = useMediaPipeScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
  const drawingUtilsLoaded = useMediaPipeScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");

  useEffect(() => {
    if (holisticLoaded && cameraUtilsLoaded && drawingUtilsLoaded && webcamRef.current) {
      const holistic = new window.Holistic({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
      });

      holistic.setOptions({
        modelComplexity: 2, // HEAVY model for better hand tracking
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

      <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
          {(!holisticLoaded) && (
             <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900 text-white">
               <div className="text-center">
                  <div className="text-2xl font-bold mb-2 animate-pulse">Loading AI Models...</div>
                  <div className="text-slate-400">Please allow camera access.</div>
               </div>
             </div>
          )}
          <video ref={webcamRef} className="hidden" playsInline muted autoPlay></video>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
          
          <HUD mode={mode} leftAngle={leftAngle} rightAngle={rightAngle} signal={detectedSignal} />
          <DebugPanel isVisible={showDebug} stats={debugStats} />
          <AssessmentDrill mode={mode} target={drillTarget} success={drillSuccess} onStart={startDrill} onNext={() => setDrillTarget(null)} />
          <VoiceSubtitle text={voiceCommand} />
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