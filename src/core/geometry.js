// Calculates the angle (in degrees) between three points: A, B, and C.
// B is the vertex (the joint, like the elbow).
export const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    // Ensure angle is always < 180 for easier logic (inner angle)
    if (angle > 180.0) angle = 360 - angle;
    
    return angle;
};

// Calculates 2D Euclidean distance between two points
export const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return 1.0; // Return high distance if missing
    return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
    );
};

// Detects if the thumb is pointing UP or DOWN relative to the hand
export const detectThumb = (handLandmarks) => {
    if (!handLandmarks) return "NONE";

    const thumbTip = handLandmarks[4];
    const indexMCP = handLandmarks[5]; // Index Finger Knuckle
    const wrist = handLandmarks[0];

    if (!thumbTip || !indexMCP || !wrist) return "NONE";

    // Compare Y coordinates (Y increases downwards)
    const tipToKnuckle = indexMCP.y - thumbTip.y; 
    
    // Dynamic threshold based on hand size (distance from wrist to knuckle)
    const handSize = Math.abs(wrist.y - indexMCP.y);
    const threshold = handSize * 0.5; 

    if (tipToKnuckle > threshold) return "UP";
    if (tipToKnuckle < -threshold) return "DOWN";
    
    return "NEUTRAL";
};

// Detects if the Index Finger is pointing UP or DOWN
export const detectIndexFinger = (handLandmarks) => {
    if (!handLandmarks) return "NONE";
    
    const tip = handLandmarks[8];  // Index Tip
    const pip = handLandmarks[6];  // Index PIP (Middle joint)
    const wrist = handLandmarks[0];

    if (!tip || !pip) return "NONE";

    // Dynamic threshold
    const threshold = Math.abs(wrist.y - pip.y) * 0.2;

    if (tip.y < pip.y - threshold) return "UP";
    if (tip.y > pip.y + threshold) return "DOWN";

    return "NEUTRAL";
};

// Checks if a finger is curled. 
// Returns true if the Tip is closer to the Wrist than the PIP joint is.
export const isFingerCurled = (landmarks, tipIdx, pipIdx) => {
    if (!landmarks) return false;
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    
    const distTipToWrist = calculateDistance(tip, wrist);
    const distPipToWrist = calculateDistance(pip, wrist);
    
    return distTipToWrist < distPipToWrist;
};

/**
 * Detects "Repetitive Motion" (Circles, Arcs, Metronomes, Waving).
 * * THE LOGIC:
 * We calculate the "Path Efficiency" (Tortuosity).
 * 1. Calculate the bounding box of the movement history.
 * 2. Calculate the total distance traveled by the finger.
 * 3. If the finger traveled a LONG distance, but stayed inside a SMALL box,
 * it must be moving back and forth or in a circle.
 */
export const detectRepetitiveMotion = (history) => {
    // Need at least 10 frames (~0.3 seconds) to judge motion
    if (history.length < 10) return false;

    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    let totalPathLength = 0;

    for (let i = 0; i < history.length; i++) {
        const p = history[i];
        
        // 1. Update Bounding Box
        if(p.x < minX) minX = p.x;
        if(p.x > maxX) maxX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.y > maxY) maxY = p.y;

        // 2. Sum Path Length
        if (i > 0) {
            const prev = history[i-1];
            totalPathLength += Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2));
        }
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    
    // Diagonal of the box (The "Net Displacement" if you moved from corner to corner)
    const boxDiagonal = Math.sqrt(Math.pow(boxWidth, 2) + Math.pow(boxHeight, 2));

    // FILTER 1: Is there enough movement?
    // If the box is too small, it's just jitter/noise.
    // 0.02 is roughly 2% of the screen.
    if (boxDiagonal < 0.02) return false;

    // FILTER 2: Path Ratio
    // If you move in a straight line, Ratio ≈ 1.0
    // If you move in a metronome arc (Left -> Right -> Left), Ratio ≈ 2.0
    // If you move in a circle, Ratio ≈ 3.0 (Pi)
    // We set threshold at 1.2 to catch sloppy arcs.
    const ratio = totalPathLength / boxDiagonal;

    return ratio > 1.2; 
};