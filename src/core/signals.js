import { 
    calculateAngle, 
    detectThumb, 
    detectRepetitiveClench,
    getPalmDirection,
    isIndexPointing,
    detectIndexFinger, 
    calculateDistance, 
    detectHorizontalWave,
    detectThumbHorizontal,
    isHandHorizontal,
    isPalmOpen,
    areOtherFingersCurled,
    isArmHorizontal,
    isThumbNeutral,
    areHandsLevel
} from './geometry';

export const SIGNAL_RULES = {

    // --- PRIORITY 1: CRITICAL SAFETY & TWO-HANDED SIGNALS ---

    'DOG EVERYTHING': (pose, lHand, rHand) => {
        if (!pose || !lHand || !rHand) return false;
        // 1. Hands must be very close together (clasped).
        const dist = calculateDistance(pose[15], pose[16]);
        if (dist > 0.15) return false;

        // 2. Hands must be low (around waist/belly level).
        const handsLow = pose[15].y > pose[11].y; // Wrist Y > Shoulder Y
        if (!handsLow) return false;

        // 3. Hands must be open/flat, not fists. This is the key differentiator.
        return isPalmOpen(lHand) && isPalmOpen(rHand);
    },

    'TROLLEY TRAVEL': (pose, lHand, rHand) => {
        // Logic: One hand, clenched fist, thumb pointing OUT.
        const checkSide = (hand, isRight) => {
            if (!hand) return false;

            // 1. It must be a "pointing" gesture for SWING, so for TROLLEY, the index finger must NOT be pointing.
            // This is the key to differentiating from SWING BOOM.
            if (isIndexPointing(hand)) return false;

            // 2. Hand must be a fist (other fingers curled).
            if (!areOtherFingersCurled(hand)) return false;

            // 3. Thumb must be pointing OUT.
            const thumbDir = detectThumbHorizontal(hand, isRight);
            return thumbDir === 'OUT';
        };

        const rActive = checkSide(rHand, true);
        const lActive = checkSide(lHand, false);
        // Ensure only ONE hand is active for this signal.
        return (rActive && !lActive) || (!rActive && lActive);
    },

    'EXTEND BOOM': (pose, lHand, rHand) => {
         if (!lHand || !rHand) return false;
         // Logic: Two-handed, Thumbs OUT
         const lDir = detectThumbHorizontal(lHand, false); 
         const rDir = detectThumbHorizontal(rHand, true);
         const symmetric = areHandsLevel(lHand, rHand);

         return lDir === 'OUT' && rDir === 'OUT' && symmetric;
    },

    'RETRACT BOOM': (pose, lHand, rHand) => {
         if (!lHand || !rHand) return false;
         
         // Fix for Dog Everything conflict:
         const dist = calculateDistance(pose[15], pose[16]);
         if (dist < 0.20) return false;

         const lDir = detectThumbHorizontal(lHand, false);
         const rDir = detectThumbHorizontal(rHand, true);
         const symmetric = areHandsLevel(lHand, rHand);

         return lDir === 'IN' && rDir === 'IN' && symmetric;
    },

    'EMERGENCY STOP': (pose, lHand, rHand, { lWristHist, rWristHist }) => {
        if (!pose) return false;
        
        const rStatic = isArmHorizontal(pose[12], pose[14], pose[16]);
        const lStatic = isArmHorizontal(pose[11], pose[13], pose[15]);
        const rWaving = detectHorizontalWave(rWristHist);
        const lWaving = detectHorizontalWave(lWristHist);
        
        const rThumbNeutral = rHand ? isThumbNeutral(rHand) : true;
        const lThumbNeutral = lHand ? isThumbNeutral(lHand) : true;

        if ((rStatic && lStatic) && (!rThumbNeutral || !lThumbNeutral)) {
             return false; 
        }

        return (rStatic && lStatic) || (rWaving || lWaving);
    },

    // --- PRIORITY 2: ONE-HANDED SIGNALS ---

    'STOP': (pose, lHand, rHand) => {
        if (!pose) return false;
        const checkSide = (shoulder, elbow, wrist, hand) => {
            if (!isArmHorizontal(shoulder, elbow, wrist)) return false;
            if (!hand) return false;
            return isHandHorizontal(hand) && isPalmOpen(hand); 
        };
        return checkSide(pose[12], pose[14], pose[16], rHand) || 
               checkSide(pose[11], pose[13], pose[15], lHand);
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
        const proximity = 0.25;
        const isArmBent = (shoulder, elbow, wrist) => {
             const angle = calculateAngle(shoulder, elbow, wrist);
             return angle < 90; 
        };
        const rArmActive = isArmBent(pose[12], pose[14], pose[16]);
        const lHandTouching = calculateDistance(pose[15], pose[14]) < proximity;
        const lArmActive = isArmBent(pose[11], pose[13], pose[15]);
        const rHandTouching = calculateDistance(pose[16], pose[13]) < proximity;

        return (rArmActive && lHandTouching) || (lArmActive && rHandTouching);
    },

    'HOIST LOAD': (pose, lHand, rHand) => {
        if (!pose) return false;
        const checkSide = (hand, shoulder, elbow, wrist) => {
            if (!hand) return false;
            const isForearmVertical = Math.abs(wrist.x - elbow.x) < 0.2;
            const isAbove = wrist.y < elbow.y; 
            if (!isForearmVertical || !isAbove) return false;
            const indexUp = detectIndexFinger(hand) === 'UP'; // Specifically check for UP
            const othersCurled = areOtherFingersCurled(hand);
            return indexUp && othersCurled;
        };
        return checkSide(rHand, pose[12], pose[14], pose[16]) || 
               checkSide(lHand, pose[11], pose[13], pose[15]);
    },

    'LOWER LOAD': (pose, lHand, rHand) => {
        if (!pose) return false;
        const checkSide = (hand, shoulder, elbow, wrist) => {
            if (!hand) return false;
            const isBelow = wrist.y > elbow.y; 
            if (!isBelow) return false;
            const indexDown = detectIndexFinger(hand) === 'DOWN'; // Specifically check for DOWN
            const othersCurled = areOtherFingersCurled(hand);
            return indexDown && othersCurled;
        };
        return checkSide(rHand, pose[12], pose[14], pose[16]) || 
               checkSide(lHand, pose[11], pose[13], pose[15]);
    },

    // --- BOOM & TRAVEL SIGNALS ---

    'RAISE BOOM': (pose, lHand, rHand) => {
        if (!pose) return false;
        const checkSide = (hand, shoulder, elbow, wrist) => {
            if (!hand) return false;
            const armAngle = calculateAngle(shoulder, elbow, wrist);
            
            // Conflict Fix: Must be relatively STRAIGHT (> 120)
            if (armAngle < 50) return false; 
            
            return detectThumb(hand) === 'UP' && !isPalmOpen(hand);
        };
        return checkSide(rHand, pose[12], pose[14], pose[16]) || 
               checkSide(lHand, pose[11], pose[13], pose[15]);
    },

    'LOWER BOOM': (pose, lHand, rHand) => {
        if (!pose) return false;
        const checkSide = (hand, shoulder, elbow, wrist) => {
            if (!hand) return false;
            const armAngle = calculateAngle(shoulder, elbow, wrist);
            if (armAngle < 40) return false; 

            // This is the key to differentiating from SWING BOOM.
            // It must NOT be a pointing gesture.
            if (isIndexPointing(hand)) return false;

            return detectThumb(hand) === 'DOWN' && areOtherFingersCurled(hand);
        };
        return checkSide(rHand, pose[12], pose[14], pose[16]) || 
               checkSide(lHand, pose[11], pose[13], pose[15]);
    },

    'RAISE BOOM & LOWER LOAD': (pose, lHand, rHand, { lHandHist, rHandHist }) => {
        if (!pose) return false;
        const checkSide = (hand, handHist) => {
            if (!hand) return false;
            // 1. Base pose is "Thumb Up".
            if (detectThumb(hand) !== 'UP') return false;
            // 2. Must NOT be a pointing gesture (to avoid conflict with HOIST).
            if (isIndexPointing(hand)) return false;
            // 3. Must have repetitive clenching motion.
            return detectRepetitiveClench(handHist);
        };
        return checkSide(rHand, rHandHist) || checkSide(lHand, lHandHist);
    },

    'LOWER BOOM & HOIST LOAD': (pose, lHand, rHand, { lHandHist, rHandHist }) => {
        if (!pose) return false;
        const checkSide = (hand, handHist) => {
            if (!hand) return false;
            // 1. Base pose is "Thumb Down".
            if (detectThumb(hand) !== 'DOWN') return false;
            // 2. Must NOT be a pointing gesture (to avoid conflict with SWING).
            if (isIndexPointing(hand)) return false;
            // 3. Must have repetitive clenching motion.
            return detectRepetitiveClench(handHist);
        };
        return checkSide(rHand, rHandHist) || checkSide(lHand, lHandHist);
    },

    'SWING BOOM': (pose, lHand, rHand) => {
        if (!pose) return false;
        const checkSide = (hand) => {
            if (!hand) return false;

            // 1. Hand must be horizontal (index finger pointing left or right).
            if (!isHandHorizontal(hand)) return false;

            // 2. It must be a "pointing" gesture.
            const isPointing = isIndexPointing(hand);
            const othersCurled = areOtherFingersCurled(hand);

            return isPointing && othersCurled;
        };

        const rActive = checkSide(rHand);
        const lActive = checkSide(lHand);

        // Ensure only ONE hand is active for this signal.
        return (rActive && !lActive) || (!rActive && lActive);
    },

    'BRIDGE TRAVEL': (pose, lHand, rHand) => {
        if (!pose || !lHand || !rHand) return false;

        // 1. Both hands must be open (unclenched).
        if (!isPalmOpen(lHand) || !isPalmOpen(rHand)) return false;

        // 2. Both hands must be oriented vertically (fingers up).
        if (isHandHorizontal(lHand) || isHandHorizontal(rHand)) return false;

        // 3. Get palm directions for both hands.
        const lPalmDir = getPalmDirection(lHand);
        const rPalmDir = getPalmDirection(rHand);

        // 4. Both palms must be facing the same direction (either LEFT or RIGHT).
        const facingLeft = lPalmDir === 'LEFT' && rPalmDir === 'LEFT';
        const facingRight = lPalmDir === 'RIGHT' && rPalmDir === 'RIGHT';
        if (!facingLeft && !facingRight) return false;

        // 5. Hands must be apart (not clasped for 'DOG EVERYTHING').
        const wristDist = calculateDistance(pose[15], pose[16]);
        return wristDist > 0.2;
    }
};