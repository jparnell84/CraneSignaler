import { 
    calculateAngle, 
    detectThumb, 
    detectIndexFinger, 
    calculateDistance, 
    isFingerCurled, 
    detectRepetitiveMotion,
    detectHorizontalWave,
    detectThumbHorizontal,
} from './geometry';

export const SIGNAL_RULES = {
    
    // --- SAFETY SIGNALS ---

    'EMERGENCY STOP': (pose, lHand, rHand, lIdxHist, rIdxHist, lWristHist, rWristHist) => {
        if (!pose) return false;
        const rShoulder = pose[12]; const rElbow = pose[14];
        const lShoulder = pose[11]; const lElbow = pose[13];
        
        const upperArmsHorizontal = Math.abs(rShoulder.y - rElbow.y) < 0.15 && Math.abs(lShoulder.y - lElbow.y) < 0.15;
        
        if (!upperArmsHorizontal) return false;

        const rWaving = detectHorizontalWave(rWristHist);
        const lWaving = detectHorizontalWave(lWristHist);

        return rWaving || lWaving;
    },

    'DOG EVERYTHING': (pose) => {
        if (!pose) return false;
        // 1. Wrist Proximity: Hands must be touching
        const dist = calculateDistance(pose[15], pose[16]);
        
        // 2. Location: Hands below shoulders (Waist/Stomach level)
        const handsLow = pose[15].y > pose[11].y; 
        
        return dist < 0.10 && handsLow;
    },

    // --- HOIST SIGNALS ---

    'MAIN HOIST': (pose) => {
        if (!pose) return false;
        const nose = pose[0];
        const rWrist = pose[16];
        const lWrist = pose[15];
        const rOnHead = rWrist.y < nose.y && calculateDistance(rWrist, nose) < 0.25;
        const lOnHead = lWrist.y < nose.y && calculateDistance(lWrist, nose) < 0.25;
        return rOnHead || lOnHead;
    },

    'AUX HOIST': (pose, lHand, rHand) => {
        if (!pose) return false;
        
        const isVerticalForearm = (shoulder, elbow, wrist) => {
            const angle = calculateAngle(shoulder, elbow, wrist);
            if (angle < 20 || angle > 70) return false; 
            const isVertical = Math.abs(wrist.x - elbow.x) < 0.15; 
            const isAbove = wrist.y < elbow.y; 
            return isVertical && isAbove;
        };

        const threshold = 0.3;

        const rArmActive = isVerticalForearm(pose[12], pose[14], pose[16]);
        const lHandTouching = calculateDistance(pose[15], pose[14]) < threshold;
        
        const lArmActive = isVerticalForearm(pose[11], pose[13], pose[15]);
        const rHandTouching = calculateDistance(pose[16], pose[13]) < threshold;

        return (rArmActive && lHandTouching) || (lArmActive && rHandTouching);
    },

    'HOIST LOAD': (pose, lHand, rHand, lIndexHist, rIndexHist) => {
        if (!pose) return false;
        
        const checkSide = (hand, history, shoulder, elbow, wrist, otherWristIndex, activeElbowIndex) => {
            if (!hand || !history) return false;
            
            const isForearmVertical = Math.abs(wrist.x - elbow.x) < 0.25;
            const isAbove = wrist.y < elbow.y; 
            if (!isForearmVertical || !isAbove) return false;

            const indexUp = detectIndexFinger(hand) === 'UP';
            const indexStraight = !isFingerCurled(hand, 8, 6); 
            if (!indexUp || !indexStraight) return false;

            const otherWrist = pose[otherWristIndex];
            const activeElbow = pose[activeElbowIndex];
            if (calculateDistance(otherWrist, activeElbow) < 0.3) return false;

            return detectRepetitiveMotion(history);
        };

        const rActive = checkSide(rHand, rIndexHist, pose[12], pose[14], pose[16], 15, 14);
        const lActive = checkSide(lHand, lIndexHist, pose[11], pose[13], pose[15], 16, 13);

        return rActive || lActive;
    },

    'LOWER LOAD': (pose, lHand, rHand, lIndexHist, rIndexHist) => {
        if (!pose) return false;
        
        const checkSide = (hand, history, shoulder, elbow, wrist, otherWristIndex, activeElbowIndex) => {
            if (!hand || !history) return false;

            const isForearmVertical = Math.abs(wrist.x - elbow.x) < 0.25;
            const isBelow = wrist.y > elbow.y; 
            if (!isForearmVertical || !isBelow) return false;

            const indexDown = detectIndexFinger(hand) === 'DOWN';
            const indexStraight = !isFingerCurled(hand, 8, 6);
            if (!indexDown || !indexStraight) return false;

            const otherWrist = pose[otherWristIndex];
            const activeElbow = pose[activeElbowIndex];
            if (calculateDistance(otherWrist, activeElbow) < 0.3) return false;

            return detectRepetitiveMotion(history);
        };

        const rActive = checkSide(rHand, rIndexHist, pose[12], pose[14], pose[16], 15, 14);
        const lActive = checkSide(lHand, lIndexHist, pose[11], pose[13], pose[15], 16, 13);

        return rActive || lActive;
    },

    // --- BOOM SIGNALS ---
    'SWING BOOM': (pose, lHand, rHand) => {
        if (!pose) return false;
        
        const checkSide = (hand) => {
            if (!hand) return false;

            // 1. Hand Direction: RELAXED Horizontal Check
            const wrist = hand[0];
            const indexTip = hand[8];
            const dx = Math.abs(indexTip.x - wrist.x);
            const dy = Math.abs(indexTip.y - wrist.y);
            const isFlat = dx > (dy * 0.8);

            // 2. Index Finger: ROBUST Straight Check.
            const wristDist = (idx) => Math.sqrt(
                Math.pow(hand[idx].x - wrist.x, 2) + Math.pow(hand[idx].y - wrist.y, 2)
            );
            const indexStraight = wristDist(8) > wristDist(5);

            return isFlat && indexStraight;
        };

        const rActive = checkSide(rHand);
        const lActive = checkSide(lHand);

        return rActive || lActive;
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
        const isFist = (hand) => isFingerCurled(hand, 8, 6); 
        const lDir = detectThumbHorizontal(lHand, false); 
        const rDir = detectThumbHorizontal(rHand, true);
        const lFist = lHand ? isFist(lHand) : false;
        const rFist = rHand ? isFist(rHand) : false;
        return lDir === 'OUT' && rDir === 'OUT' && lFist && rFist;
    },

    'RETRACT BOOM': (pose, lHand, rHand) => {
        const isFist = (hand) => isFingerCurled(hand, 8, 6);
        const lDir = detectThumbHorizontal(lHand, false);
        const rDir = detectThumbHorizontal(rHand, true);
        const lFist = lHand ? isFist(lHand) : false;
        const rFist = rHand ? isFist(rHand) : false;
        return lDir === 'IN' && rDir === 'IN' && lFist && rFist;
    },
};