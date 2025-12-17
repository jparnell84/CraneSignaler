import { useEffect, useState, useRef } from 'react';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import wasm from '@mediapipe/holistic/holistic_solution_simd_wasm_bin.wasm?url';

export const useMediaPipe = (videoRef, onResults) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const holisticRef = useRef(null);
    const cameraRef = useRef(null);
    
    // 1. Create a ref to hold the latest callback
    const onResultsRef = useRef(onResults);

    // 2. Update the ref whenever the parent passes a new callback
    useEffect(() => {
        onResultsRef.current = onResults;
    }, [onResults]);

    useEffect(() => {
        if (!videoRef.current?.video || holisticRef.current) return;

        const holistic = new Holistic({
            locateFile: (file) => {
                // This is a robust way to get the asset path in Vite.
                // We get the URL of one file and then construct the path for the others.
                return wasm.replace('holistic_solution_simd_wasm_bin.wasm', file);
            }
        });


        holistic.setOptions({
            smoothLandmarks: true,
            enableSegmentation: false,
            refineFaceLandmarks: false,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        });

        holisticRef.current = holistic;

        // 3. Wrap the call to always use .current
        // This allows MediaPipe to keep running without re-initialization
        // while always calling the freshest version of your logic.
        holistic.onResults((results) => {
            setIsLoaded(true);
            if (onResultsRef.current) {
                onResultsRef.current(results);
            }
        });

        if (videoRef.current && videoRef.current.video) {
            const camera = new Camera(videoRef.current.video, {
                onFrame: async () => {
                    if(videoRef.current && videoRef.current.video) {
                        await holistic.send({image: videoRef.current.video});
                    }
                },
                width: 1280,
                height: 720
            });
            cameraRef.current = camera;
            camera.start();
        }

        // Cleanup function
        return () => {
            // Only try to close if the holistic instance was fully loaded and assigned.
            // This prevents errors during React StrictMode's double-invocation.
            if (holisticRef.current && isLoaded) {
                // isLoaded check ensures we don't try to close a half-initialized model.
                holisticRef.current.close().catch(err => console.error("Error closing holistic:", err));
                holisticRef.current = null;
            }
            if (cameraRef.current) {
                cameraRef.current.stop(); // Stop the camera feed
                cameraRef.current = null;
            }
        };
    }, [videoRef, videoRef.current?.video]); // Rerun if the video element becomes available.

    return isLoaded;
};