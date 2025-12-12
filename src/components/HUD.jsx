import React from 'react';

const ProgressRing = ({ progress }) => {
    const radius = 50;
    const stroke = 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <svg height={radius * 2} width={radius * 2} className="-rotate-90">
            <circle
                className="text-slate-700"
                strokeWidth={stroke}
                stroke="currentColor"
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            <circle
                className="text-yellow-400"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
        </svg>
    );
};

const HUD = ({ mode, leftAngle, rightAngle, signal, isVoiceActive, voiceCommand, holdProgress = 0 }) => {
    const displaySignal = isVoiceActive ? voiceCommand : signal;
    const isHolding = holdProgress > 0;

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            {/* Main Signal Display */}
            <div className="relative flex items-center justify-center w-48 h-48">
                {isHolding && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <ProgressRing progress={holdProgress} />
                        <div className="absolute text-center">
                            <p className="text-lg font-bold text-yellow-400 animate-pulse">Acquiring...</p>
                        </div>
                    </div>
                )}

                {!isHolding && (
                    <div className="text-center">
                        <p className="text-sm font-mono text-slate-400">{isVoiceActive ? 'VOICE' : 'HAND'}</p>
                        <p className="text-2xl font-bold text-slate-500">
                            ---
                        </p>
                    </div>
                )}
            </div>

            {/* Angle Indicators (Optional) */}
            {mode === 'assessment' && !isVoiceActive && (
                <div className="absolute bottom-4 w-full flex justify-between px-8 text-xs font-mono text-slate-400">
                    <span>L: {leftAngle.toFixed(0)}°</span>
                    <span>R: {rightAngle.toFixed(0)}°</span>
                </div>
            )}
        </div>
    );
};

export default HUD;