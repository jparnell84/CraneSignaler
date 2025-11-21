import React from 'react';

// HUD displays a compact overlay with current mode, detected signal, and an arm angle.
const HUD = ({ mode, detectedSignal, thumb, leftAngle, rightAngle, activeArm = null, progress = 0 }) => {
  const cardStyle = "absolute top-4 left-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-600 shadow-xl w-72";

  if (mode === 'assessment') return null;

  const displayLeft = typeof leftAngle === 'number' && !Number.isNaN(leftAngle) ? `${Math.round(leftAngle)}°` : '—';
  const displayRight = typeof rightAngle === 'number' && !Number.isNaN(rightAngle) ? `${Math.round(rightAngle)}°` : '—';
  const statusClass = !detectedSignal || detectedSignal === 'NONE' || detectedSignal === 'WAITING...' ? 'text-white' : 'text-green-500';

  return (
    <div className={cardStyle}>
      <h1 className="text-xl font-bold text-yellow-400 mb-1">Signal Evaluator</h1>
      <p className="text-slate-300 text-xs mb-4">Mode: <span className="font-mono text-white">Training</span></p>


      <div className="space-y-2">
        <div className={`flex justify-between text-sm p-1 rounded ${activeArm === 'left' ? 'bg-slate-800/60' : ''}`}>
          <span className="text-slate-400">Left Arm Angle:</span>
          <span className="font-mono font-bold text-white">{displayLeft}</span>
        </div>

        <div className={`flex justify-between text-sm p-1 rounded ${activeArm === 'right' ? 'bg-slate-800/60' : ''}`}>
          <span className="text-slate-400">Right Arm Angle:</span>
          <span className="font-mono font-bold text-white">{displayRight}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Thumb:</span>
          <span className="font-mono font-bold text-white">{thumb || '—'}</span>
        </div>

        {progress > 0 && (
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
            <div className="h-2 rounded-full bg-green-400" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-600">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Current Signal</p>
          <div className={`mt-1 text-2xl font-bold ${statusClass}`}>
            {detectedSignal || 'WAITING...'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HUD;