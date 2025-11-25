import React from 'react';

const HUD = ({ mode, leftAngle, rightAngle, signal, isVoiceActive, voiceCommand }) => {
  return (
    <div className="flex items-center justify-center gap-6 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 h-full">
      {isVoiceActive ? (
        // --- VOICE MODE (HORIZONTAL) ---
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-red-400">VOICE MODE</span>
          </div>
          <div className="w-px h-6 bg-slate-600" />
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400">COMMAND:</span>
            <span className="font-mono font-bold text-lg text-green-400">{voiceCommand !== 'NONE' ? voiceCommand : '...'}</span>
          </div>
        </div>
      ) : (
        // --- HAND SIGNAL (HORIZONTAL) ---
        mode === 'training' && (
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-400">SIGNAL:</span>
              <span className={`font-mono font-bold text-lg ${signal === 'NONE' || signal === 'WAITING...' ? 'text-white' : 'text-green-400'}`}>
                {signal}
              </span>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default HUD;