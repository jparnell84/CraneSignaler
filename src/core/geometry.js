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

// Detects if the thumb is pointing UP, DOWN, or NEUTRAL relative to the hand.
// Uses the distance between the Thumb Tip and the Index Knuckle (MCP).
export const detectThumb = (handLandmarks) => {
    if (!handLandmarks) return "NONE";

    const thumbTip = handLandmarks[4];
    const indexMCP = handLandmarks[5]; // Index Finger Knuckle
    const wrist = handLandmarks[0];

    // Safety check to prevent crashes if MediaPipe loses track momentarily
    if (!thumbTip || !indexMCP || !wrist) return "NONE";

    // Calculate vertical distance (Y-axis)
    // Note: In computer vision, Y increases as you go DOWN the screen.
    // So, if Tip Y < Knuckle Y, the Tip is visually HIGHER.
    const tipToKnuckle = indexMCP.y - thumbTip.y; 
    
    // Dynamic threshold: 50% of the distance between Wrist and Knuckle.
    // This ensures it works whether the user is close to or far from the camera.
    const threshold = Math.abs(wrist.y - indexMCP.y) * 0.5; 

    if (tipToKnuckle > threshold) {
        return "UP";
    } else if (tipToKnuckle < -threshold) {
        return "DOWN";
    }
    
    return "NEUTRAL";
};

// Calculates Euclidean distance between two points (useful for "Dog Everything" signal)
export const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return 1.0; // Return high distance if missing
    return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
    );
};
