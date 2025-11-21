import { calculateAngle, detectThumb, calculateDistance, angleToVertical } from './geometry';

// Helper: detect if the index finger is pointing up in the camera view for a given hand
const isIndexPointingUp = (hand) => {
    if (!hand || !hand[8] || !hand[6] || !hand[5] || !hand[0]) return false;
    const tip = hand[8]; // index fingertip
    const pip = hand[6]; // index PIP
    const mcp = hand[5]; // index MCP
    const wrist = hand[0];

    // Finger is 'up' if tip is above (smaller y) than pip and mcp, and reasonably away from wrist
    const verticallyUp = tip.y < pip.y && tip.y < mcp.y;
    const away = calculateDistance(tip, wrist) > 0.05; // normalized distance threshold
    return verticallyUp && away;
};

// Helper: check if the arm (shoulder-elbow-wrist) is roughly extended
const isArmExtended = (pose, shoulderIdx, elbowIdx, wristIdx, threshold = 140) => {
    if (!pose || !pose[shoulderIdx] || !pose[elbowIdx] || !pose[wristIdx]) return false;
    const angle = calculateAngle(pose[shoulderIdx], pose[elbowIdx], pose[wristIdx]);
    return angle > threshold;
};

// Helper: detect a closed fist (approx) by measuring fingertip distance to wrist.
// Returns true if fingertips are relatively close to the wrist (fingers curled).
const isHandFist = (hand) => {
    if (!hand || !hand[0]) return false;
    const wrist = hand[0];
    const tips = [8, 12, 16, 20];
    let sum = 0;
    let count = 0;
    for (const t of tips) {
        if (!hand[t]) continue;
        sum += calculateDistance(hand[t], wrist);
        count += 1;
    }
    if (count === 0) return false;
    const avg = sum / count;
    // threshold: if average tip->wrist distance is small, treat as fist
    return avg < 0.08;
};

// Helper: is the upper arm roughly horizontal (i.e., pointing sideways from torso)?
const isArmHorizontal = (pose, shoulderIdx, elbowIdx, toleranceDeg = 20) => {
    if (!pose || !pose[shoulderIdx] || !pose[elbowIdx]) return false;
    const deg = angleToVertical(pose[shoulderIdx], pose[elbowIdx]);
    // horizontal if angleToVertical is approximately 90 degrees
    return Math.abs(deg - 90) <= toleranceDeg;
};

export const SIGNAL_RULES = {
    'EMERGENCY_STOP': (pose) => {
        if (!pose) return false;

        // Require that key shoulder/elbow/wrist landmarks are present
        const required = [11,12,13,14,15,16];
        const hasLandmarks = required.every(i => !!pose[i]);
        if (!hasLandmarks) return false;

        // If MediaPipe provides visibility, require moderate confidence
        const visibilityOk = required.every(i => typeof pose[i].visibility === 'undefined' ? true : pose[i].visibility > 0.45);
        if (!visibilityOk) return false;

        // Ensure arms are large enough in the frame (avoid tiny/no-person false positives)
        const rightArmLen = calculateDistance(pose[12], pose[16]);
        const leftArmLen = calculateDistance(pose[11], pose[15]);
        const minArmLen = 0.12; // normalized distance threshold (empirical)
        if (rightArmLen < minArmLen || leftArmLen < minArmLen) return false;

        // Rule: Both arms extended (>145deg)
        const rightArm = calculateAngle(pose[12], pose[14], pose[16]);
        const leftArm  = calculateAngle(pose[11], pose[13], pose[15]);
        return rightArm > 145 && leftArm > 145; 
    },
    'RAISE_BOOM': (pose, leftHand, rightHand) => {
        // Rule: One arm extended + Thumb Up
        const leftThumb = detectThumb(leftHand);
        const rightThumb = detectThumb(rightHand);

        const rightArm = calculateAngle(pose[12], pose[14], pose[16]);
        const leftArm  = calculateAngle(pose[11], pose[13], pose[15]);
        const armExtended = rightArm > 145 || leftArm > 145;

        return armExtended && (leftThumb === 'UP' || rightThumb === 'UP');
    },
    'LOWER_BOOM': (pose, leftHand, rightHand) => {
        // Rule: prefer hand pose (fist + thumb UP) regardless of exact arm angle; fall back to arm-extended + thumb down
        const leftThumb = detectThumb(leftHand);
        const rightThumb = detectThumb(rightHand);

        // If left hand is a fist and thumb is UP -> treat as LOWER_BOOM (left side)
        if (leftHand && isHandFist(leftHand) && leftThumb === 'UP') return true;
        if (rightHand && isHandFist(rightHand) && rightThumb === 'UP') return true;

        // Fallback: one arm extended horizontally + thumb down (older style)
        const rightArmExt = isArmExtended(pose, 12, 14, 16, 135) && isArmHorizontal(pose, 12, 14);
        const leftArmExt = isArmExtended(pose, 11, 13, 15, 135) && isArmHorizontal(pose, 11, 13);
        return (rightArmExt && rightThumb === 'DOWN') || (leftArmExt && leftThumb === 'DOWN');
    }
    ,
    // HOIST: index finger pointing up and arm extended. Note: this is a per-frame matcher.
    // Higher-level code should require this rule to be true continuously for a duration
    // (see SIGNAL_CONTEXTS) to confirm the "hoist" action which includes an arm-circling
    // motion over several seconds.
    'HOIST': (pose, leftHand, rightHand) => {
        if (!pose) return false;

        const rightIndexUp = isIndexPointingUp(rightHand);
        const leftIndexUp = isIndexPointingUp(leftHand);

        const rightArmExt = isArmExtended(pose, 12, 14, 16, 135);
        const leftArmExt = isArmExtended(pose, 11, 13, 15, 135);

        return (rightIndexUp && rightArmExt) || (leftIndexUp && leftArmExt);
    },
    // POINT_UP: simpler signal - single-frame detection of index finger pointing up
    'POINT_UP': (pose, leftHand, rightHand) => {
        return isIndexPointingUp(leftHand) || isIndexPointingUp(rightHand);
    },
    // THUMB_UP / THUMB_DOWN convenience predicates
    'THUMB_UP': (pose, leftHand, rightHand) => {
        const l = detectThumb(leftHand);
        const r = detectThumb(rightHand);
        return l === 'UP' || r === 'UP';
    },
    'THUMB_DOWN': (pose, leftHand, rightHand) => {
        const l = detectThumb(leftHand);
        const r = detectThumb(rightHand);
        return l === 'DOWN' || r === 'DOWN';
    }
};

// Signals that require temporal/contextual confirmation. The matcher above returns
// true on a per-frame basis; for signals that are actions over time (e.g., HOIST)
// the app should verify the rule remains true for the `durationSec` window.
export const SIGNAL_CONTEXTS = {
    'HOIST': { durationSec: 6, note: 'Sustained index-up + arm-circling motion (5-8s recommended)' },
};

