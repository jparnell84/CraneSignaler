// src/core/geometry.js

// --- BASIC HELPERS ---
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

// --- HAND DETECTORS ---

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

// Updated logic for Extend/Retract Boom
export const detectThumbHorizontal = (handLandmarks, isRightHand) => {
    if (!handLandmarks) return "NONE";
    const thumbTip = handLandmarks[4];
    const indexMCP = handLandmarks[5]; 
    const wrist = handLandmarks[0]; 
    if (!thumbTip || !indexMCP) return "NONE";

    const diff = thumbTip.x - indexMCP.x;
    const handSize = calculateDistance(wrist, indexMCP);
    const threshold = handSize * 0.2;

    if (isRightHand) {
        if (diff < -threshold) return "OUT";
        if (diff > threshold) return "IN";
    } else {
        if (diff > threshold) return "OUT";
        if (diff < -threshold) return "IN";
    }
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

// NEW: Checks if Index, Middle, Ring, Pinky are all extended (straight)
export const areFingersExtended = (hand) => {
    if (!hand) return false;
    const wrist = hand[0];
    
    // Check Index(8), Middle(12), Ring(16), Pinky(20)
    // If Tip is further from wrist than PIP, it is extended
    const checkFinger = (tipIdx, pipIdx) => {
        const tip = hand[tipIdx];
        const pip = hand[pipIdx];
        return calculateDistance(tip, wrist) > calculateDistance(pip, wrist);
    };

    return checkFinger(8,6) && checkFinger(12,10) && checkFinger(16,14) && checkFinger(20,18);
};

// NEW: Checks if the hand is oriented horizontally (flat)
// Returns true if the vector from Wrist to Index Tip is mostly horizontal
export const isHandHorizontal = (hand) => {
    if (!hand) return false;
    const wrist = hand[0];
    const indexTip = hand[8]; // Using Index Tip as the direction vector

    const dx = Math.abs(indexTip.x - wrist.x);
    const dy = Math.abs(indexTip.y - wrist.y);

    // If width (dx) is significantly larger than height (dy), it's horizontal
    return dx > dy * 1.2;
};

// --- MOTION DETECTORS ---

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
    const significantMove = width > 0.15;
    const isHorizontal = width > (height * 1.5);
    const isOscillating = totalPath > width * 1.2;

    return significantMove && isHorizontal && isOscillating;
};

export const getDebugStats = (pose, lHand, rHand) => {
    if (!pose) return {};

    const stats = {
        wristDist: calculateDistance(pose[15], pose[16]).toFixed(3),
        handsLow: (pose[15].y > pose[11].y).toString(),
        
        lArmAngle: calculateAngle(pose[11], pose[13], pose[15]).toFixed(0),
        rArmAngle: calculateAngle(pose[12], pose[14], pose[16]).toFixed(0),
        
        lHandBlade: lHand ? areFingersExtended(lHand).toString() : "No Hand",
        rHandBlade: rHand ? areFingersExtended(rHand).toString() : "No Hand",
        
        lHandFlat: lHand ? isHandHorizontal(lHand).toString() : "No Hand",
        rHandFlat: rHand ? isHandHorizontal(rHand).toString() : "No Hand",

        lThumbHoriz: lHand ? detectThumbHorizontal(lHand, false) : "None",
        rThumbHoriz: rHand ? detectThumbHorizontal(rHand, true) : "None"
    };
    return stats;
};