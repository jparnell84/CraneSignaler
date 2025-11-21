import React from 'react';

export default function HUD({ mode, detectedSignal, thumb, angle }) {
  return (
    <>
      {mode === 'training' && (
        <div className="absolute top-6 left-6 p-6 rounded-2xl glass-panel w-64 sm:w-80">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Real-Time Feedback</h2>
          <div className={`text-2xl sm:text-3xl font-black mb-1 ${detectedSignal === 'NONE' ? 'text-white' : detectedSignal === 'EMERGENCY STOP' ? 'text-red-500' : 'text-green-400'}`}>
            {detectedSignal}
          </div>
          <div className="text-sm text-slate-400">
            {detectedSignal === 'NONE' ? "Align body to start" : "Signal Detected"}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm border-b border-slate-700 pb-2">
              <span className="text-slate-400">Thumb</span>
              <span className="font-mono font-bold text-yellow-500">{thumb ?? '--'}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-slate-700 pb-2">
              <span className="text-slate-400">Arm Angle</span>
              <span className="font-mono font-bold text-white">{angle ? `${Math.round(angle)}°` : '--°'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

