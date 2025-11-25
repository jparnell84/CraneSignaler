import React from 'react';

const HUD = ({ mode, leftAngle, rightAngle, signal, isVoiceActive, voiceCommand }) => {

  return (
    <div className="absolute top-4 left-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-600 shadow-xl w-72 z-40">
      {isVoiceActive ? (
        // --- VOICE MODE DISPLAY ---
        <div>
          <h1 className="text-xl font-bold text-red-400 mb-1">Voice Radio</h1>
          <p className="text-slate-300 text-xs mb-4">Input: <span className="font-mono text-white">Microphone</span></p>
          <div className="mt-3 pt-3 border-t border-slate-600 text-center">
             <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <div className="text-xl font-bold text-white">VOICE MODE</div>
             </div>
             <p className="text-xs text-slate-500 uppercase tracking-wider mt-4">Active Command</p>
             <div className="mt-1 text-2xl font-bold text-green-400 h-8">{voiceCommand !== 'NONE' ? voiceCommand : '...'}</div>
          </div>
        </div>
      ) : (
        // --- HAND SIGNAL DISPLAY (Only in Training Mode) ---
        mode === 'training' && (
          <div>
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
        )
      )}
    </div>
  );
};

export default HUD;