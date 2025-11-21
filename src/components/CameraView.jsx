import React, { forwardRef } from 'react';
import Webcam from 'react-webcam';

const CameraView = forwardRef(({ isLoaded }, ref) => {
  const { webcamRef, canvasRef } = ref;

  return (
    <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
      
      {/* Loading State */}
      {!isLoaded && (
         <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900 text-white">
           <div className="text-center">
              <div className="text-2xl font-bold mb-2 animate-pulse">Loading AI Models...</div>
              <div className="text-slate-400">Please allow camera access.</div>
           </div>
         </div>
      )}

      {/* Hidden Webcam Input */}
      <Webcam
        ref={webcamRef}
        className="hidden"
        width={1280}
        height={720}
        videoConstraints={{ facingMode: "user" }}
      />
      
      {/* Visible Canvas Output */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
      />
      
      {/* Child overlays (HUD, etc) will be rendered by parent via children prop if needed, 
          but currently they are siblings in App.jsx for cleaner z-index handling */}
    </div>
  );
});

export default CameraView;