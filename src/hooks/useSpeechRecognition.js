import { useState, useEffect, useRef, useCallback } from 'react';

const useSpeechRecognition = (isListening) => {
  const [text, setText] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(isListening); // Ref to track state inside callbacks

  // Keep ref in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    // 1. Check Browser Support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      
      // OPTIMIZATION FOR MOBILE:
      // Safari hates 'continuous'. We set it to false and manually restart on 'end'.
      // This is more stable on iOS than relying on the browser's continuous loop.
      recognition.continuous = false; 
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
           setText(finalTranscript.toLowerCase());
        }
      };

      recognition.onend = () => {
        // AUTOMATIC RESTART (The Safari Fix)
        // If the browser stopped, but our React state says "we are still listening",
        // start it up again immediately.
        if (isListeningRef.current) {
            try {
                recognition.start();
            } catch (e) {
                // Ignore "already started" errors
            }
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error", event.error);
        // On mobile, 'no-speech' errors are common in loud environments. 
        // We ignore them so the onend loop can restart us.
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // 2. Handle Start/Stop Triggers
  useEffect(() => {
    if (!recognitionRef.current || !isSupported) return;

    if (isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started
      }
    } else {
      recognitionRef.current.stop();
      // We manually abort so the 'onend' restart logic doesn't fire
      recognitionRef.current.abort(); 
    }
  }, [isListening, isSupported]);

  return { text, isSupported };
};

export default useSpeechRecognition;