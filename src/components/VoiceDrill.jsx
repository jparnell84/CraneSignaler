import React, { useState, useEffect, useRef } from 'react';

// --- CONFIGURATION ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const OBJECT_SIZE = 40;
const SPEED = 2; // pixels per frame

// --- MAPPING VOICE COMMANDS TO MOVEMENT VECTORS ---
const COMMAND_MAP = {
    'HOIST LOAD': { x: 0, y: -1 }, // UP
    'LOWER LOAD': { x: 0, y: 1 },  // DOWN
    'SWING BOOM RIGHT': { x: 1, y: 0 },
    'TROLLEY TRAVEL RIGHT': { x: 1, y: 0 },
    'SWING BOOM LEFT': { x: -1, y: 0 },
    'BRIDGE TRAVEL LEFT': { x: -1, y: 0 },
    'STOP': { x: 0, y: 0 },
    'EMERGENCY STOP': { x: 0, y: 0 },
    'DOG EVERYTHING': { x: 0, y: 0 },
};

const VoiceDrill = ({ activeCommand }) => {
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const [status, setStatus] = useState('ACTIVE'); // ACTIVE | SUCCESS | FAILED
    const requestRef = useRef();

    // --- OBSTACLES & TARGET DEFINITION ---
    const obstacles = [
        { x: 200, y: 0, width: 50, height: 300 },
        { x: 450, y: 150, width: 50, height: 300 },
    ];
    const target = { x: GAME_WIDTH - 100, y: GAME_HEIGHT - 100, width: 80, height: 80 };

    // --- GAME LOOP ---
    const gameLoop = () => {
        if (status !== 'ACTIVE') return;

        const move = COMMAND_MAP[activeCommand] || { x: 0, y: 0 };

        setPosition(prevPos => {
            const newPos = {
                x: prevPos.x + move.x * SPEED,
                y: prevPos.y + move.y * SPEED,
            };

            // Boundary checks
            if (newPos.x < 0) newPos.x = 0;
            if (newPos.y < 0) newPos.y = 0;
            if (newPos.x > GAME_WIDTH - OBJECT_SIZE) newPos.x = GAME_WIDTH - OBJECT_SIZE;
            if (newPos.y > GAME_HEIGHT - OBJECT_SIZE) newPos.y = GAME_HEIGHT - OBJECT_SIZE;

            // Collision checks
            const objectRect = { ...newPos, width: OBJECT_SIZE, height: OBJECT_SIZE };

            // Obstacle collision
            for (const obs of obstacles) {
                if (checkCollision(objectRect, obs)) {
                    setStatus('FAILED');
                    return prevPos; // Revert to old position on collision
                }
            }

            // Target collision (Success)
            if (checkCollision(objectRect, target)) {
                setStatus('SUCCESS');
            }

            return newPos;
        });

        requestRef.current = requestAnimationFrame(gameLoop);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(requestRef.current);
    }, [activeCommand, status]); // Rerun loop if command or status changes

    const checkCollision = (rect1, rect2) => {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    };

    const resetDrill = () => {
        setPosition({ x: 50, y: 50 });
        setStatus('ACTIVE');
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-30">
            {/* Orientation Labels */}
            <div className="absolute top-4 text-slate-500 font-mono text-sm">UP (Hoist)</div>
            <div className="absolute bottom-4 text-slate-500 font-mono text-sm">DOWN (Lower)</div>
            <div className="absolute left-4 text-slate-500 font-mono text-sm -rotate-90 origin-top-left top-1/2 -translate-y-1/2">LEFT (Bridge/Swing)</div>
            <div className="absolute right-4 text-slate-500 font-mono text-sm rotate-90 origin-top-right top-1/2 -translate-y-1/2">RIGHT (Trolley/Swing)</div>

            <div className="relative bg-slate-700 border-4 border-slate-500" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
                {/* Ground */}
                <div className="absolute bottom-0 left-0 w-full h-4 bg-green-800" />

                {/* Obstacles */}
                {obstacles.map((obs, i) => (
                    <div key={i} className="absolute bg-yellow-800/50 border-2 border-yellow-600" style={{ left: obs.x, top: obs.y, width: obs.width, height: obs.height }} />
                ))}

                {/* Target Zone */}
                <div className="absolute bg-blue-500/30 border-2 border-dashed border-blue-300" style={{ left: target.x, top: target.y, width: target.width, height: target.height }} />

                {/* Movable Object */}
                <div className="absolute bg-red-500 border-2 border-red-200" style={{ left: position.x, top: position.y, width: OBJECT_SIZE, height: OBJECT_SIZE }} />

                {/* Status Overlay */}
                {status !== 'ACTIVE' && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
                        <div className={`text-6xl font-black ${status === 'SUCCESS' ? 'text-green-400' : 'text-red-500'}`}>
                            {status === 'SUCCESS' ? 'DRILL COMPLETE!' : 'COLLISION!'}
                        </div>
                        <button onClick={resetDrill} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg">
                            Reset
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceDrill;
