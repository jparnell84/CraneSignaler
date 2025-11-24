import React from 'react';

const DebugPanel = ({ stats, isVisible }) => {
  if (!isVisible || !stats) return null;

  // Helper to color code values based on thresholds (Visual feedback)
  const colorVal = (val, threshold, condition = 'gt') => {
     const num = parseFloat(val);
     if (isNaN(num)) return "text-gray-500";
     const isGood = condition === 'gt' ? num > threshold : num < threshold;
     return isGood ? "text-green-400 font-bold" : "text-yellow-500";
  };

  return (
    <div className="p-4 rounded-xl bg-slate-950/90 backdrop-blur border border-slate-700 w-72 font-mono text-xs text-slate-300 shadow-2xl h-fit">
      <h3 className="text-white font-bold border-b border-slate-700 pb-2 mb-3 tracking-wider">TELEMERY DATA</h3>
      
      <div className="space-y-4">
        
        {/* RIGHT ARM SECTION */}
        <div>
            <div className="text-blue-400 font-bold mb-1 border-b border-slate-800">RIGHT ARM</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <span>Angle:</span>
                <span className={colorVal(stats.rArmAngle, 140)}>{stats.rArmAngle}°</span>
                
                <span>Y-Level:</span>
                {/* < 0.0 means ABOVE shoulder */}
                <span className={colorVal(stats.rWristLevel, 0.0, 'lt')}>{stats.rWristLevel}</span>
            </div>
        </div>

        {/* RIGHT HAND DETAILED */}
        <div>
            <div className="text-blue-400 font-bold mb-1 border-b border-slate-800">RIGHT HAND</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {/* Index Straightness */}
                <span title="Tip Distance vs Knuckle Distance">Idx Straight:</span>
                <span className={colorVal(stats.rIndexRatio, 1.1)}>{stats.rIndexRatio}</span>
                
                {/* Hand Flatness */}
                <span title="Width / Height">Flat Ratio:</span>
                <span className={colorVal(stats.rFlatRatio, 1.2)}>{stats.rFlatRatio}</span>

                <span>Thumb X:</span>
                <span>{stats.rThumbX}</span>
            </div>
        </div>

        {/* SEPARATOR */}
        <div className="border-t border-slate-700 my-2"></div>

        {/* LEFT ARM SECTION */}
        <div>
            <div className="text-yellow-400 font-bold mb-1 border-b border-slate-800">LEFT ARM</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <span>Angle:</span>
                <span className={colorVal(stats.lArmAngle, 140)}>{stats.lArmAngle}°</span>
                
                <span>Y-Level:</span>
                <span className={colorVal(stats.lWristLevel, 0.0, 'lt')}>{stats.lWristLevel}</span>
            </div>
        </div>

        {/* LEFT HAND DETAILED */}
        <div>
            <div className="text-yellow-400 font-bold mb-1 border-b border-slate-800">LEFT HAND</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <span>Idx Straight:</span>
                <span className={colorVal(stats.lIndexRatio, 1.1)}>{stats.lIndexRatio}</span>
                
                <span>Flat Ratio:</span>
                <span className={colorVal(stats.lFlatRatio, 1.2)}>{stats.lFlatRatio}</span>

                <span>Thumb X:</span>
                <span>{stats.lThumbX}</span>
            </div>
        </div>

      </div>
      
      <div className="mt-4 pt-2 border-t border-slate-700 text-[10px] text-gray-500 italic">
        * Idx Straight &gt; 1.1 = Pointing<br/>
        * Flat Ratio &gt; 1.0 = Horizontal
      </div>
    </div>
  );
};

export default DebugPanel;