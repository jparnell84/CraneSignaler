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

  const colorBool = (val) => {
    if (val === "TRUE") return "text-green-400 font-bold";
    return "text-slate-500";
  };

  return (
    <div className="p-4 rounded-xl bg-slate-950/90 backdrop-blur border border-slate-700 w-72 font-mono text-xs text-slate-300 shadow-2xl h-fit">
      <h3 className="text-white font-bold border-b border-slate-700 pb-2 mb-3 tracking-wider">TELEMETRY DATA</h3>
      
      {/* POSE SECTION */}
      <div>
          <div className="text-purple-400 font-bold mb-1 border-b border-slate-800">POSE</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <span title="Distance between wrists">Wrist Dist:</span>
              <span className={colorVal(stats.wristDistance, 0.15, 'lt')}>{stats.wristDistance}</span>
              
              <span title="Left hand to head">L Hand-Head:</span>
              <span className={colorVal(stats.lHandToHead, 0.25, 'lt')}>{stats.lHandToHead}</span>

              <span title="Right hand to head">R Hand-Head:</span>
              <span className={colorVal(stats.rHandToHead, 0.25, 'lt')}>{stats.rHandToHead}</span>
          </div>
      </div>
      <div className="border-t border-slate-700 my-2"></div>

      {/* MOTION SECTION */}
      <div>
          <div className="text-cyan-400 font-bold mb-1 border-b border-slate-800">MOTION</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <span title="Repetitive clenching of left hand">L Clench:</span>
              <span className={colorBool(stats.lClenchStatus)}>{stats.lClenchStatus}</span>
              <span title="Repetitive clenching of right hand">R Clench:</span>
              <span className={colorBool(stats.rClenchStatus)}>{stats.rClenchStatus}</span>
              <span title="Horizontal waving motion of either wrist">Wave:</span>
              <span className={colorBool(stats.waveStatus)}>{stats.waveStatus}</span>
          </div>
      </div>
      <div className="border-t border-slate-700 my-2"></div>

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

                <span title="Thumb Tip X relative to Index Knuckle X">Thumb X:</span>
                <span className="text-slate-400">{stats.rThumbX}</span>

                <span title="Thumb Tip Y relative to Index Knuckle Y">Thumb Y:</span>
                <span className="text-slate-400">{stats.rThumbY}</span>
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

                <span title="Thumb Tip X relative to Index Knuckle X">Thumb X:</span>
                <span className="text-slate-400">{stats.lThumbX}</span>

                <span title="Thumb Tip Y relative to Index Knuckle Y">Thumb Y:</span>
                <span className="text-slate-400">{stats.lThumbY}</span>
            </div>
        </div>

      </div>
      
      <div className="mt-4 pt-2 border-t border-slate-700 text-[10px] text-gray-500 italic">
        * Idx Straight &gt; 1.1 = Pointing<br/>
        * Flat Ratio &gt; 1.0 = Horizontal<br/>
        * Thumb Y &gt; 0.05 = UP<br/>
        * Thumb Y &lt; -0.05 = DOWN
      </div>
    </div>
  );
};

export default DebugPanel;