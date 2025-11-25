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

// --- POSTURE HELPERS ---

// Checks if arm is roughly horizontal (Y-level) AND roughly straight (Angle)
// LENIENCY UPDATE: Angle threshold lowered to 125 to accommodate mobile cameras
export const isArmHorizontal = (shoulder, elbow, wrist) => {
    if (!shoulder || !elbow || !wrist) return false;

    // 1. Angle Check: Is it roughly straight?
    const angle = calculateAngle(shoulder, elbow, wrist);
    if (angle < 125) return false; 

    // 2. Level Check: Is wrist roughly at shoulder height?
    // Mobile Leniency: Increased Y tolerance to 0.25 (approx head height to chest height range)
    const yDiff = Math.abs(wrist.y - shoulder.y);
    if (yDiff > 0.25) return false;

    return true;
};

// --- HAND HELPERS ---
export const detectThumb = (handLandmarks) => {
    if (!handLandmarks) return "NONE";
    const thumbTip = handLandmarks[4];
    const indexMCP = handLandmarks[5]; 
    const wrist = handLandmarks[0];
    if (!thumbTip || !indexMCP || !wrist) return "NONE";

    const tipToKnuckle = indexMCP.y - thumbTip.y; 
    
    // ROBUSTNESS FIX: Use Euclidean distance (Hand Size) for threshold.
    // Old method used Y-distance, which got too small when hand was horizontal.
    const handSize = calculateDistance(wrist, indexMCP);
    const threshold = handSize * 0.4; // 40% of hand size required for "UP/DOWN"

    if (tipToKnuckle > threshold) return "UP";
    if (tipToKnuckle < -threshold) return "DOWN";
    return "NEUTRAL";
};

export const detectThumbHorizontal = (handLandmarks, isRightHand) => {
    if (!handLandmarks) return "NONE";
    const thumbTip = handLandmarks[4];
    const indexMCP = handLandmarks[5]; 
    const wrist = handLandmarks[0]; 
    if (!thumbTip || !indexMCP) return "NONE";

    const diff = thumbTip.x - indexMCP.x;
    const handSize = calculateDistance(wrist, indexMCP);
    
    // Threshold: 15% of hand size
    const threshold = handSize * 0.15; 

    if (isRightHand) {
        // RIGHT HAND (Appears on Left of Screen)
        if (diff < -threshold) return "OUT"; // Points Left (Image) -> Out
        if (diff > threshold) return "IN";   // Points Right (Image) -> In
    } else {
        // LEFT HAND (Appears on Right of Screen)
        if (diff > threshold) return "OUT";  // Points Right (Image) -> Out
        if (diff < -threshold) return "IN";  // Points Left (Image) -> In
    }
    return "NEUTRAL";
};

// HELPER: Combine Vertical and Horizontal into one status for Telemetry
// Priority: Vertical (Up/Down) > Horizontal (Out/In)
export const getThumbStatus = (hand, isRight) => {
    if (!hand) return "N/A";
    
    const vert = detectThumb(hand);
    if (vert !== "NEUTRAL") return vert; // Returns "UP" or "DOWN"
    
    return detectThumbHorizontal(hand, isRight); // Returns "OUT", "IN", or "NEUTRAL"
};

// Check if thumb is doing ANYTHING (Up, Down, In, Out)
// Useful for signals like Trolley where direction varies
export const isThumbActive = (handLandmarks) => {
    if (!handLandmarks) return false;
    return detectThumb(handLandmarks) !== "NEUTRAL" || 
           detectThumbHorizontal(handLandmarks, true) !== "NEUTRAL"; // Right/Left doesn't matter for pure activity check
};

// Check if thumb is Neutral (Safe)
export const isThumbNeutral = (handLandmarks) => {
    return detectThumb(handLandmarks) === "NEUTRAL";
};

// ... (Keep areHandsLevel, detectIndexFinger, isFingerCurled, etc.) ...
export const areHandsLevel = (lHand, rHand) => {
    if (!lHand || !rHand) return false;
    return Math.abs(lHand[0].y - rHand[0].y) < 0.2;
};

export const detectIndexFinger = (handLandmarks) => {
    if (!handLandmarks) return "NONE";
    const tip = handLandmarks[8];
    const pip = handLandmarks[6];
    const wrist = handLandmarks[0];
    if (!tip || !pip || !wrist) return "NONE";

    const distTip = calculateDistance(tip, wrist);
    const distPip = calculateDistance(pip, wrist);
    const isStraight = distTip > distPip * 1.1;

    if (!isStraight) return "NEUTRAL";

    // SENSITIVITY FIX: Check that vertical travel is dominant over horizontal
    const dy = tip.y - pip.y;
    const dx = Math.abs(tip.x - pip.x);

    if (dy < -dx) return "UP"; // Must be pointing up more than sideways
    if (dy > dx) return "DOWN"; // Must be pointing down more than sideways
    return "NEUTRAL"; // Otherwise, it's considered horizontal/NEUTRAL
};

// NEW HELPER: More robust check for just "is the index finger straight?"
// This is better for signals like SWING where direction doesn't matter, only the "pointing" gesture.
export const isIndexPointing = (handLandmarks) => {
    if (!handLandmarks) return false;
    const tip = handLandmarks[8];
    const pip = handLandmarks[6];
    const wrist = handLandmarks[0];
    if (!tip || !pip || !wrist) return false;
    return calculateDistance(tip, wrist) > calculateDistance(pip, wrist) * 1.1;
};

export const isFingerCurled = (landmarks, tipIdx, pipIdx) => {
    if (!landmarks) return false;
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    return calculateDistance(tip, wrist) < calculateDistance(pip, wrist);
};

export const areOtherFingersCurled = (hand) => {
    if (!hand) return false;
    return isFingerCurled(hand, 12, 10) && 
           isFingerCurled(hand, 16, 14) && 
           isFingerCurled(hand, 20, 18);
};

export const isPalmOpen = (hand) => {
    if (!hand) return false;
    const wrist = hand[0];
    const isExtended = (tipIdx, pipIdx) => {
        const tip = hand[tipIdx];
        const pip = hand[pipIdx];
        return calculateDistance(tip, wrist) > calculateDistance(pip, wrist) * 1.05; 
    };
    return isExtended(8,6) && isExtended(12,10) && isExtended(16,14) && isExtended(20,18);
};

export const isHandHorizontal = (hand) => {
    if (!hand) return false;
    const wrist = hand[0];
    const indexTip = hand[8]; 
    const dx = Math.abs(indexTip.x - wrist.x);
    const dy = Math.abs(indexTip.y - wrist.y);
    return dx > (dy * 0.8); 
};

// NEW HELPER: Detects if the palm is facing left or right from the camera's perspective.
export const getPalmDirection = (hand) => {
    if (!hand) return 'NONE';
    const indexMCP = hand[5];  // Index finger knuckle
    const pinkyMCP = hand[17]; // Pinky finger knuckle
    if (!indexMCP || !pinkyMCP) return 'NONE';

    // Check if the hand is seen from the side by comparing the horizontal vs vertical distance between knuckles.
    const dx = indexMCP.x - pinkyMCP.x;
    const dy = Math.abs(indexMCP.y - pinkyMCP.y);

    // If knuckles are mostly stacked vertically, palm is likely facing the camera or away from it.
    if (Math.abs(dx) < dy) return 'FRONT_OR_BACK';

    if (dx > 0) {
        return 'LEFT'; // Index knuckle is to the right of pinky knuckle -> palm faces left.
    } else {
        return 'RIGHT'; // Index knuckle is to the left of pinky knuckle -> palm faces right.
    }
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

// NEW: Detects repetitive opening and closing of the hand (clench/unclench).
// This is for signals like "Raise Boom & Lower Load".
export const detectRepetitiveClench = (handHistory) => {
    // Need at least ~1 second of data (at ~15fps) to detect a cycle.
    if (!handHistory || handHistory.length < 15) return false;

    // We'll check the state (open/closed) at different points in the history.
    const historyLength = handHistory.length;
    const recentHand = handHistory[historyLength - 1]; // Most recent frame
    const midHand = handHistory[Math.floor(historyLength / 2)]; // Frame from the middle of the history
    const oldestHand = handHistory[0]; // Oldest frame in the history

    if (!recentHand || !midHand || !oldestHand) return false;

    // Check the open/closed state for each point in time.
    // A fist is defined as all non-thumb fingers being curled.
    const isRecentFist = areOtherFingersCurled(recentHand) && isFingerCurled(recentHand, 8, 6);
    const isMidFist = areOtherFingersCurled(midHand) && isFingerCurled(midHand, 8, 6);
    const isOldestFist = areOtherFingersCurled(oldestHand) && isFingerCurled(oldestHand, 8, 6);

    // A valid clench cycle is when the state changes, e.g., Open -> Closed -> Open.
    // We check for two state changes in the history (e.g., oldest != mid and mid != recent).
    // This indicates an oscillation between states.
    const stateChangedOnce = isOldestFist !== isMidFist;
    const stateChangedTwice = isMidFist !== isRecentFist;

    // To qualify as a repetitive motion, there must be at least two changes in state.
    return stateChangedOnce && stateChangedTwice;
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

// --- TELEMETRY ---  
    // Updated to show Hand Open status for debugging Bridge Travel

const getIndexStraightness = (hand) => {
    if (!hand) return 0;
    const tip = hand[8];
    const pip = hand[6];
    const wrist = hand[0];
    if (!tip || !pip || !wrist) return 0;
    const distTip = calculateDistance(tip, wrist);
    const distPip = calculateDistance(pip, wrist);
    if (distPip === 0) return 0;
    return distTip / distPip;
};

const getHandFlatnessRatio = (hand) => {
    if (!hand) return 0;
    const wrist = hand[0];
    const indexMCP = hand[5];
    const pinkyMCP = hand[17];
    if (!wrist || !indexMCP || !pinkyMCP) return 0;
    const width = calculateDistance(indexMCP, pinkyMCP);
    const height = Math.abs(wrist.y - indexMCP.y);
    if (height === 0) return 0;
    return width / height;
};

export const getDebugStats = (pose, lHand, rHand, histories = {}, spokenText = '') => {
    if (!pose) return null;
    const getLevel = (wrist, shoulder) => (wrist.y - shoulder.y).toFixed(2);

    const lShoulder = pose[11]; const lElbow = pose[13]; const lWrist = pose[15];
    const rShoulder = pose[12]; const rElbow = pose[14]; const rWrist = pose[16];

    // For MAIN HOIST signal
    const nose = pose[0];

    const { lWristHist, rWristHist, lHandHist, rHandHist } = histories;

    const toBoolStr = (val) => val ? "TRUE" : "FALSE";
    const lClench = toBoolStr(detectRepetitiveClench(lHandHist));
    const rClench = toBoolStr(detectRepetitiveClench(rHandHist));
    const wave = toBoolStr(detectHorizontalWave(lWristHist) || detectHorizontalWave(rWristHist));

    return {
        // ARMS
        lArmAngle: calculateAngle(lShoulder, lElbow, lWrist).toFixed(0),
        rArmAngle: calculateAngle(rShoulder, rElbow, rWrist).toFixed(0),
        lWristLevel: getLevel(lWrist, lShoulder),
        rWristLevel: getLevel(rWrist, rShoulder),

        // POSE
        wristDistance: calculateDistance(lWrist, rWrist).toFixed(2),
        lHandToHead: calculateDistance(lWrist, nose).toFixed(2),
        rHandToHead: calculateDistance(rWrist, nose).toFixed(2),

        // HANDS - Detailed Ratios
        lIndexRatio: getIndexStraightness(lHand).toFixed(2),
        rIndexRatio: getIndexStraightness(rHand).toFixed(2),
        lFlatRatio: getHandFlatnessRatio(lHand).toFixed(2),
        rFlatRatio: getHandFlatnessRatio(rHand).toFixed(2),

        // THUMBS - Raw X/Y position relative to index knuckle
        lThumbX: lHand ? (lHand[4].x - lHand[5].x).toFixed(2) : "0.00",
        lThumbY: lHand ? (lHand[5].y - lHand[4].y).toFixed(2) : "0.00", // indexMCP.y - thumbTip.y
        rThumbX: rHand ? (rHand[4].x - rHand[5].x).toFixed(2) : "0.00",
        rThumbY: rHand ? (rHand[5].y - rHand[4].y).toFixed(2) : "0.00",

        // MOTION
        lClenchStatus: lClench,
        rClenchStatus: rClench,
        waveStatus: wave,

        // VOICE
        spokenText: spokenText || '...',
    };
};