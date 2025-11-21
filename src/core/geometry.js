// src/core/geometry.js

// --- EXISTING HELPERS ---
export const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
};

export const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return 1.0; 
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
};

export const detectThumb = (handLandmarks) => {
    if (!handLandmarks) return "NONE";
    const thumbTip = handLandmarks[4];
    const indexMCP = handLandmarks[5]; 
    const wrist = handLandmarks[0];
    if (!thumbTip || !indexMCP || !wrist) return "NONE";

    const tipToKnuckle = indexMCP.y - thumbTip.y; 
    const threshold = Math.abs(wrist.y - indexMCP.y) * 0.5; 

    if (tipToKnuckle > threshold) return "UP";
    if (tipToKnuckle < -threshold) return "DOWN";
    return "NEUTRAL";
};

export const detectIndexFinger = (handLandmarks) => {
    if (!handLandmarks) return "NONE";
    const tip = handLandmarks[8];
    const pip = handLandmarks[6];
    const wrist = handLandmarks[0];
    if (!tip || !pip) return "NONE";

    const threshold = Math.abs(wrist.y - pip.y) * 0.2;
    if (tip.y < pip.y - threshold) return "UP";
    if (tip.y > pip.y + threshold) return "DOWN";
    return "NEUTRAL";
};

export const isFingerCurled = (landmarks, tipIdx, pipIdx) => {
    if (!landmarks) return false;
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    const distTipToWrist = calculateDistance(tip, wrist);
    const distPipToWrist = calculateDistance(pip, wrist);
    return distTipToWrist < distPipToWrist;
};

export const detectRepetitiveMotion = (history) => {
    if (history.length < 10) return false;

    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    let totalPathLength = 0;

    for (let i = 0; i < history.length; i++) {
        const p = history[i];
        if(p.x < minX) minX = p.x;
        if(p.x > maxX) maxX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.y > maxY) maxY = p.y;
        if (i > 0) {
            const prev = history[i-1];
            totalPathLength += Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2));
        }
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const boxDiagonal = Math.sqrt(Math.pow(boxWidth, 2) + Math.pow(boxHeight, 2));

    if (boxDiagonal < 0.02) return false;
    const ratio = totalPathLength / boxDiagonal;
    return ratio > 1.2; 
};

// --- NEW: Horizontal Wave Detector (For Emergency Stop) ---
export const detectHorizontalWave = (history) => {
    if (history.length < 5) return false;

    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    let totalPath = 0;

    for (let i = 0; i < history.length; i++) {
        const p = history[i];
        if(p.x < minX) minX = p.x;
        if(p.x > maxX) maxX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.y > maxY) maxY = p.y;
        if (i > 0) {
            const prev = history[i-1];
            totalPath += Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2));
        }
    }

    const width = maxX - minX;
    const height = maxY - minY;

    // 1. Movement must be significant horizontally (> 15% of screen)
    const significantMove = width > 0.15;

    // 2. Movement must be primarily horizontal (Width >> Height)
    // We allow some vertical movement (arcing), but width should be dominant.
    const isHorizontal = width > (height * 1.5);

    // 3. Oscillation check: Total path should be much longer than net displacement
    // If you move Left -> Right -> Left, your path is 2x your width.
    const isOscillating = totalPath > width * 1.2;

    return significantMove && isHorizontal && isOscillating;
};