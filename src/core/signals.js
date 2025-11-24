import { 
    calculateAngle, 
    detectThumb, 
    detectIndexFinger, 
    calculateDistance, 
    detectHorizontalWave,
    detectThumbHorizontal,
    isHandHorizontal,
    isPalmOpen,
    areOtherFingersCurled,
    isArmHorizontal,
    isThumbNeutral
} from './geometry';

export const SIGNAL_RULES = {
    
    // --- SAFETY SIGNALS ---

    'EMERGENCY STOP': (pose, lHand, rHand, lIdxHist, rIdxHist, lWristHist, rWristHist) => {
        if (!pose) return false;
        
        // 1. Arm Check: Both arms extended
        const rStatic = isArmHorizontal(pose[12], pose[14], pose[16]);
        const lStatic = isArmHorizontal(pose[11], pose[13], pose[15]);

        // 2. Wave Check: Dynamic Motion
        const rWaving = detectHorizontalWave(rWristHist);
        const lWaving = detectHorizontalWave(lWristHist);
        
        // 3. Thumb Check (CRITICAL FIX):
        // Prevent "Raise Boom" (Arms Out + Thumb Up) from triggering "Emergency Stop".
        // Emergency Stop requires Neutral thumbs or Open Palms.
        const rThumbNeutral = rHand ? isThumbNeutral(rHand) : true;
        const lThumbNeutral = lHand ? isThumbNeutral(lHand) : true;

        if ((rStatic && lStatic) && (!rThumbNeutral || !lThumbNeutral)) {
             return false; // This is likely a Boom signal
        }

        return (rStatic && lStatic) || (rWaving || lWaving);
    },

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

    'DOG EVERYTHING': (pose) => {
        if (!pose) return false;
        const dist = calculateDistance(pose[15], pose[16]);
        const handsLow = pose[15].y > pose[11].y;
        return dist < 0.15 && handsLow;
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
        
        const isArmBent = (shoulder, elbow, wrist) => {
             const angle = calculateAngle(shoulder, elbow, wrist);
             return angle < 85; 
        };

        const rArmActive = isArmBent(pose[12], pose[14], pose[16]);
        const lHandTouching = calculateDistance(pose[15], pose[14]) < 0.35;
        
        const lArmActive = isArmBent(pose[11], pose[13], pose[15]);
        const rHandTouching = calculateDistance(pose[16], pose[13]) < 0.35;

        return (rArmActive && lHandTouching) || (lArmActive && rHandTouching);
    },

    'HOIST LOAD': (pose, lHand, rHand) => {
        if (!pose) return false;
        const checkSide = (hand, shoulder, elbow, wrist) => {
            if (!hand) return false;
            
            const isForearmVertical = Math.abs(wrist.x - elbow.x) < 0.2;
            const isAbove = wrist.y < elbow.y; 
            if (!isForearmVertical || !isAbove) return false;

            const indexUp = detectIndexFinger(hand) === 'UP';
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
            // Removed strict vertical check to allow for the slight angle seen in your 'Lower Load' photo
            // Just ensuring wrist is clearly below elbow is usually enough for Lower.
            const isBelow = wrist.y > elbow.y; 
            if (!isBelow) return false;

            const indexDown = detectIndexFinger(hand) === 'DOWN';
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
            if (armAngle < 120) return false; 
            
            // Check: Thumb UP and Palm NOT open (must be fist-like)
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
            if (armAngle < 120) return false; 
            
            // Check: Thumb DOWN and Palm NOT open
            return detectThumb(hand) === 'DOWN' && !isPalmOpen(hand);
        };
        return checkSide(rHand, pose[12], pose[14], pose[16]) || 
               checkSide(lHand, pose[11], pose[13], pose[15]);
    },

    'SWING BOOM': (pose, lHand, rHand) => {
        if (!pose) return false;
        const checkSide = (hand, shoulder, elbow, wrist) => {
             if (!hand) return false;
             if (!isArmHorizontal(shoulder, elbow, wrist)) return false;
             return isHandHorizontal(hand) && isPalmOpen(hand);
        };
        return checkSide(rHand, pose[12], pose[14], pose[16]) || 
               checkSide(lHand, pose[11], pose[13], pose[15]);
    },

    'BRIDGE TRAVEL': (pose, lHand, rHand) => {
        const checkSide = (hand, shoulder, elbow, wrist) => {
            if (!hand) return false;
            const isAbove = wrist.y < elbow.y;
            if (!isAbove) return false;
            
            const palmOpen = isPalmOpen(hand);
            const isVerticalHand = !isHandHorizontal(hand);

            return palmOpen && isVerticalHand;
        };

        return checkSide(rHand, pose[12], pose[14], pose[16]) || 
               checkSide(lHand, pose[11], pose[13], pose[15]);
    },

    'TROLLEY TRAVEL': (pose, lHand, rHand) => {
        const checkSide = (hand, shoulder, elbow, wrist) => {
            if (!hand) return false;

            const armAngle = calculateAngle(shoulder, elbow, wrist);
            // Strict bent arm to distinguish from "Raise Boom"
            if (armAngle > 110) return false;

            const thumbState = detectThumb(hand); 
            const thumbHoriz = detectThumbHorizontal(hand, hand === rHand); 
            const thumbActive = (thumbState === 'UP') || (thumbHoriz === 'OUT');

            return thumbActive;
        };

        return checkSide(rHand, pose[12], pose[14], pose[16]) || 
               checkSide(lHand, pose[11], pose[13], pose[15]);
    },
    
    'EXTEND BOOM': (pose, lHand, rHand) => {
         const checkSide = (hand, isRight) => {
             if(!hand) return false;
             return detectThumbHorizontal(hand, isRight) === 'OUT';
         };
         return checkSide(lHand, false) && checkSide(rHand, true);
    },

    'RETRACT BOOM': (pose, lHand, rHand) => {
         const checkSide = (hand, isRight) => {
             if(!hand) return false;
             return detectThumbHorizontal(hand, isRight) === 'IN';
         };
         return checkSide(lHand, false) && checkSide(rHand, true);
    }
};