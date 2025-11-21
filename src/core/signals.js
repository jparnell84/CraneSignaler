import { calculateAngle, detectThumb } from './geometry';

export const SIGNAL_RULES = {
    'EMERGENCY_STOP': (pose, leftHand, rightHand) => {
        // Rule: Both arms extended (>150deg) and Horizontal
        const rightArm = calculateAngle(pose[12], pose[14], pose[16]);
        const leftArm  = calculateAngle(pose[11], pose[13], pose[15]);
        
        return rightArm > 150 && leftArm > 150; 
    },
    'RAISE_BOOM': (pose, leftHand, rightHand) => {
        // Rule: One arm extended + Thumb Up
        const thumbStatus = detectThumb(leftHand || rightHand);
        return thumbStatus === 'UP';
    },
    // Add new signals here easily
    'DOG_EVERYTHING': (pose, leftHand, rightHand) => {
        // Rule: Hands clasped in front of stomach
        // Calculate distance between wrist points [15] and [16]
        // Return true if distance < 0.1
    }
};

