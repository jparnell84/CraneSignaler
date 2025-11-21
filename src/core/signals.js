import { calculateAngle, detectThumb } from './geometry';

// Helper Math
const calculateAngle = (a, b, c) => {
    if(!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
};

const detectThumb = (handLandmarks) => {
    if (!handLandmarks) return "NONE";
    const thumbTip = handLandmarks[4];
    const indexMCP = handLandmarks[5];
    const wrist = handLandmarks[0];
    const tipToKnuckle = indexMCP.y - thumbTip.y; 
    const threshold = Math.abs(wrist.y - indexMCP.y) * 0.5; 

    if (tipToKnuckle > threshold) return "UP";
    if (tipToKnuckle < -threshold) return "DOWN";
    return "NEUTRAL";
};

// The Rules Object
export const SIGNAL_RULES = {
    'EMERGENCY_STOP': (pose) => {
        // Rule: Both arms extended (>145deg)
        const rightArm = calculateAngle(pose[12], pose[14], pose[16]);
        const leftArm  = calculateAngle(pose[11], pose[13], pose[15]);
        return rightArm > 145 && leftArm > 145; 
    },
    'RAISE_BOOM': (pose, leftHand, rightHand) => {
        // Rule: One arm extended + Thumb Up
        // We check both hands just in case
        const leftThumb = detectThumb(leftHand);
        const rightThumb = detectThumb(rightHand);
        
        const rightArm = calculateAngle(pose[12], pose[14], pose[16]);
        const leftArm  = calculateAngle(pose[11], pose[13], pose[15]);
        const armExtended = rightArm > 145 || leftArm > 145;

        return armExtended && (leftThumb === 'UP' || rightThumb === 'UP');
    },
    'LOWER_BOOM': (pose, leftHand, rightHand) => {
        // Rule: One arm extended + Thumb Down
        const leftThumb = detectThumb(leftHand);
        const rightThumb = detectThumb(rightHand);
        
        const rightArm = calculateAngle(pose[12], pose[14], pose[16]);
        const leftArm  = calculateAngle(pose[11], pose[13], pose[15]);
        const armExtended = rightArm > 145 || leftArm > 145;

        return armExtended && (leftThumb === 'DOWN' || rightThumb === 'DOWN');
    }
};

