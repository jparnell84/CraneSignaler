import React, { useRef, useEffect } from 'react';
import { useMediaPipe } from '../hooks/useMediaPipe';

export default function CameraView({ onDetections, setHolisticLoaded, setCameraError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // internal onResults: draw to canvas, then forward results to parent via onDetections
  const internalOnResults = (results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (videoWidth === 0 || videoHeight === 0) return;

    const canvasCtx = canvas.getContext('2d');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
    canvasCtx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

    if (window.drawConnectors && window.drawLandmarks) {
      const { POSE_CONNECTIONS, HAND_CONNECTIONS } = window;
      window.drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#64748b', lineWidth: 2 });
      window.drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#cbd5e1', lineWidth: 1, radius: 3 });
      window.drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: '#eab308', lineWidth: 2 });
      window.drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: '#eab308', lineWidth: 2 });
    }

    canvasCtx.restore();

    if (typeof onDetections === 'function') onDetections(results, { videoRef, canvasRef });
  };

  const { loaded, error } = useMediaPipe(videoRef, internalOnResults);

  useEffect(() => {
    if (typeof setHolisticLoaded === 'function') setHolisticLoaded(!!loaded);
  }, [loaded, setHolisticLoaded]);

  useEffect(() => {
    if (typeof setCameraError === 'function') setCameraError(error || null);
  }, [error, setCameraError]);

  return (
    <>
      <video ref={videoRef} id="input_video" playsInline muted autoPlay></video>
      <canvas ref={canvasRef} id="output_canvas" className="absolute inset-0 w-full h-full object-cover"></canvas>
    </>
  );
}

