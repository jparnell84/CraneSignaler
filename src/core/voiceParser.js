export const PARSER_CONSTANTS = {
    // We cover variations for better UX
    FUNCTIONS: ['hoist', 'lower', 'swing', 'travel', 'boom', 'bridge', 'trolley', 'extend', 'retract'],
    STOP: ['stop', 'dog', 'hold', 'halt'],
    MODIFIERS: ['slow', 'easy', 'fast', 'creep','emergency'],
};

export const parseVoiceCommand = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase();

    // 1. CRITICAL: Detect STOP first
    if (PARSER_CONSTANTS.STOP.some(word => lower.includes(word))) {
        return { type: 'STOP', original: text };
    }

    // 2. Detect DISTANCE (Integers)
    const numberMatch = lower.match(/(\d+)/);
    if (numberMatch) {
        const dist = parseInt(numberMatch[0]);
        const isSlow = PARSER_CONSTANTS.MODIFIERS.some(m => lower.includes(m));
        return { 
            type: 'DISTANCE', 
            value: dist, 
            modifier: isSlow ? 'SLOW' : 'NORMAL', 
            original: text 
        };
    }

    // 3. Detect FUNCTION
    const foundFunction = PARSER_CONSTANTS.FUNCTIONS.find(f => lower.includes(f));
    if (foundFunction) {
        // Normalize "Boom Up" vs "Raise Boom" if needed, but for now just capture the word
        return { type: 'FUNCTION', action: foundFunction.toUpperCase(), original: text };
    }

    return { type: 'UNKNOWN', original: text };
};