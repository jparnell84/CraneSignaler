import { useEffect, useRef } from 'react';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';

export const useMediaPipe = (videoRef, onResults) => {
    useEffect(() => {
        const holistic = new Holistic({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
        });
        
        holistic.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
        });
        
        holistic.onResults(onResults);

        if (videoRef.current && videoRef.current.video) {
            const camera = new Camera(videoRef.current.video, {
                onFrame: async () => {
                    await holistic.send({image: videoRef.current.video});
                },
                width: 1280,
                height: 720
            });
            camera.start();
        }
    }, []);
};

