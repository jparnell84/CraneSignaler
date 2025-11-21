import { 
    calculateAngle, 
    detectThumb, 
    detectIndexFinger, 
    calculateDistance, 
    isFingerCurled, 
    detectRepetitiveMotion 
} from './geometry';

export const SIGNAL_RULES = {
    // --- SAFETY SIGNALS ---

    'EMERGENCY STOP': (pose) => {
        if (!pose) return false;
        const rightArm = calculateAngle(pose[12], pose[14], pose[16]);
        const leftArm  = calculateAngle(pose[11], pose[13], pose[15]);
        return rightArm > 145 && leftArm > 145; 
    },

    'DOG EVERYTHING': (pose) => {
        if (!pose) return false;
        const dist = calculateDistance(pose[15], pose[16]);
        const handsLow = pose[15].y > pose[11].y; 
        return dist < 0.15 && handsLow;
    },

    // --- BOOM SIGNALS ---

    'MAIN HOIST': (pose) => {
        if (!pose) return false;
        const nose = pose[0];
        const rWrist = pose[16];
        const lWrist = pose[15];
        
        const rOnHead = rWrist.y < nose.y && calculateDistance(rWrist, nose) < 0.25;
        const lOnHead = lWrist.y < nose.y && calculateDistance(lWrist, nose) < 0.25;
        return rOnHead || lOnHead;
    },

    'AUX HOIST': (pose) => {
        if (!pose) return false;
        const rArmAngle = calculateAngle(pose[12], pose[14], pose[16]);
        const rBent = rArmAngle > 70 && rArmAngle < 110;
        const lTap = calculateDistance(pose[15], pose[14]) < 0.2;
        
        const lArmAngle = calculateAngle(pose[11], pose[13], pose[15]);
        const lBent = lArmAngle > 70 && lArmAngle < 110;
        const rTap = calculateDistance(pose[16], pose[13]) < 0.2;

        return (rBent && lTap) || (lBent && rTap);
    },

    'SWING BOOM': (pose) => {
        if (!pose) return false;
        const rArmStraight = calculateAngle(pose[12], pose[14], pose[16]) > 140;
        const lHandTouching = calculateDistance(pose[15], pose[14]) < 0.2;
        const lArmStraight = calculateAngle(pose[11], pose[13], pose[15]) > 140;
        const rHandTouching = calculateDistance(pose[16], pose[13]) < 0.2;
        return (rArmStraight && lHandTouching) || (lArmStraight && rHandTouching);
    },

    'RAISE BOOM': (pose, lHand, rHand) => {
        if (!pose) return false;
        const lThumb = detectThumb(lHand);
        const rThumb = detectThumb(rHand);
        const rArm = calculateAngle(pose[12], pose[14], pose[16]);
        const lArm = calculateAngle(pose[11], pose[13], pose[15]);
        const armOut = rArm > 130 || lArm > 130;
        return armOut && (lThumb === 'UP' || rThumb === 'UP');
    },

    'LOWER BOOM': (pose, lHand, rHand) => {
        if (!pose) return false;
        const lThumb = detectThumb(lHand);
        const rThumb = detectThumb(rHand);
        const rArm = calculateAngle(pose[12], pose[14], pose[16]);
        const lArm = calculateAngle(pose[11], pose[13], pose[15]);
        const armOut = rArm > 130 || lArm > 130;
        return armOut && (lThumb === 'DOWN' || rThumb === 'DOWN');
    },

    'EXTEND BOOM': (pose, lHand, rHand) => {
        if (!pose || !lHand || !rHand) return false;
        const wristDist = calculateDistance(lHand[0], rHand[0]);
        const thumbDist = calculateDistance(lHand[4], rHand[4]);
        const elbowsBent = calculateAngle(pose[11], pose[13], pose[15]) < 120;
        return elbowsBent && (thumbDist > wristDist * 1.5); 
    },

    'RETRACT BOOM': (pose, lHand, rHand) => {
        if (!pose || !lHand || !rHand) return false;
        const wristDist = calculateDistance(lHand[0], rHand[0]);
        const thumbDist = calculateDistance(lHand[4], rHand[4]);
        const elbowsBent = calculateAngle(pose[11], pose[13], pose[15]) < 120;
        return elbowsBent && (thumbDist < wristDist * 0.8);
    },

    // --- UPDATED HOIST SIGNALS (With Motion & Curl Logic) ---

    'HOIST LOAD': (pose, lHand, rHand, lHistory, rHistory) => {
        if (!pose) return false;

        const checkSide = (hand, history) => {
            if (!hand || !history) return false;
            
            // 1. Static Pose Check: 
            // Index UP, others curled
            const indexUp = detectIndexFinger(hand) === 'UP';
            // Check Middle(12), Ring(16) tips vs their PIPs(10, 14) to ensure they are curled
            const othersCurled = isFingerCurled(hand, 12, 10) && isFingerCurled(hand, 16, 14);
            
            if (!indexUp || !othersCurled) return false;

            // 2. Motion Check:
            // Is the finger moving in a circle or metronome arc?
            // We use detectRepetitiveMotion which matches the logic in geometry.js
            const isMoving = detectRepetitiveMotion(history);
            return isMoving;
        };

        return checkSide(rHand, rHistory) || checkSide(lHand, lHistory);
    },

    'LOWER LOAD': (pose, lHand, rHand, lHistory, rHistory) => {
        if (!pose) return false;

        const checkSide = (hand, history) => {
            if (!hand || !history) return false;

            // 1. Static Pose: Index DOWN, others curled
            const indexDown = detectIndexFinger(hand) === 'DOWN';
            const othersCurled = isFingerCurled(hand, 12, 10) && isFingerCurled(hand, 16, 14);
            
            if (!indexDown || !othersCurled) return false;

            // 2. Motion Check
            return detectRepetitiveMotion(history);
        };

        return checkSide(rHand, rHistory) || checkSide(lHand, lHistory);
    },
};