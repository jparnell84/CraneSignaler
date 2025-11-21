import { useEffect, useState } from 'react';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';

export const useMediaPipe = (videoRef, onResults) => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!videoRef.current) return;

        const holistic = new Holistic({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
            }
        });

        holistic.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            refineFaceLandmarks: false,
        });

        holistic.onResults((results) => {
            setIsLoaded(true);
            onResults(results);
        });

        // Initialize Camera
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
        
        // Cleanup not strictly necessary for singleton camera, 
        // but good practice if component unmounts
    }, []); // Run once on mount

    return isLoaded;
};