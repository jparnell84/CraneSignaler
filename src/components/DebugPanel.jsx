import React from 'react';

const DebugPanel = ({ stats, isVisible }) => {
  if (!isVisible || !stats) return null;

  return (
    <div className="absolute top-4 right-4 p-4 rounded-xl bg-black/80 backdrop-blur border border-red-500/30 w-64 font-mono text-xs text-green-400 shadow-2xl overflow-y-auto max-h-[80vh]">
      <h3 className="text-white font-bold border-b border-gray-700 pb-2 mb-2">DEBUG METRICS</h3>
      
      <div className="space-y-3">
        {/* DOG EVERYTHING */}
        <div>
          <p className="text-gray-400 mb-1">-- Dog Everything --</p>
          <div className="flex justify-between">
            <span>Wrist Dist:</span>
            <span className={stats.wristDist < 0.15 ? "text-white font-bold" : "text-red-400"}>{stats.wristDist}</span>
          </div>
          <div className="flex justify-between">
            <span>Hands Low:</span>
            <span className={stats.handsLow === "true" ? "text-white" : "text-red-400"}>{stats.handsLow}</span>
          </div>
        </div>

        {/* SWING BOOM */}
        <div>
          <p className="text-gray-400 mb-1 border-t border-gray-700 pt-2">-- Swing Boom --</p>
          <div className="flex justify-between">
            <span>L Arm Angle:</span>
            <span>{stats.lArmAngle}°</span>
          </div>
          <div className="flex justify-between">
            <span>L Blade:</span>
            <span className={stats.lHandBlade === "true" ? "text-white" : "text-red-400"}>{stats.lHandBlade}</span>
          </div>
          <div className="flex justify-between">
            <span>L Flat:</span>
            <span className={stats.lHandFlat === "true" ? "text-white" : "text-red-400"}>{stats.lHandFlat}</span>
          </div>
          <div className="mt-1 border-t border-gray-800 pt-1">
             <div className="flex justify-between">
                <span>R Blade:</span>
                <span className={stats.rHandBlade === "true" ? "text-white" : "text-red-400"}>{stats.rHandBlade}</span>
            </div>
            <div className="flex justify-between">
                <span>R Flat:</span>
                <span className={stats.rHandFlat === "true" ? "text-white" : "text-red-400"}>{stats.rHandFlat}</span>
            </div>
          </div>
        </div>

        {/* EXTEND/RETRACT */}
        <div>
          <p className="text-gray-400 mb-1 border-t border-gray-700 pt-2">-- Thumbs --</p>
          <div className="flex justify-between">
            <span>L Dir:</span>
            <span>{stats.lThumbHoriz}</span>
          </div>
          <div className="flex justify-between">
            <span>R Dir:</span>
            <span>{stats.rThumbHoriz}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;