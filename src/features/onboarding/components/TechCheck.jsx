import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Video, Mic } from 'lucide-react';

// --- Mock/Placeholder Implementations ---
// In a real scenario, you would import your actual CameraView and AI logic.
const CameraView = ({ onResults, style }) => (
  <div style={style} className="bg-black flex items-center justify-center text-white">
    <p>CameraView Placeholder</p>
  </div>
);

// This mock hook simulates voice recognition.
const useVoiceManager = (onWordDetected) => {
  const listen = () => {
    console.log("VoiceManager: Listening for 'Ready'...");
    // Simulate successful detection after 3 seconds
    setTimeout(() => {
      console.log("VoiceManager: Detected 'Ready'!");
      onWordDetected('ready');
    }, 3000);
  };
  return { listen };
};
// --- End Mocks ---

const TechCheck = () => {
  const navigate = useNavigate();
  const [checks, setChecks] = useState({
    permissions: 'pending', // 'pending', 'granted', 'denied'
    orientation: 'pending', // 'pending', 'ok'
    bodyVisible: 'pending', // 'pending', 'ok', 'adjust'
    mic: 'pending', // 'pending', 'listening', 'verified'
  });

  const allChecksPassed = Object.values(checks).every(status => status === 'ok' || status === 'granted' || status === 'verified');

  // 1. Permissions Check
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setChecks(prev => ({ ...prev, permissions: 'granted' }));
        // Stop the tracks immediately as we only needed to confirm permission
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("Permission denied:", err);
        setChecks(prev => ({ ...prev, permissions: 'denied' }));
      }
    };
    requestPermissions();
  }, []);

  // 2. Orientation Check (for mobile)
  useEffect(() => {
    // This is a simple check. A more robust solution might use screen.orientation API.
    if (window.innerWidth < window.innerHeight && /Mobi|Android/i.test(navigator.userAgent)) {
      setChecks(prev => ({ ...prev, orientation: 'pending' }));
    } else {
      setChecks(prev => ({ ...prev, orientation: 'ok' }));
    }
  }, []);

  // 3. Body Visibility Check (simulated)
  const handlePoseResults = (results) => {
    // Placeholder: In your real app, you'd get this from your AI `signals.js`
    const isVisible = (landmark) => landmark && landmark.visibility > 0.8;

    const { poseLandmarks } = results;
    if (poseLandmarks &&
        isVisible(poseLandmarks[11]) && // left_shoulder
        isVisible(poseLandmarks[12]) && // right_shoulder
        isVisible(poseLandmarks[15]) && // left_wrist
        isVisible(poseLandmarks[16])) { // right_wrist
      setChecks(prev => ({ ...prev, bodyVisible: 'ok' }));
    } else {
      setChecks(prev => ({ ...prev, bodyVisible: 'adjust' }));
    }
  };

  // Simulate receiving AI results when permissions are granted
  useEffect(() => {
    if (checks.permissions === 'granted') {
      // Simulate a failed check first
      handlePoseResults({ poseLandmarks: [] });
      // Simulate a successful check after 2 seconds
      const timer = setTimeout(() => handlePoseResults({
        poseLandmarks: { 11: {visibility: 0.9}, 12: {visibility: 0.9}, 15: {visibility: 0.9}, 16: {visibility: 0.9} }
      }), 2000);
      return () => clearTimeout(timer);
    }
  }, [checks.permissions]);

  // 4. Microphone Check
  const { listen } = useVoiceManager((word) => {
    if (word.toLowerCase() === 'ready') {
      setChecks(prev => ({ ...prev, mic: 'verified' }));
    }
  });

  const startMicCheck = () => {
    setChecks(prev => ({ ...prev, mic: 'listening' }));
    listen();
  };

  const CheckItem = ({ status, text, Icon }) => {
    const statusMap = {
      pending: { color: 'text-slate-400', icon: <Icon className="w-5 h-5" /> },
      granted: { color: 'text-green-400', icon: <CheckCircle className="w-5 h-5" /> },
      ok: { color: 'text-green-400', icon: <CheckCircle className="w-5 h-5" /> },
      verified: { color: 'text-green-400', icon: <CheckCircle className="w-5 h-5" /> },
      denied: { color: 'text-red-400', icon: <XCircle className="w-5 h-5" /> },
      adjust: { color: 'text-yellow-400', icon: <AlertTriangle className="w-5 h-5 animate-pulse" /> },
      listening: { color: 'text-blue-400', icon: <Mic className="w-5 h-5 animate-pulse" /> },
    };
    return (
      <li className={`flex items-center space-x-3 ${statusMap[status]?.color || 'text-slate-400'}`}>
        {statusMap[status]?.icon}
        <span>{text}</span>
      </li>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <div className="relative aspect-video">
        <CameraView style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }} onResults={handlePoseResults} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-4">System Check</h2>
        <ul className="space-y-3 text-lg">
          <CheckItem status={checks.permissions} text="Allow camera & microphone" Icon={Video} />
          <CheckItem status={checks.orientation} text="Use landscape orientation on mobile" Icon={AlertTriangle} />
          <CheckItem status={checks.bodyVisible} text="Upper body is visible in frame" Icon={Video} />
          <CheckItem status={checks.mic} text="Microphone is working" Icon={Mic} />
        </ul>
        {checks.bodyVisible === 'adjust' && <p className="text-yellow-400 mt-4">Please stand back so your shoulders and hands are visible.</p>}
        {checks.permissions === 'denied' && <p className="text-red-400 mt-4">Permissions are required. Please enable them in your browser settings and refresh the page.</p>}

        {checks.permissions === 'granted' && checks.mic === 'pending' && (
          <button onClick={startMicCheck} className="mt-6 w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500">Test Microphone</button>
        )}

        <button
          onClick={() => navigate('/level-map')}
          disabled={!allChecksPassed}
          className="mt-6 w-full px-4 py-3 rounded-lg font-bold text-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          Start Learning
        </button>
      </div>
    </div>
  );
};

export default TechCheck;