import { useEffect, useRef, useState } from 'react';

// Loads a script tag and returns a promise that resolves when loaded
const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.body.appendChild(s);
});

export const useMediaPipe = (videoRef, onResults) => {
    const cameraRef = useRef(null);
    const holisticRef = useRef(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function init() {
            try {
                await Promise.all([
                    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js'),
                    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
                    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
                ]);

                if (!mounted) return;

                const HolisticCtor = window.Holistic || window.holistic || null;
                const CameraCtor = window.Camera || null;

                if (!HolisticCtor || !CameraCtor) {
                    console.warn('MediaPipe constructors not found on window');
                    return;
                }

                const holistic = new HolisticCtor({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
                });

                holistic.setOptions({ modelComplexity: 1, smoothLandmarks: true });
                holistic.onResults(onResults);
                holisticRef.current = holistic;

                if (videoRef.current && !cameraRef.current) {
                    cameraRef.current = new CameraCtor(videoRef.current, {
                        onFrame: async () => {
                            if (videoRef.current) await holistic.send({ image: videoRef.current });
                        },
                        width: 1280,
                        height: 720
                    });
                    cameraRef.current.start();
                }

                setLoaded(true);
            } catch (e) {
                console.error('Failed to initialize MediaPipe:', e);
            }
        }

        init();

        return () => {
            mounted = false;
            try {
                if (cameraRef.current && cameraRef.current.stop) cameraRef.current.stop();
            } catch (e) {}
            try {
                if (holisticRef.current && holisticRef.current.close) holisticRef.current.close();
            } catch (e) {}
        };
    }, [videoRef, onResults]);

    return { loaded };
};

