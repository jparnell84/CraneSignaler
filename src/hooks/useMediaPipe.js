import { useEffect, useState, useRef } from 'react';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';

export const useMediaPipe = (videoRef, onResults) => {
    const [isLoaded, setIsLoaded] = useState(false);
    
    // 1. Create a ref to hold the latest callback
    const onResultsRef = useRef(onResults);

    // 2. Update the ref whenever the parent passes a new callback
    useEffect(() => {
        onResultsRef.current = onResults;
    }, [onResults]);

    useEffect(() => {
        if (!videoRef.current) return;

        const holistic = new Holistic({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
            }
        });

        holistic.setOptions({
            modelComplexity: 2,
            smoothLandmarks: true,
            enableSegmentation: false,
            refineFaceLandmarks: false,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        });

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
            camera.start();
        }
    }, []); // Dependency array stays empty to prevent reload loops

    return isLoaded;
};