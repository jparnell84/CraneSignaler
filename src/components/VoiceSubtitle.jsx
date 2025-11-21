import React, { useEffect, useState } from 'react';

const VoiceSubtitle = ({ text }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (text) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [text]);

  if (!visible || !text) return null;

  return (
    <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none z-50">
        <div className="bg-black/60 backdrop-blur px-6 py-2 rounded-full border border-white/10">
            <span className="text-white font-mono">🎤 "{text}"</span>
        </div>
    </div>
  );
};

export default VoiceSubtitle;