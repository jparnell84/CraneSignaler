import React from 'react';

const AssessmentDrill = ({ mode, target, success, onStart, onNext }) => {
  if (mode !== 'assessment') return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
       <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/95 backdrop-blur text-center pointer-events-auto mx-4 border border-white/10">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Drill Command</h2>
          
          {!target ? (
             <button 
               onClick={onStart}
               className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl w-full transition-transform active:scale-95"
             >
               Start Random Drill
             </button>
          ) : (
             <div>
                <div className="text-4xl font-black text-white mb-6 animate-in fade-in zoom-in duration-300">{target}</div>
                
                {success ? (
                  <div className="text-green-500 font-bold text-xl animate-bounce">SUCCESS!</div>
                ) : (
                  <div className="text-yellow-500 font-mono animate-pulse">PERFORM SIGNAL...</div>
                )}
                
                {success && (
                  <button onClick={onNext} className="mt-6 text-sm text-blue-400 underline hover:text-blue-300">
                    Next Drill
                  </button>
                )}
             </div>
          )}
       </div>
    </div>
  );
};

export default AssessmentDrill;