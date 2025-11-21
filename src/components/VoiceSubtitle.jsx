import React from 'react';

export default function VoiceSubtitle({ text }) {
  if (!text) return null;
  return (
    <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
      <span className="bg-black/60 text-white px-4 py-2 rounded-lg text-lg inline-block">{text}</span>
    </div>
  );
}
