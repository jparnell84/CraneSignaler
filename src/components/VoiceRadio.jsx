import React, { useEffect, useState, useRef } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition'; 
import { parseVoiceCommand } from '../core/voiceParser';

export const VoiceRadio = ({ isActive }) => {
  const { text, isSupported } = useSpeechRecognition(isActive);
  const [history, setHistory] = useState([]);
  const [protocolStatus, setProtocolStatus] = useState('WAITING'); // WAITING -> FUNCTION -> GUIDING -> STOPPED
  const lastTextRef = useRef('');

  // Auto-scroll
  const scrollRef = useRef(null);

  useEffect(() => {
    if (text && text !== lastTextRef.current) {
        lastTextRef.current = text;
        const parsed = parseVoiceCommand(text);

        // Add to log
        setHistory(prev => [...prev.slice(-3), { ...parsed, timestamp: new Date() }]);
        
        // --- PROTOCOL ASSESSMENT LOGIC ---
        if (parsed.type === 'FUNCTION') {
            setProtocolStatus('FUNCTION_SET');
        } else if (parsed.type === 'DISTANCE') {
            if (protocolStatus === 'FUNCTION_SET' || protocolStatus === 'GUIDING') {
                setProtocolStatus('GUIDING');
            }
        } else if (parsed.type === 'STOP') {
            setProtocolStatus('STOPPED');
            // Reset logic after a delay
            setTimeout(() => setProtocolStatus('WAITING'), 3000);
        }
    }

    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, protocolStatus]);

  if (!isActive) return null;

  return (
    <div className="absolute bottom-4 left-4 z-50 w-72 pointer-events-none">
        <div className="bg-slate-900/90 border border-slate-600 rounded-lg overflow-hidden shadow-xl backdrop-blur">
            
            {/* Header */}
            <div className="bg-slate-800 px-4 py-2 flex justify-between items-center border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        {isSupported ? 'Radio Ch. 1' : 'Mic Not Supported'}
                    </span>
                </div>
            </div>

            {/* Log Feed */}
            <div ref={scrollRef} className="h-32 overflow-y-auto p-3 space-y-2 font-mono text-xs flex flex-col justify-end">
                {history.length === 0 && <span className="text-slate-600 italic">Listening...</span>}
                {history.map((log, i) => (
                    <div key={i} className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className={`text-[10px] font-bold uppercase ${
                            log.type === 'STOP' ? 'text-red-400' :
                            log.type === 'DISTANCE' ? 'text-blue-400' :
                            log.type === 'FUNCTION' ? 'text-yellow-400' : 'text-gray-500'
                        }`}>
                            {log.type === 'DISTANCE' ? `${log.value}ft` : log.type}
                        </span>
                        <span className="text-white">"{log.original}"</span>
                    </div>
                ))}
            </div>

            {/* Protocol Status Bar */}
            <div className="px-3 py-1 bg-black/50 border-t border-slate-700 flex justify-between items-center">
                 <span className="text-[10px] text-slate-400">STATUS</span>
                 <span className={`text-[10px] font-bold ${
                     protocolStatus === 'WAITING' ? 'text-slate-500' :
                     protocolStatus === 'FUNCTION_SET' ? 'text-yellow-500' :
                     protocolStatus === 'GUIDING' ? 'text-blue-500' : 'text-red-500'
                 }`}>
                    {protocolStatus}
                 </span>
            </div>
        </div>
    </div>
  );
};

export default VoiceRadio;