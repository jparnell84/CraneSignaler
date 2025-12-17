import React, { createContext, useState, useRef, useCallback, useEffect } from 'react';
import { useMediaPipe } from '/src/hooks/useMediaPipe.js';
import useSpeechRecognition from '/src/hooks/useSpeechRecognition.js';
import { SIGNAL_RULES } from '/src/core/signals.js';

const ALL_SIGNALS = Object.keys(SIGNAL_RULES);
const HISTORY_LENGTH = 30;

export const MediaContext = createContext(null);

export const MediaProvider = ({ children }) => {
    // --- Refs ---
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);

    // --- State ---
    const [isLoaded, setIsLoaded] = useState(false);
    const [bodyVisibleStatus, setBodyVisibleStatus] = useState('pending');
    const [detectedSignal, setDetectedSignal] = useState('NONE');
    const [isListening, setIsListening] = useState(false);

    // --- Histories for motion detection ---
    const histories = useRef({
        lWristHist: [], rWristHist: [],
        lHandHist: [], rHandHist: [],
    });

    // --- Main AI Results Callback ---
    const onResults = useCallback((results) => {
        setIsLoaded(true);
        const { poseLandmarks, leftHandLandmarks, rightHandLandmarks } = results;

        // 1. Body visibility check
        const isVisible = (landmark) => landmark && landmark.visibility > 0.8;
        if (poseLandmarks && isVisible(poseLandmarks[11]) && isVisible(poseLandmarks[12]) && isVisible(poseLandmarks[15]) && isVisible(poseLandmarks[16])) {
            setBodyVisibleStatus('ok');
        } else {
            setBodyVisibleStatus(poseLandmarks ? 'acquiring' : 'pending');
        }

        // 2. Signal detection
        if (!poseLandmarks) {
            setDetectedSignal('POSE_NOT_DETECTED');
            return;
        }

        // Update histories
        const lWrist = poseLandmarks[15];
        const rWrist = poseLandmarks[16];
        if (lWrist) histories.current.lWristHist.push(lWrist);
        if (rWrist) histories.current.rWristHist.push(rWrist);
        if (leftHandLandmarks) histories.current.lHandHist.push(leftHandLandmarks);
        if (rightHandLandmarks) histories.current.rHandHist.push(rightHandLandmarks);

        for (const key in histories.current) {
            if (histories.current[key].length > HISTORY_LENGTH) {
                histories.current[key].shift();
            }
        }

        // Check rules
        for (const signalName of ALL_SIGNALS) {
            if (SIGNAL_RULES[signalName](poseLandmarks, leftHandLandmarks, rightHandLandmarks, histories.current)) {
                setDetectedSignal(signalName);
                return;
            }
        }
        setDetectedSignal('NONE');
    }, []);

    // --- Hooks Initialization ---
    const mediaPipeLoaded = useMediaPipe(webcamRef, onResults);
    const { text, stop } = useSpeechRecognition(isListening);

    const value = {
        webcamRef, canvasRef, 
        isLoaded: isLoaded && mediaPipeLoaded,
        bodyVisibleStatus, detectedSignal,
        speechText: text, setIsListening, stopSpeech: stop,
    };

    return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
};
