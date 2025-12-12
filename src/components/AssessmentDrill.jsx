import React from 'react';

const AssessmentDrill = ({ target }) => {
  // This component's only job is to display the current prompt.
  // If there's no target, it renders nothing.
  if (!target) return null;

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-700 shadow-lg text-center">
        <p className="text-lg font-semibold text-yellow-300">
            {target}
        </p>
    </div>
  );
};

export default AssessmentDrill;