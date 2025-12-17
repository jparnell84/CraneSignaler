import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Video, Mic, Loader } from 'lucide-react';
import CameraView from '../../../components/CameraView';
import { MediaContext } from '/src/hooks/MediaProvider.jsx';

const TechCheck = () => {
  const navigate = useNavigate();
  const [checks, setChecks] = useState({
    permissions: 'pending', // 'pending', 'granted', 'denied'
    orientation: 'pending', // 'pending', 'ok'
    bodyVisible: 'pending', // 'pending', 'acquiring', 'ok'
    mic: 'pending', // 'pending', 'listening', 'verified'
    finalConfirmation: 'pending', // 'pending', 'listening'
  });

  const preChecksPassed =
    (checks.permissions === 'granted') &&
    (checks.orientation === 'ok') &&
    (checks.bodyVisible === 'ok') &&
    (checks.mic === 'verified');

  // --- CONTEXT ---
  const { webcamRef, canvasRef, isLoaded, bodyVisibleStatus, speechText, setIsListening, stopSpeech } = useContext(MediaContext);
  
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

  // Update component state based on the pose detector hook's output
  useEffect(() => {
    // Update the check status for the UI list
    if (isLoaded) {
      setChecks(prev => ({ ...prev, bodyVisible: bodyVisibleStatus }));
    }
  }, [isLoaded, bodyVisibleStatus]);

  // 4. Microphone Check (now automatic)
  useEffect(() => {
    // Automatically start mic check once user is in position and mic hasn't been checked yet.
    if (checks.bodyVisible === 'ok' && checks.mic === 'pending') {
      setChecks(prev => ({ ...prev, mic: 'listening' }));
    }
  }, [checks.bodyVisible, checks.mic]);

  // 5. Final Confirmation (Voice Command to Start)
  useEffect(() => {
    if (preChecksPassed) {
      // All checks are done, now listen for the "Begin" command.
      setChecks(prev => ({ ...prev, finalConfirmation: 'listening' }));
    }
  }, [preChecksPassed]);

  // Centralized Speech Recognition Logic
  useEffect(() => {
    setIsListening(checks.mic === 'listening' || checks.finalConfirmation === 'listening');
  }, [checks.mic, checks.finalConfirmation, setIsListening]);

  useEffect(() => {
    if (checks.mic === 'listening' && speechText.toLowerCase().includes('ready')) {
      setChecks(prev => ({ ...prev, mic: 'verified' }));
    }
    if (checks.finalConfirmation === 'listening' && speechText.toLowerCase().includes('begin')) {
      stopSpeech(); // Now we can stop listening
      navigate('/level-map');
    }
  }, [speechText, checks.mic, checks.finalConfirmation, stopSpeech, navigate]);

  const CheckItem = ({ status, text, Icon }) => {
    const statusMap = {
      pending: { color: 'text-slate-400', icon: <Icon className="w-5 h-5" /> },
      granted: { color: 'text-green-400', icon: <CheckCircle className="w-5 h-5" /> },
      ok: { color: 'text-green-400', icon: <CheckCircle className="w-5 h-5" /> },
      verified: { color: 'text-green-400', icon: <CheckCircle className="w-5 h-5" /> },
      denied: { color: 'text-red-400', icon: <XCircle className="w-5 h-5" /> },
      acquiring: { color: 'text-yellow-400', icon: <Loader className="w-5 h-5 animate-spin" /> },
      listening: { color: 'text-blue-400', icon: <Mic className="w-5 h-5 animate-pulse" /> },
      'final-listening': { color: 'text-green-400', icon: <CheckCircle className="w-5 h-5" /> },
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
        <CameraView ref={{ webcamRef, canvasRef }} isLoaded={isLoaded} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-4">System Check</h2>
        <ul className="space-y-3 text-lg">
          <CheckItem status={checks.permissions} text="Allow camera & microphone" Icon={Video} />
          <CheckItem status={checks.orientation} text="Use landscape orientation on mobile" Icon={AlertTriangle} />
          <CheckItem status={checks.bodyVisible} text="Upper body is visible in frame" Icon={Video} />
          <CheckItem 
            status={checks.mic} 
            text={checks.mic === 'listening' ? "Say 'Ready'..." : "Microphone is working"} 
            Icon={Mic} 
          />
        </ul>
        {checks.bodyVisible === 'acquiring' && <p className="text-yellow-400 mt-4">Acquiring pose... Please stand back so your shoulders and hands are visible.</p>}
        {checks.permissions === 'denied' && <p className="text-red-400 mt-4">Permissions are required. Please enable them in your browser settings and refresh the page.</p>}
        
        {preChecksPassed && (
          <div className="mt-6 text-center p-4 rounded-lg bg-green-500/10 border border-green-500">
            <p className="text-xl font-bold text-green-300 animate-pulse">All systems go! Say "Begin" to start.</p>
          </div>
        )}

        <button
          onClick={() => navigate('/level-map')}
          disabled={!preChecksPassed}
          className="mt-6 w-full px-4 py-3 rounded-lg font-bold text-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors hidden"
        >Start Learning</button>
      </div>
    </div>
  );
};

export default TechCheck;