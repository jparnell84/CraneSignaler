import { calculateAngle, detectThumb } from './geometry';

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

