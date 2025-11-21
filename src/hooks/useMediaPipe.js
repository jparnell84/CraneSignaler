import { useEffect, useRef, useState } from 'react';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';

export const useMediaPipe = (videoRef, onResults) => {
    const holisticRef = useRef(null);
    const cameraRef = useRef(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const setup = async () => {
            try {
                const holistic = new Holistic({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
                });

                holistic.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                });

                holistic.onResults(onResults);
                holisticRef.current = holistic;

                // videoRef.current may be a raw <video> element or a react-webcam wrapper
                const getVideoElement = () => {
                    if (!videoRef || !videoRef.current) return null;
                    // react-webcam exposes the underlying video as .video
                    if (videoRef.current.video) return videoRef.current.video;
                    return videoRef.current;
                };

                const videoEl = getVideoElement();
                if (!videoEl) {
                    throw new Error('No video element available for MediaPipe camera');
                }

                const camera = new Camera(videoEl, {
                    onFrame: async () => {
                        try {
                            await holistic.send({ image: videoEl });
                        } catch (sendErr) {
                            // ignore send errors while unmounting
                            if (mounted) console.warn('holistic.send error', sendErr);
                        }
                    },
                    width: 1280,
                    height: 720,
                });

                cameraRef.current = camera;
                // start may throw if device is in use or permission denied
                await camera.start();

                if (mounted) {
                    setLoaded(true);
                    setError(null);
                }
            } catch (err) {
                if (mounted) setError(err instanceof Error ? err : new Error(String(err)));
                console.error('useMediaPipe setup error:', err);
            }
        };

        setup();

        return () => {
            mounted = false;
            try {
                if (cameraRef.current && typeof cameraRef.current.stop === 'function') {
                    cameraRef.current.stop();
                }
            } catch (e) {
                // ignore
            }
            try {
                if (holisticRef.current && typeof holisticRef.current.close === 'function') {
                    holisticRef.current.close();
                }
            } catch (e) {
                // ignore
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { loaded, error };
};
