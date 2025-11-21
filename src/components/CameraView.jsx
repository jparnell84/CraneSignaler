import React from 'react';

export default function CameraView({ videoRef, canvasRef }) {
  return (
    <>
      <video ref={videoRef} id="input_video" playsInline muted autoPlay></video>
      <canvas ref={canvasRef} id="output_canvas" className="absolute inset-0 w-full h-full object-cover"></canvas>
    </>
  );
}

