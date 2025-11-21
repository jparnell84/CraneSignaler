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
    const [error, setError] = useState(null);

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


                // Try to find constructors on `window`. If not present, attempt dynamic import fallbacks.
                let HolisticCtor = window.Holistic || window.holistic || null;
                let CameraCtor = window.Camera || null;

                if (!HolisticCtor || !CameraCtor) {
                    try {
                        // Try dynamic import of ESM modules from CDN as a fallback
                        const [holisticModule, cameraModule, drawingModule] = await Promise.all([
                            import('https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js'),
                            import('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
                            import('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
                        ]);

                        HolisticCtor = holisticModule.Holistic || holisticModule.default || HolisticCtor;
                        CameraCtor = cameraModule.Camera || cameraModule.default || CameraCtor;

                        // expose drawing utilities to window for existing draw calls
                        if (drawingModule) {
                            window.drawConnectors = drawingModule.drawConnectors || window.drawConnectors;
                            window.drawLandmarks = drawingModule.drawLandmarks || window.drawLandmarks;
                            window.POSE_CONNECTIONS = drawingModule.POSE_CONNECTIONS || window.POSE_CONNECTIONS;
                            window.HAND_CONNECTIONS = drawingModule.HAND_CONNECTIONS || window.HAND_CONNECTIONS;
                        }
                    } catch (e) {
                        console.warn('Dynamic import fallback for MediaPipe failed', e);
                    }
                }

                if (!HolisticCtor || !CameraCtor) {
                    console.warn('MediaPipe constructors not found on window after fallback');
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
                    try {
                        await cameraRef.current.start();
                        setError(null);
                        setLoaded(true);
                    } catch (e) {
                        // Common reason: camera already in use by another app/tab
                        console.error('Failed to start camera:', e);
                        setError(e && e.name ? `${e.name}: ${e.message || ''}` : String(e));
                        setLoaded(false);
                    }
                } else {
                    setLoaded(true);
                }
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

    return { loaded, error };
};

